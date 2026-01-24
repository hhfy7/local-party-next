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
  subtitle_synced: (data: {
    content: string
    name: string
    type: 'vtt' | 'srt'
  }) => void
  video_warning: (msg: string) => void
  kicked: (reason: string) => void
  error: (msg: string) => void

  // P2P视频分享
  receive_transfer_offer: (data: {
    fromUser: User
    fileMeta: FileTransferMetadata
    offer: RTCSessionDescriptionInit // Added offer
  }) => void
  transfer_offer_cancelled: (transferId: string) => void
  transfer_accepted: (
    transferId: string,
    answer: RTCSessionDescriptionInit,
  ) => void
  transfer_rejected: (transferId: string) => void
  ice_candidate: (candidate: RTCIceCandidateInit, transferId: string) => void
  transfer_progress: (progress: FileTransferProgress) => void
  transfer_completed: (transferId: string) => void
  transfer_failed: (transferId: string, reason: string) => void
}

// Socket 客户端事件 (Client -> Server)
export interface ClientToServerEvents {
  join_room: (
    data: {
      roomId: string
      username: string
      password?: string
      token?: string
      videoMeta: VideoMeta
    },
    callback?: (res: {
      success: boolean
      roomId?: string
      error?: string
    }) => void,
  ) => void
  generate_invite_token: (
    data: { roomId: string },
    callback?: (res: {
      success: boolean
      token?: string
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
  sync_subtitle: (data: {
    content: string
    name: string
    type: 'vtt' | 'srt'
  }) => void
  update_status: (data: { duration: number; fileName: string }) => void
  kick_user: (
    data: { targetUserId: string },
    callback?: (res: { success: boolean; error?: string }) => void,
  ) => void

  // P2P视频分享
  send_transfer_offer: (
    transferId: string,
    offer: RTCSessionDescriptionInit,
    fileInfo?: Partial<FileTransferMetadata>,
  ) => void
  cancel_transfer_offer: (transferId: string) => void
  accept_transfer: (
    transferId: string,
    answer: RTCSessionDescriptionInit,
  ) => void
  reject_transfer: (transferId: string) => void
  send_ice_candidate: (
    candidate: RTCIceCandidateInit,
    transferId: string,
  ) => void
  transfer_progress_update: (progress: FileTransferProgress) => void
  transfer_completed: (transferId: string) => void
  transfer_failed: (transferId: string, reason: string) => void
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
  subtitle?: {
    content: string
    name: string
    type: 'vtt' | 'srt'
  }
  bannedUsers: {
    ip: string
    username: string
    bannedAt: number
  }[]
}

// WebRTC 信令相关
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer'
  sdp: string
}

export interface RTCIceCandidateInit {
  candidate?: string
  sdpMid?: string
  sdpMLineIndex?: number
}

// 文件传输元数据
export interface FileTransferMetadata {
  fileName: string
  fileSize: number
  fileType: string
  senderId: string
  senderName: string
  transferId: string
  roomId: string // 验证传输在正确房间内
}

// 传输进度
export interface FileTransferProgress {
  transferId: string
  bytesTransferred: number
  totalBytes: number
  percentage: number
}
