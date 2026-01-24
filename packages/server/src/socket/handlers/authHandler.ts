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

export const registerAuthHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
  // --- 创建房间 ---
  socket.on(
    'create_room',
    ({ roomName, username, password, videoMeta }, callback) => {
      const safeUsername = username.substring(0, MAX_USERNAME_LEN)
      const roomId = generateRoomId()

      const newUser: User = {
        id: socket.id,
        username: safeUsername,
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
    ({ roomId, username, password, videoMeta }, callback) => {
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

      // --- 黑名单检查 (Ban Check) ---
      const clientIp =
        socket.handshake.address || socket.handshake.headers['x-forwarded-for']
      const now = Date.now()
      const BAN_DURATION = 5 * 60 * 1000 // 5分钟

      // 1. 惰性清理过期黑名单
      if (room.bannedUsers) {
        room.bannedUsers = room.bannedUsers.filter(
          ban => now - ban.bannedAt < BAN_DURATION,
        )

        // 2. 检查当前用户是否在黑名单中 (IP 或 用户名匹配)
        // 注意：本地开发环境 IP 可能是 ::1 或 127.0.0.1，可能不准确，所以结合用户名辅助判断
        const isBanned = room.bannedUsers.some(
          ban => (clientIp && ban.ip === clientIp) || ban.username === username,
        )

        if (isBanned) {
          const banRecord = room.bannedUsers.find(
            ban =>
              (clientIp && ban.ip === clientIp) || ban.username === username,
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

      // 限制房间人数最多为 2 人
      if (room.users.length >= 2) {
        if (callback) callback({ success: false, error: '房间已满 (上限2人)' })
        return
      }

      roomStore.cancelCleanup(roomId)

      if (room.password && room.password !== password) {
        if (callback) callback({ success: false, error: '密码错误' })
        return
      }

      // --- 房主重连检测 ---
      const pendingProtection = hostTransferTimers.get(roomId)
      const safeUsername = username.substring(0, MAX_USERNAME_LEN)

      if (
        pendingProtection &&
        pendingProtection.expectedHostName === safeUsername
      ) {
        console.log(`[Host Reconnect] 房主 ${safeUsername} 重新连接，取消移交`)
        clearTimeout(pendingProtection.timer)
        hostTransferTimers.delete(roomId)

        // 恢复房主身份
        room.hostId = socket.id
        io.to(roomId).emit('host_updated', socket.id) // 通知其他人（如果有）
      }

      const newUser: User = {
        id: socket.id,
        username: safeUsername,
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

      socket.to(roomId).emit('user_joined', newUser)

      console.log(
        `[Join] ${safeUsername} joined Room:${roomId}. Total: ${room.users.length}`,
      )
      if (callback) callback({ success: true, roomId })
    },
  )

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

      // 加入黑名单
      if (!room.bannedUsers) {
        room.bannedUsers = []
      }
      room.bannedUsers.push({
        ip: Array.isArray(targetIp) ? targetIp[0] : targetIp || '',
        username: targetUser.username,
        bannedAt: Date.now(),
      })

      // 通知被踢用户
      targetSocket.emit('kicked', '您已被房主移出房间')
      // 强制断开连接
      targetSocket.disconnect(true)
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
