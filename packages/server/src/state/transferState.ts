import type { User } from '@local-party/shared/src/types'

// 活跃的传输会话 (State)
// 房间ID -> {定时器, 原房主名}
export const hostTransferTimers = new Map<
  string,
  {
    timer: NodeJS.Timeout
    expectedHostName: string
    expectedHostClientId?: string
  }
>()

// 传输ID -> {发送者, 接收者列表}
export const activeTransfers = new Map<
  string,
  {
    fromUser: User
    toUsers: User[]
  }
>()
