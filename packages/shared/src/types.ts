export interface User {
  id: string
  username: string
  roomId: string
}

export interface ChatMessage {
  id: string
  type: 'text' | 'system' // 普通消息 或 系统操作日志
  userId: string
  username: string
  content: string // "你好" 或 "快进了 5秒"
  timestamp: number
}

// 视频元数据 (用于校验)
export interface VideoMeta {
  duration: number // 秒
  fileSize: number // 字节
}

// 核心同步指令
export interface SyncAction {
  type: 'play' | 'pause' | 'seek'
  timestamp: number // 当前视频时间戳
  reqId?: string // 用于去重或调试
}

// Socket 服务端事件 (Server -> Client)
export interface ServerToClientEvents {
  room_joined: (data: {
    roomId: string
    history: ChatMessage[]
    users: User[]
  }) => void
  user_joined: (user: User) => void
  user_left: (userId: string) => void
  receive_message: (msg: ChatMessage) => void
  receive_sync: (action: SyncAction, user: string) => void // user是操作者的名字
  video_warning: (msg: string) => void // 视频不匹配警告
  error: (msg: string) => void
}

// Socket 客户端事件 (Client -> Server)
export interface ClientToServerEvents {
  join_room: (data: {
    roomId: string
    username: string
    password?: string
    videoMeta: VideoMeta
  }) => void
  create_room: (data: {
    roomName: string
    username: string
    password?: string
    videoMeta: VideoMeta
  }) => void
  send_message: (content: string) => void
  send_sync: (action: SyncAction) => void
}

// 房间状态（后端内存使用）
export interface RoomState {
  id: string
  name: string
  password?: string // 可选密码
  hostId: string // 房主 Socket ID
  users: User[]
  videoMeta: VideoMeta // 以房主的视频为准
  messages: ChatMessage[]
  lastAction?: SyncAction // 记录最后一次同步状态，方便新加入者同步
}
