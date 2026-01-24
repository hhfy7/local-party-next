import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'

interface ChatPanelProps {
  className?: string
  isHost?: boolean
  hasFile?: boolean
  onShareClick?: () => void
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const ChatPanel = ({
  className,
  isHost,
  hasFile,
  onShareClick,
}: ChatPanelProps) => {
  const { messages, currentUser, socket } = useAppStore()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !socket) return

    socket.emit('send_message', input)
    setInput('')
  }

  return (
    <div
      className={`flex flex-col border-l border-gray-100 bg-gray-50 ${className}`}
    >
      {/* 消息列表 */}
      <div
        className="flex-1 space-y-4 overflow-y-auto p-4 md:pb-4"
        ref={scrollRef}
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-end space-y-2 pb-8 text-gray-400 md:justify-center md:pb-0">
            <span className="text-4xl">👋</span>
            <span className="text-sm">暂无消息，打个招呼吧！</span>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.userId === currentUser?.id
          const time = formatTime(msg.timestamp)

          // --- 系统消息 (居中，灰色小字) ---
          if (msg.type === 'system') {
            const isSystemUser =
              msg.username === 'System' || msg.username === '未知'

            // 高亮判断：包含特定关键词的消息
            const isHighlight =
              msg.content.includes('分享') ||
              msg.content.includes('传输') ||
              msg.content.includes('拒绝') ||
              msg.content.includes('取消')

            return (
              <div
                key={msg.id}
                className="animate-message-in my-4 flex justify-center opacity-85"
              >
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs shadow-sm ${
                    isHighlight
                      ? 'border-indigo-100 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 bg-gray-100 text-gray-500'
                  }`}
                >
                  <span
                    className={`mr-1 font-mono text-[10px] ${
                      isHighlight ? 'text-indigo-400' : 'text-gray-400'
                    }`}
                  >
                    {time}
                  </span>

                  {!isSystemUser && (
                    <span
                      className={`rounded border px-1.5 py-0.5 font-bold ${
                        isHighlight
                          ? 'border-indigo-200 bg-white text-indigo-700'
                          : 'border-indigo-100/50 bg-indigo-50 text-indigo-600'
                      }`}
                    >
                      {msg.username}
                    </span>
                  )}

                  <span className={isHighlight ? 'font-medium' : ''}>
                    {msg.content}
                  </span>
                </span>
              </div>
            )
          }

          // --- 用户消息 (左右分栏) ---
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-message-in`}
            >
              {/* 昵称 (仅在非自己时显示) */}
              {!isMe && (
                <div className="mb-1 flex items-baseline space-x-2 px-1">
                  <span className="text-xs font-bold text-gray-500">
                    {msg.username}
                  </span>
                </div>
              )}

              {/* 气泡主体 */}
              <div
                className={`relative max-w-[85%] px-4 py-2.5 break-words shadow-sm ${
                  isMe
                    ? 'rounded-2xl rounded-tr-none bg-indigo-600 text-white'
                    : 'rounded-2xl rounded-tl-none border border-gray-100 bg-white text-gray-800'
                }`}
              >
                {msg.content}

                {/* 时间戳 (气泡内右下角) */}
                <div
                  className={`mt-1 text-right text-[10px] ${
                    isMe ? 'text-indigo-200' : 'text-gray-400'
                  }`}
                >
                  {time}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 输入框区域 - 改为 Flex 布局以自适应安全区域 */}
      <form
        onSubmit={handleSend}
        className="relative z-20 w-full border-t border-gray-100 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md md:bg-white md:pb-4 md:shadow-none"
      >
        <div className="relative flex items-center gap-2">
          {/* 分享视频按钮 (仅房主可见) */}
          {isHost && (
            <button
              type="button"
              onClick={onShareClick}
              disabled={!hasFile}
              className={`group flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 ${
                hasFile
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  : 'cursor-not-allowed bg-gray-100 text-gray-300'
              }`}
              title={hasFile ? '分享当前视频给成员' : '请先选择本地视频文件'}
            >
              {/* 这里更换为标准的 Share 图标 (方框箭头) */}
              <svg
                className={`h-5 w-5 transition-transform ${hasFile ? 'group-hover:scale-110' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </button>
          )}

          <input
            type="text"
            maxLength={200}
            className="flex-1 rounded-full border-0 bg-gray-100 py-3 pr-12 pl-5 text-gray-900 transition-all outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 sm:text-sm"
            placeholder="聊点什么..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 rounded-full bg-indigo-600 p-2 text-white shadow-sm transition-all hover:bg-indigo-700 disabled:bg-transparent disabled:text-gray-400 disabled:shadow-none"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
