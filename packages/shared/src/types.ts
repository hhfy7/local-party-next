export interface User {
  id: string
  username: string
  roomId: string
  videoDuration?: number // 视频时长 (秒)
  fileName?: string // 文件名
}

export interface ChatMessage {
  id: string
  type: 'text' | 'system'
  userId: string
  username: string
  content: string
  timestamp: number
}

// 视频元数据 (用于校验)
export interface VideoMeta {
  duration: number
  fileSize: number
}

// 核心同步指令
export interface SyncAction {
  type: 'play' | 'pause' | 'seek'
  timestamp: number
  reqId?: string
}

// 心跳载荷 (新增)
export interface HeartbeatPayload {
  timestamp: number
  paused: boolean
}

// Socket 服务端事件 (Server -> Client)
export interface ServerToClientEvents {
  room_joined: (data: {
    roomId: string
    hostId: string
    history: ChatMessage[]
    users: User[]
    currentStatus?: SyncAction
  }) => void
  user_joined: (user: User) => void
  user_left: (userId: string) => void
  user_updated: (user: User) => void
  host_updated: (newHostId: string) => void
  receive_message: (msg: ChatMessage) => void
  receive_sync: (action: SyncAction, user: string) => void
  receive_heartbeat: (payload: HeartbeatPayload) => void // 新增
  video_warning: (msg: string) => void
  error: (msg: string) => void
}

// Socket 客户端事件 (Client -> Server)
export interface ClientToServerEvents {
  join_room: (
    data: {
      roomId: string
      username: string
      password?: string
      videoMeta: VideoMeta
    },
    callback?: (res: {
      success: boolean
      roomId?: string
      error?: string
    }) => void,
  ) => void
  create_room: (
    data: {
      roomName: string
      username: string
      password?: string
      videoMeta: VideoMeta
    },
    callback?: (res: {
      success: boolean
      roomId?: string
      error?: string
    }) => void,
  ) => void
  send_message: (content: string) => void
  send_sync: (action: SyncAction) => void
  send_heartbeat: (payload: HeartbeatPayload) => void // 新增
  update_status: (data: { duration: number; fileName: string }) => void
}

export interface RoomState {
  id: string
  name: string
  password?: string
  hostId: string
  users: User[]
  videoMeta: VideoMeta
  messages: ChatMessage[]
  lastAction?: SyncAction
}
