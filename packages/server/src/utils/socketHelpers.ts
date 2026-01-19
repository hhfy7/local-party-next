// 常量定义
export const MAX_MESSAGES = 100 // 房间最大保留消息数
export const MAX_USERNAME_LEN = 12 // 昵称最大长度
export const MAX_CONTENT_LEN = 200 // 聊天内容最大长度

// Helper: 格式化秒数为 HH:mm:ss 或 mm:ss
export const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
