import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SyncAction,
} from '@local-party/shared/src/types'
import { roomStore } from '../../state/roomStore'
import {
  MAX_MESSAGES,
  MAX_CONTENT_LEN,
  formatDuration,
} from '../../utils/socketHelpers'

export const registerSyncHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
  // --- 状态更新 ---
  socket.on('update_status', ({ duration, fileName }) => {
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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

  // --- 字幕同步 (Host Only) ---
  socket.on('sync_subtitle', data => {
    const room = roomStore.findRoomByUserSocketId(socket.id)
    if (room && room.hostId === socket.id) {
      room.subtitle = data
      io.to(room.id).emit('subtitle_synced', data)

      const user = room.users.find(u => u.id === socket.id)
      const sysMsg = {
        id: Date.now().toString(),
        type: 'system' as const,
        userId: 'system',
        username: user?.username || 'System',
        content: `房主上传了字幕: ${data.name}`,
        timestamp: Date.now(),
      }
      room.messages.push(sysMsg)
      io.to(room.id).emit('receive_message', sysMsg)
    }
  })

  // --- 视频同步指令 (仅限房主) ---
  socket.on('send_sync', (action: SyncAction) => {
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
}
