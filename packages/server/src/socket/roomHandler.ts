import { Server, Socket } from 'socket.io'
import {
  ClientToServerEvents,
  ServerToClientEvents,
  User,
  RoomState,
} from '@local-party/shared/src/types'
import { roomStore } from '../state/roomStore'
import { generateRoomId } from '../utils/idGenerator'

export const registerRoomHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) => {
  // --- 创建房间 ---
  socket.on('create_room', ({ roomName, username, password, videoMeta }) => {
    const roomId = generateRoomId()
    const newUser: User = {
      id: socket.id,
      username,
      roomId,
    }

    const newRoom: RoomState = {
      id: roomId,
      name: roomName,
      password, // 存明文密码(简单实现)，生产环境应Hash
      hostId: socket.id,
      users: [newUser],
      videoMeta,
      messages: [],
    }

    roomStore.createRoom(newRoom)
    socket.join(roomId)

    // 响应：加入成功
    socket.emit('room_joined', {
      roomId,
      history: [],
      users: [newUser],
    })

    console.log(`[Create] Room:${roomId} created by ${username}`)
  })

  // --- 加入房间 ---
  socket.on('join_room', ({ roomId, username, password, videoMeta }) => {
    const room = roomStore.getRoom(roomId)

    if (!room) {
      return socket.emit('error', '房间不存在')
    }

    if (room.password && room.password !== password) {
      return socket.emit('error', '密码错误')
    }

    const newUser: User = {
      id: socket.id,
      username,
      roomId,
    }

    room.users.push(newUser)
    socket.join(roomId)

    // 弱校验：视频时长
    if (Math.abs(room.videoMeta.duration - videoMeta.duration) > 5) {
      socket.emit(
        'video_warning',
        `检测到视频时长差异: 房主(${room.videoMeta.duration}s) vs 你(${videoMeta.duration}s)`
      )
    }

    // 1. 告诉自己：加入成功 (带上历史记录)
    socket.emit('room_joined', {
      roomId,
      history: room.messages,
      users: room.users,
    })

    // 2. 告诉别人：新人来了
    socket.to(roomId).emit('user_joined', newUser)

    console.log(`[Join] ${username} joined Room:${roomId}. Total: ${room.users.length}`)
  })

  // --- 视频同步指令转发 ---
  socket.on('send_sync', (action) => {
    const allRooms = roomStore.getAllRooms()
    // 找到当前用户所在的房间
    for (const [roomId, room] of Object.entries(allRooms)) {
      if (room.users.some(u => u.id === socket.id)) {
        const user = room.users.find(u => u.id === socket.id)
        // 广播给房间内除自己以外的所有人
        socket.to(roomId).emit('receive_sync', action, user?.username || '未知用户')
        
        // 更新房间最后一次状态（可选，方便新人加入时对齐）
        room.lastAction = action
        break
      }
    }
  })

  // --- 断开连接 (自动清理) ---
  socket.on('disconnect', () => {
    // 这是一个低效遍历，但由于是内存Map，且并发不高，可以接受
    // 更好的做法是在 Socket 实例上挂载 roomId
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
        break // 找到即止
      }
    }
  })
}
