import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
  RoomState,
} from '@local-party/shared/src/types'
import { roomStore } from '../../state/roomStore'
import { generateRoomId } from '../../utils/idGenerator'
import { hostTransferTimers } from '../../state/transferState'
import { MAX_USERNAME_LEN } from '../../utils/socketHelpers'
import { generateToken, verifyToken } from '../../utils/token'

export const registerAuthHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
  // --- 创建房间 ---
  socket.on(
    'create_room',
    ({ roomName, username, password, clientId, videoMeta }, callback) => {
      console.log(
        `[Create Request] User:${username} Pass:${password} Client:${clientId}`,
      )

      // 校验密码格式：必须为4位数字（如果有设置）
      if (password && !/^\d{4}$/.test(password)) {
        if (callback) callback({ success: false, error: '密码必须是4位数字' })
        return
      }

      const safeUsername = username.substring(0, MAX_USERNAME_LEN)
      const roomId = generateRoomId()

      const newUser: User = {
        id: socket.id,
        username: safeUsername,
        clientId, // Store clientId
        roomId,
      }

      const newRoom: RoomState = {
        id: roomId,
        name: roomName.substring(0, 30),
        password,
        hostId: socket.id,
        users: [newUser],
        videoMeta,
        messages: [],
        bannedUsers: [],
        trustedClients: new Set([clientId]), // Add creator to trusted
        bannedClients: new Set(),
        createdById: clientId, // Record creator ID
      }

      roomStore.createRoom(newRoom)
      socket.join(roomId)

      socket.emit('room_joined', {
        roomId,
        hostId: newRoom.hostId,
        history: [],
        users: [newUser],
      })

      console.log(`[Create] Room:${roomId} created by ${safeUsername}`)
      if (callback) callback({ success: true, roomId })
    },
  )

  // --- 加入房间 ---
  socket.on(
    'join_room',
    ({ roomId, username, password, token, clientId, videoMeta }, callback) => {
      const room = roomStore.getRoom(roomId)

      if (!room) {
        // Use getAllRooms for debugging log only
        const availableRooms = Object.keys(roomStore.getAllRooms()).join(', ')
        console.warn(
          `[Join Failed] Room not found: "${roomId}". Available rooms: [${availableRooms}]`,
        )
        if (callback) callback({ success: false, error: '房间不存在' })
        return
      }

      // --- 顶号逻辑 (Session Replacement) ---
      // 检查房间内是否已存在相同 clientId 的用户
      const duplicateUserIndex = room.users.findIndex(
        u => u.clientId === clientId,
      )
      if (duplicateUserIndex !== -1) {
        const duplicateUser = room.users[duplicateUserIndex]
        console.log(
          `[Session Replacement] Client ${clientId} is replacing socket ${duplicateUser.id}`,
        )

        // 踢掉旧连接
        const oldSocket = io.sockets.sockets.get(duplicateUser.id)
        if (oldSocket) {
          oldSocket.emit('kicked', '您已在其他标签页或设备登录')
          oldSocket.disconnect(true)
        }

        // 从房间移除旧用户 (稍后会作为新用户加入)
        room.users.splice(duplicateUserIndex, 1)
        io.to(roomId).emit('user_left', duplicateUser.id)
      }

      // --- 黑名单检查 (Ban Check) ---
      // 1. Check Client ID (Strong Ban)
      if (room.bannedClients && room.bannedClients.has(clientId)) {
        if (callback)
          callback({ success: false, error: '您已被禁止进入此房间' })
        return
      }

      const clientIp =
        socket.handshake.address || socket.handshake.headers['x-forwarded-for']
      const now = Date.now()
      const BAN_DURATION = 5 * 60 * 1000 // 5分钟

      // 2. 惰性清理过期黑名单 (IP/Name)
      if (room.bannedUsers) {
        room.bannedUsers = room.bannedUsers.filter(
          ban => now - ban.bannedAt < BAN_DURATION,
        )

        // 3. 检查当前用户是否在黑名单中 (IP 或 用户名匹配)
        const isBanned = room.bannedUsers.some(
          ban =>
            (clientIp && ban.ip === clientIp) ||
            ban.username === username ||
            (ban.clientId && ban.clientId === clientId),
        )

        if (isBanned) {
          const banRecord = room.bannedUsers.find(
            ban =>
              (clientIp && ban.ip === clientIp) ||
              ban.username === username ||
              (ban.clientId && ban.clientId === clientId),
          )
          if (banRecord) {
            const remainingTime = Math.ceil(
              (BAN_DURATION - (now - banRecord.bannedAt)) / 1000 / 60,
            )
            if (callback)
              callback({
                success: false,
                error: `您已被移出房间，请等待 ${remainingTime} 分钟后重试`,
              })
            return
          }
        }
      }

      // 限制房间人数最多为 2 人 (顶号逻辑已处理重复，这里只校验剩余名额)
      if (room.users.length >= 2) {
        if (callback) callback({ success: false, error: '房间已满 (上限2人)' })
        return
      }

      roomStore.cancelCleanup(roomId)

      // --- 密码/Token/白名单 验证 ---
      let isVerified = false

      // 1. 白名单免密 (Trusted Client)
      if (room.trustedClients && room.trustedClients.has(clientId)) {
        isVerified = true
      }
      // 2. Token 验证
      else if (token && verifyToken(token, roomId)) {
        isVerified = true
        // 验证通过，加入白名单
        if (!room.trustedClients) room.trustedClients = new Set()
        room.trustedClients.add(clientId)
      }
      // 3. 密码验证
      else {
        // 如果房间没有设置密码，或者密码匹配
        if (!room.password || room.password === password) {
          isVerified = true
          // 验证通过，加入白名单
          if (!room.trustedClients) room.trustedClients = new Set()
          room.trustedClients.add(clientId)
        }
      }

      if (!isVerified) {
        if (callback)
          callback({ success: false, error: '密码错误或链接已失效' })
        return
      }

      // --- 房主重连检测 (Host Reconnect) ---
      const pendingProtection = hostTransferTimers.get(roomId)
      const safeUsername = username.substring(0, MAX_USERNAME_LEN)

      let shouldRecoverHost = false

      // 场景 A: 房主掉线保护期内重连 (优先使用 ClientID 匹配)
      if (pendingProtection) {
        // 如果 ClientID 匹配（最安全）
        if (
          pendingProtection.expectedHostClientId &&
          pendingProtection.expectedHostClientId === clientId
        ) {
          shouldRecoverHost = true
        }
        // 回退兼容：如果没有记录 ClientID (旧数据)，则匹配用户名
        else if (
          !pendingProtection.expectedHostClientId &&
          pendingProtection.expectedHostName === safeUsername
        ) {
          shouldRecoverHost = true
        }
      }

      // 场景 B: 房间无主，且我是创建者 (兜底策略)
      if (
        !shouldRecoverHost &&
        room.createdById === clientId && // 我是创建者
        !room.users.some(u => u.id === room.hostId) // 且房主不在房间内
      ) {
        shouldRecoverHost = true
        // 如果有保护倒计时，也清理掉
        if (hostTransferTimers.has(roomId)) {
          clearTimeout(hostTransferTimers.get(roomId)!.timer)
          hostTransferTimers.delete(roomId)
        }
      }

      if (shouldRecoverHost) {
        console.log(
          `[Host Reconnect] 房主 ${safeUsername} 归位 (ID: ${clientId})`,
        )
        if (pendingProtection) {
          clearTimeout(pendingProtection.timer)
          hostTransferTimers.delete(roomId)
        }

        // 恢复房主身份
        room.hostId = socket.id
        io.to(roomId).emit('host_updated', socket.id) // 通知其他人
      }

      const newUser: User = {
        id: socket.id,
        username: safeUsername,
        clientId,
        roomId,
      }

      if (
        room.videoMeta &&
        videoMeta &&
        Math.abs(room.videoMeta.duration - videoMeta.duration) > 5
      ) {
        socket.emit(
          'video_warning',
          `检测到视频时长差异: 房主(${room.videoMeta.duration}s) vs 你(${videoMeta.duration}s)`,
        )
      }

      room.users.push(newUser)
      socket.join(roomId)

      socket.emit('room_joined', {
        roomId,
        hostId: room.hostId,
        history: room.messages,
        users: room.users,
        currentStatus: room.lastAction,
      })

      // 如果房间已有字幕，同步给新用户
      if (room.subtitle) {
        socket.emit('subtitle_synced', room.subtitle)
      }

      socket.to(roomId).emit('user_joined', newUser)

      console.log(
        `[Join] ${safeUsername} joined Room:${roomId}. Total: ${room.users.length}`,
      )
      if (callback) callback({ success: true, roomId })
    },
  )

  // --- 生成邀请 Token ---
  socket.on('generate_invite_token', ({ roomId }, callback) => {
    // 只有房内的用户可以生成 Token
    const room = roomStore.getRoom(roomId)
    if (!room || !room.users.some(u => u.id === socket.id)) {
      if (callback) callback({ success: false, error: '无权操作' })
      return
    }

    const token = generateToken(roomId)
    if (callback) callback({ success: true, token })
  })

  // --- 踢人 (Kick User) ---
  socket.on('kick_user', ({ targetUserId }, callback) => {
    const room = roomStore.findRoomByUserSocketId(socket.id)

    // 1. 验证房间存在
    if (!room) {
      if (callback) callback({ success: false, error: '房间不存在' })
      return
    }

    // 2. 验证是否为房主
    if (room.hostId !== socket.id) {
      if (callback)
        callback({ success: false, error: '权限不足：只有房主可以踢人' })
      return
    }

    // 3. 验证目标用户是否存在且不是自己
    const targetUser = room.users.find(u => u.id === targetUserId)
    if (!targetUser) {
      if (callback) callback({ success: false, error: '目标用户不存在' })
      return
    }
    if (targetUserId === socket.id) {
      if (callback) callback({ success: false, error: '不能踢自己' })
      return
    }

    // 4. 执行踢人逻辑
    const targetSocket = io.sockets.sockets.get(targetUserId)
    if (targetSocket) {
      // 获取用户 IP
      const targetIp =
        targetSocket.handshake.address ||
        targetSocket.handshake.headers['x-forwarded-for']

      // 加入 IP 黑名单 (Legacy)
      if (!room.bannedUsers) {
        room.bannedUsers = []
      }
      room.bannedUsers.push({
        ip: Array.isArray(targetIp) ? targetIp[0] : targetIp || '',
        username: targetUser.username,
        clientId: targetUser.clientId, // Store ID
        bannedAt: Date.now(),
      })

      // 加入 Client ID 黑名单 (Strong Ban)
      if (!room.bannedClients) room.bannedClients = new Set()
      if (targetUser.clientId) {
        room.bannedClients.add(targetUser.clientId)
        // 同时也从白名单移除
        if (room.trustedClients) room.trustedClients.delete(targetUser.clientId)
      }

      // 通知被踢用户
      targetSocket.emit('kicked', '您已被房主移出房间')
      // 强制断开连接
      targetSocket.disconnect(true)

      // 查找并断开该 ClientID 下的所有连接 (防止多标签页苟活)
      if (targetUser.clientId) {
        for (const user of room.users) {
          if (
            user.clientId === targetUser.clientId &&
            user.id !== targetUserId
          ) {
            const otherSocket = io.sockets.sockets.get(user.id)
            if (otherSocket) {
              otherSocket.emit('kicked', '您已被房主移出房间')
              otherSocket.disconnect(true)
            }
          }
        }
        // 清理 users 列表 (虽然 disconnect 会触发 user_left，但主动清理更保险)
        room.users = room.users.filter(u => u.clientId !== targetUser.clientId)
      }
    }

    console.log(
      `[Kick] ${room.users.find(u => u.id === socket.id)?.username} kicked ${targetUser.username} from Room:${room.id}`,
    )

    if (callback) callback({ success: true })
  })

  // --- 断开连接 ---
  socket.on('disconnect', () => {
    const room = roomStore.findRoomByUserSocketId(socket.id)
    if (room) {
      const userIndex = room.users.findIndex(u => u.id === socket.id)
      if (userIndex === -1) return

      const username = room.users[userIndex].username
      const clientId = room.users[userIndex].clientId // Get clientId
      const isHost = room.hostId === socket.id

      room.users.splice(userIndex, 1)
      io.to(room.id).emit('user_left', socket.id)
      console.log(`[Left] ${username} left Room:${room.id}`)

      if (isHost) {
        // 房主离开：启动保护机制
        console.log(`[Host Left] 房主 ${username} 离开，启动 5秒 保护倒计时...`)

        const timer = setTimeout(() => {
          // 再次检查房间状态（防止闭包引用过期，重新获取）
          const currentRoom = roomStore.getRoom(room.id)
          if (!currentRoom) return

          // 确认保护期已过且房主确实不在
          if (hostTransferTimers.has(room.id)) {
            hostTransferTimers.delete(room.id)

            // 再次检查是否真的没房主了 (防止快速重连已经恢复了)
            if (
              currentRoom.hostId !== socket.id &&
              currentRoom.users.some(u => u.id === currentRoom.hostId)
            ) {
              return // Host already recovered or transferred
            }

            if (currentRoom.users.length > 0) {
              const newHost = currentRoom.users[0]
              currentRoom.hostId = newHost.id
              io.to(currentRoom.id).emit('host_updated', newHost.id)

              const sysMsg = {
                id: Date.now().toString(),
                type: 'system' as const,
                userId: 'system',
                username: 'System',
                content: `房主已移交给 ${newHost.username}`,
                timestamp: Date.now(),
              }
              io.to(currentRoom.id).emit('receive_message', sysMsg)
              console.log(
                `[Host Transfer] Timeout reached. New host: ${newHost.username}`,
              )
            } else {
              // 房间空了，清理
              roomStore.scheduleCleanup(currentRoom.id)
              console.log(
                `[Grace] Room:${currentRoom.id} is empty. Cleanup scheduled.`,
              )
            }
          }
        }, 5000)

        hostTransferTimers.set(room.id, {
          timer,
          expectedHostName: username,
          expectedHostClientId: clientId, // Store ClientID for safe recovery
        })
      } else {
        // 非房主离开：常规处理
        if (room.users.length === 0) {
          roomStore.scheduleCleanup(room.id)
          console.log(
            `[Grace] Room:${room.id} is now empty. Grace period started.`,
          )
        }
      }
    }
  })
}
