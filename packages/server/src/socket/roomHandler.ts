import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
  RoomState,
  SyncAction,
  FileTransferMetadata,
  RTCIceCandidateInit,
} from '@local-party/shared/src/types'
import { roomStore } from '../state/roomStore'
import { generateRoomId } from '../utils/idGenerator'

// 常量定义
const MAX_MESSAGES = 100 // 房间最大保留消息数
const MAX_USERNAME_LEN = 12 // 昵称最大长度
const MAX_CONTENT_LEN = 200 // 聊天内容最大长度

// Helper: 格式化秒数为 HH:mm:ss 或 mm:ss
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// 活跃的传输会话 (State)
const hostTransferTimers = new Map<
  string,
  {
    timer: NodeJS.Timeout
    expectedHostName: string
  }
>() // 房间ID -> {定时器, 原房主名}

const activeTransfers = new Map<
  string,
  {
    fromUser: User
    toUsers: User[]
  }
>()

export const registerRoomHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
  const findRoomBySocketId = (socketId: string) => {
    for (const room of Object.values(roomStore.getAllRooms())) {
      if (room.users.some(u => u.id === socketId)) {
        return room
      }
    }
    return null
  }

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
        console.warn(
          `[Join Failed] Room not found: "${roomId}". Available rooms: [${Object.keys(
            roomStore.getAllRooms(),
          ).join(', ')}]`,
        )
        if (callback) callback({ success: false, error: '房间不存在' })
        return
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

  // --- 状态更新 ---
  socket.on('update_status', ({ duration, fileName }) => {
    const room = findRoomBySocketId(socket.id)
    if (room) {
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        user.videoDuration = duration
        user.fileName = fileName.substring(0, 50)
        io.to(room.id).emit('user_updated', user)
      }
    }
  })

  // --- 心跳同步 (Host Only) ---
  socket.on('send_heartbeat', payload => {
    const room = findRoomBySocketId(socket.id)
    if (room && room.hostId === socket.id) {
      if (room.lastAction) {
        room.lastAction.timestamp = payload.timestamp
        room.lastAction.type = payload.paused ? 'pause' : 'play'
      } else {
        room.lastAction = {
          type: payload.paused ? 'pause' : 'play',
          timestamp: payload.timestamp,
        }
      }
      socket.to(room.id).emit('receive_heartbeat', payload)
    }
  })

  // --- 视频同步指令 (仅限房主) ---
  socket.on('send_sync', (action: SyncAction) => {
    const room = findRoomBySocketId(socket.id)
    if (room && room.hostId === socket.id) {
      const user = room.users.find(u => u.id === socket.id)
      socket.to(room.id).emit('receive_sync', action, user?.username || '未知')

      const actionText =
        action.type === 'play'
          ? '开始了播放'
          : action.type === 'pause'
            ? '暂停了视频'
            : action.type === 'seek'
              ? `跳转到了 ${formatDuration(action.timestamp)}`
              : '操作了视频'

      const sysMsg = {
        id: Date.now().toString(),
        type: 'system' as const,
        userId: 'system',
        username: user?.username || '未知',
        content: actionText,
        timestamp: Date.now(),
      }

      room.messages.push(sysMsg)
      if (room.messages.length > MAX_MESSAGES) room.messages.shift()

      io.to(room.id).emit('receive_message', sysMsg)
      room.lastAction = action
    } else if (room) {
      socket.emit('error', '只有房主可以控制视频进度')
    }
  })

  // --- 聊天消息 ---
  socket.on('send_message', content => {
    if (!content.trim()) return
    const room = findRoomBySocketId(socket.id)
    if (room) {
      const user = room.users.find(u => u.id === socket.id)
      const msg = {
        id: Date.now().toString(),
        type: 'text' as const,
        userId: socket.id,
        username: user?.username || 'Unknown',
        content: content.substring(0, MAX_CONTENT_LEN),
        timestamp: Date.now(),
      }

      room.messages.push(msg)
      if (room.messages.length > MAX_MESSAGES) room.messages.shift()

      io.to(room.id).emit('receive_message', msg)
    }
  })

  // --- 断开连接 ---
  socket.on('disconnect', () => {
    const room = findRoomBySocketId(socket.id)
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

  // --- P2P 视频分享信令 ---

  // 1. 房主发送传输请求 (增加 fileInfo 参数)
  socket.on('send_transfer_offer', (transferId, offer, fileInfo) => {
    const room = findRoomBySocketId(socket.id)
    if (!room || room.hostId !== socket.id) return

    const hostUser = room.users.find(u => u.id === socket.id)
    if (!hostUser) return

    const targetUsers = room.users.filter(u => u.id !== socket.id)
    if (targetUsers.length === 0) return

    // 优先使用前端传来的 fileInfo，如果没有则回退到旧逻辑
    const fileMeta: FileTransferMetadata = {
      fileName: fileInfo?.fileName || hostUser.fileName || 'Unknown Video',
      fileSize: fileInfo?.fileSize || 0,
      fileType: fileInfo?.fileType || 'video/*',
      senderId: socket.id,
      senderName: hostUser.username,
      transferId: transferId,
      roomId: room.id,
    }

    activeTransfers.set(transferId, {
      fromUser: hostUser,
      toUsers: targetUsers,
    })

    // 广播给所有其他成员
    socket.to(room.id).emit('receive_transfer_offer', {
      fromUser: hostUser,
      fileMeta,
      offer, // 这里我们转发原始 offer
    })

    console.log(
      `[Transfer] Offer sent from ${hostUser.username} in room ${room.id} for transfer ${transferId} (Size: ${fileMeta.fileSize})`,
    )

    // 广播系统消息
    const sysMsg = {
      id: `sys_${Date.now()}`,
      userId: 'system',
      username: 'System',
      content: `房主 ${hostUser.username} 发起了视频分享: ${fileMeta.fileName}`,
      timestamp: Date.now(),
      type: 'system' as const,
    }

    // 存入历史消息
    room.messages.push(sysMsg)
    if (room.messages.length > MAX_MESSAGES) room.messages.shift()

    // 发送给所有人（包括房主自己）
    io.to(room.id).emit('receive_message', sysMsg)
  })

  // 2. 成员接受传输
  socket.on('accept_transfer', (transferId, answer) => {
    const room = findRoomBySocketId(socket.id)
    if (room) {
      // 直接转发给房主
      io.to(room.hostId).emit('transfer_accepted', transferId, answer)
      console.log(
        `[Transfer] Answer from ${socket.id} forwarded to host ${room.hostId} for transfer ${transferId}`,
      )

      // 广播接受消息
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        const sysMsg = {
          id: `sys_${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `${user.username} 接受了视频分享`,
          timestamp: Date.now(),
          type: 'system' as const,
        }
        room.messages.push(sysMsg)
        if (room.messages.length > MAX_MESSAGES) room.messages.shift()
        io.to(room.id).emit('receive_message', sysMsg)
      }
    }
  })

  // 3. ICE candidate 转发
  socket.on(
    'send_ice_candidate',
    (candidate: RTCIceCandidateInit, transferId: string) => {
      const room = findRoomBySocketId(socket.id)
      if (room) {
        // 简单粗暴：直接广播给房间里的其他人
        socket.to(room.id).emit('ice_candidate', candidate, transferId)
      }
    },
  )

  // 4. 传输完成/失败/取消等事件的清理
  const cleanupTransfer = (transferId: string) => {
    if (activeTransfers.has(transferId)) {
      activeTransfers.delete(transferId)
      console.log(`[Transfer] Cleaned up transfer session ${transferId}`)
    }
  }

  socket.on('transfer_completed', transferId => {
    const room = findRoomBySocketId(socket.id)
    if (room) {
      // 广播完成消息
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        const sysMsg = {
          id: `sys_${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `视频传输完成`,
          timestamp: Date.now(),
          type: 'system' as const,
        }
        room.messages.push(sysMsg)
        if (room.messages.length > MAX_MESSAGES) room.messages.shift()
        io.to(room.id).emit('receive_message', sysMsg)
      }
    }
    cleanupTransfer(transferId)
  })

  socket.on('transfer_failed', (transferId, reason) => {
    const room = findRoomBySocketId(socket.id)
    if (room) {
      // 广播失败消息
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        const sysMsg = {
          id: `sys_${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `传输失败: ${reason}`,
          timestamp: Date.now(),
          type: 'system' as const,
        }
        room.messages.push(sysMsg)
        if (room.messages.length > MAX_MESSAGES) room.messages.shift()
        io.to(room.id).emit('receive_message', sysMsg)
      }
    }
    cleanupTransfer(transferId)
  })

  socket.on('cancel_transfer_offer', transferId => {
    const room = findRoomBySocketId(socket.id)
    if (room) {
      socket.to(room.id).emit('transfer_offer_cancelled', transferId)

      // 广播取消消息
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        const sysMsg = {
          id: `sys_${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `${user.username} 取消了视频分享`,
          timestamp: Date.now(),
          type: 'system' as const,
        }
        room.messages.push(sysMsg)
        if (room.messages.length > MAX_MESSAGES) room.messages.shift()
        io.to(room.id).emit('receive_message', sysMsg)
      }

      cleanupTransfer(transferId)
    }
  })
  socket.on('reject_transfer', transferId => {
    const room = findRoomBySocketId(socket.id)
    if (room) {
      io.to(room.hostId).emit('transfer_rejected', transferId)
      // Note: We don't cleanup here, host might retry with another peer.

      // 广播拒绝消息
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        const sysMsg = {
          id: `sys_${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `${user.username} 拒绝了视频分享`,
          timestamp: Date.now(),
          type: 'system' as const,
        }
        room.messages.push(sysMsg)
        if (room.messages.length > MAX_MESSAGES) room.messages.shift()
        io.to(room.id).emit('receive_message', sysMsg)
      }
    }
  })
}
