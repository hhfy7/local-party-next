import { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@local-party/shared/src/types'
import { registerAuthHandlers } from './handlers/authHandler'
import { registerSyncHandlers } from './handlers/syncHandler'
import { registerP2PHandlers } from './handlers/p2pHandler'

export const registerRoomHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
) => {
  // 1. 认证与房间管理 (Create/Join/Disconnect)
  registerAuthHandlers(io, socket)

  // 2. 状态同步与聊天 (Heartbeat/Sync/Message)
  registerSyncHandlers(io, socket)

  // 3. P2P 信令转发 (WebRTC)
  registerP2PHandlers(io, socket)
}
