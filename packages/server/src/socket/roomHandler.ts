import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
  RoomState,
  SyncAction
} from '@local-party/shared/src/types'
import { roomStore } from '../state/roomStore'
import { generateRoomId } from '../utils/idGenerator'

export const registerRoomHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  // --- 创建房间 ---
  socket.on('create_room', ({ roomName, username, password, videoMeta }, callback) => {
    const roomId = generateRoomId()
    const newUser: User = {
      id: socket.id,
      username,
      roomId,
    }

    const newRoom: RoomState = {
      id: roomId,
      name: roomName,
      password,
      hostId: socket.id,
      users: [newUser],
      videoMeta,
      messages: [],
    }

    roomStore.createRoom(newRoom)
    socket.join(roomId)

    // 广播给房间内的自己
    socket.emit('room_joined', {
      roomId,
      history: [],
      users: [newUser],
    })

    console.log(`[Create] Room:${roomId} created by ${username}`)

    // 返回成功回调
    if (callback) callback({ success: true, roomId })
  })

  // --- 加入房间 ---
  socket.on('join_room', ({ roomId, username, password, videoMeta }, callback) => {
    const room = roomStore.getRoom(roomId)

    if (!room) {
      if (callback) callback({ success: false, error: '房间不存在' })
      return socket.emit('error', '房间不存在')
    }

    if (room.password && room.password !== password) {
       if (callback) callback({ success: false, error: '密码错误' })
       return socket.emit('error', '密码错误')
    }

    const newUser: User = {
      id: socket.id,
      username,
      roomId,
    }

    room.users.push(newUser)
    socket.join(roomId)

    // 弱校验：视频时长 (恢复这个逻辑)
    if (Math.abs(room.videoMeta.duration - videoMeta.duration) > 5) {
      socket.emit(
        'video_warning',
        `检测到视频时长差异: 房主(${room.videoMeta.duration}s) vs 你(${videoMeta.duration}s)`
      )
    }

    // 1. 告诉自己
    socket.emit('room_joined', {
      roomId,
      history: room.messages,
      users: room.users,
    })

    // 2. 告诉别人
    socket.to(roomId).emit('user_joined', newUser)

    console.log(`[Join] ${username} joined Room:${roomId}. Total: ${room.users.length}`)

    // 返回成功回调
    if (callback) callback({ success: true, roomId })
  })

  // --- 视频同步指令转发 ---
  socket.on('send_sync', (action: SyncAction) => {
    const allRooms = roomStore.getAllRooms()
    // 找到当前用户所在的房间
    for (const [roomId, room] of Object.entries(allRooms)) {
      if (room.users.some(u => u.id === socket.id)) {
        const user = room.users.find(u => u.id === socket.id)

        // 广播给房间内除自己以外的所有人
        socket.to(roomId).emit('receive_sync', action, user?.username || '未知用户')

        // 发送系统消息
        const actionText =
          action.type === 'play' ? '开始了播放' :
          action.type === 'pause' ? '暂停了视频' :
          action.type === 'seek' ? `跳转到了 ${Math.floor(action.timestamp)}秒` : '操作了视频'

        const sysMsg = {
          id: Date.now().toString(),
          type: 'system' as const,
          userId: 'system',
          username: 'System',
          content: `${user?.username || '有人'} ${actionText}`,
          timestamp: Date.now()
        }
        io.to(roomId).emit('receive_message', sysMsg) // 广播给所有人

        console.log(`[Sync] ${user?.username}(${roomId}) -> ${action.type} @ ${action.timestamp.toFixed(1)}s`)

        // 更新房间最后一次状态
        room.lastAction = action
        break
      }
    }
  })

  // --- 聊天消息转发 ---
  socket.on('send_message', (content) => {
    const allRooms = roomStore.getAllRooms()
    for (const [roomId, room] of Object.entries(allRooms)) {
      if (room.users.some(u => u.id === socket.id)) {
        const user = room.users.find(u => u.id === socket.id)

        const msg = {
          id: Date.now().toString(),
          type: 'text' as const,
          userId: socket.id,
          username: user?.username || 'Unknown',
          content,
          timestamp: Date.now()
        }

        room.messages.push(msg)
        io.to(roomId).emit('receive_message', msg)
        break
      }
    }
  })

  // --- 断开连接 (自动清理) ---
  socket.on('disconnect', () => {
    const allRooms = roomStore.getAllRooms()

    for (const [roomId, room] of Object.entries(allRooms)) {
      const userIndex = room.users.findIndex(u => u.id === socket.id)
      if (userIndex !== -1) {
        const user = room.users[userIndex]
        room.users.splice(userIndex, 1) // 移除用户

        // 通知其他人
        io.to(roomId).emit('user_left', socket.id)
        console.log(`[Left] ${user.username} left Room:${roomId}`)

        // 房间销毁逻辑
        if (room.users.length === 0) {
          roomStore.deleteRoom(roomId)
          console.log(`[Destroy] Room:${roomId} is empty and deleted.`)
        }
        break
      }
    }
  })
}
