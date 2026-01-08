import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
  RoomState,
  SyncAction,
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

export const registerRoomHandlers = (
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
        hostId: newRoom.hostId, // Sync hostId
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

      // 如果房间正在“缓刑期”，取消清理计时器
      roomStore.cancelCleanup(roomId)

      if (room.password && room.password !== password) {
        if (callback) callback({ success: false, error: '密码错误' })
        return
      }

      const safeUsername = username.substring(0, MAX_USERNAME_LEN)
      const newUser: User = {
        id: socket.id,
        username: safeUsername,
        roomId,
      }

      // 弱校验：视频时长
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

      // 1. 告诉自己
      socket.emit('room_joined', {
        roomId,
        hostId: room.hostId, // Sync hostId
        history: room.messages,
        users: room.users,
        currentStatus: room.lastAction,
      })

      // 2. 告诉别人
      socket.to(roomId).emit('user_joined', newUser)

      console.log(
        `[Join] ${safeUsername} joined Room:${roomId}. Total: ${room.users.length}`,
      )
      if (callback) callback({ success: true, roomId })
    },
  )

  // --- 状态更新 ---
  socket.on('update_status', ({ duration, fileName }) => {
    const allRooms = roomStore.getAllRooms()
    for (const [roomId, room] of Object.entries(allRooms)) {
      const user = room.users.find(u => u.id === socket.id)
      if (user) {
        user.videoDuration = duration
        user.fileName = fileName.substring(0, 50)
        io.to(roomId).emit('user_updated', user)
        break
      }
    }
  })

  // --- 心跳同步 (Host Only) ---
  socket.on('send_heartbeat', payload => {
    const allRooms = roomStore.getAllRooms()
    for (const [roomId, room] of Object.entries(allRooms)) {
      if (room.hostId === socket.id) {
        // 更新服务端的 lastAction，确保新加入的人拿到的是最新的
        if (room.lastAction) {
          room.lastAction.timestamp = payload.timestamp
          room.lastAction.type = payload.paused ? 'pause' : 'play'
        } else {
          // 如果之前没有任何动作，初始化一个
          room.lastAction = {
            type: payload.paused ? 'pause' : 'play',
            timestamp: payload.timestamp,
          }
        }

        // 广播给房间里其他人
        socket.to(roomId).emit('receive_heartbeat', payload)
        break
      }
    }
  })

  // --- 视频同步指令 (仅限房主) ---
  socket.on('send_sync', (action: SyncAction) => {
    const allRooms = roomStore.getAllRooms()
    for (const [roomId, room] of Object.entries(allRooms)) {
      if (room.users.some(u => u.id === socket.id)) {
        // [权限校验]
        if (room.hostId !== socket.id) {
          console.warn(`[Sync Denied] User ${socket.id} is not host.`)
          socket.emit('error', '只有房主可以控制视频进度')
          return
        }

        const user = room.users.find(u => u.id === socket.id)
        socket.to(roomId).emit('receive_sync', action, user?.username || '未知')

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
        if (room.messages.length > MAX_MESSAGES) {
          room.messages.shift()
        }

        io.to(roomId).emit('receive_message', sysMsg)
        room.lastAction = action
        break
      }
    }
  })

  // --- 聊天消息 ---
  socket.on('send_message', content => {
    if (!content.trim()) return

    const allRooms = roomStore.getAllRooms()
    for (const [roomId, room] of Object.entries(allRooms)) {
      if (room.users.some(u => u.id === socket.id)) {
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
        if (room.messages.length > MAX_MESSAGES) {
          room.messages.shift()
        }

        io.to(roomId).emit('receive_message', msg)
        break
      }
    }
  })

  // --- 断开连接 ---
  socket.on('disconnect', () => {
    const allRooms = roomStore.getAllRooms()
    for (const [roomId, room] of Object.entries(allRooms)) {
      const userIndex = room.users.findIndex(u => u.id === socket.id)
      if (userIndex !== -1) {
        const username = room.users[userIndex].username
        const isHost = room.hostId === socket.id // 检查是否是房主

        room.users.splice(userIndex, 1)
        io.to(roomId).emit('user_left', socket.id)

        console.log(`[Left] ${username} left Room:${roomId}`)

        // [房主移交逻辑]
        if (isHost && room.users.length > 0) {
          const newHost = room.users[0]
          room.hostId = newHost.id
          io.to(roomId).emit('host_updated', newHost.id)

          // 发个系统消息通知大家
          const sysMsg = {
            id: Date.now().toString(),
            type: 'system' as const,
            userId: 'system',
            username: 'System',
            content: `房主已移交给 ${newHost.username}`,
            timestamp: Date.now(),
          }
          io.to(roomId).emit('receive_message', sysMsg)
          console.log(`[Host Transfer] New host: ${newHost.username}`)
        }

        if (room.users.length === 0) {
          // 不再立即删除，进入 5 分钟缓刑期
          roomStore.scheduleCleanup(roomId)
          console.log(
            `[Grace] Room:${roomId} is now empty. Grace period started.`,
          )
        }
        break
      }
    }
  })
}
