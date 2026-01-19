import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  FileTransferMetadata,
  RTCIceCandidateInit,
} from '@local-party/shared/src/types'
import { roomStore } from '../../state/roomStore'
import { activeTransfers } from '../../state/transferState'
import { MAX_MESSAGES } from '../../utils/socketHelpers'

export const registerP2PHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
  // 1. 房主发送传输请求 (增加 fileInfo 参数)
  socket.on('send_transfer_offer', (transferId, offer, fileInfo) => {
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
      const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
    const room = roomStore.findRoomByUserSocketId(socket.id)
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
