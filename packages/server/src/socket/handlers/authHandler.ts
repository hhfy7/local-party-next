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
