import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/useAppStore'

interface ChatPanelProps {
  className?: string
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const ChatPanel = ({ className }: ChatPanelProps) => {
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
        className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 md:pb-4"
        ref={scrollRef}
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center space-y-2 text-gray-400">
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

            return (
              <div
                key={msg.id}
                className="animate-message-in my-4 flex justify-center opacity-85"
              >
                <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs text-gray-500 shadow-sm">
                  <span className="mr-1 font-mono text-[10px] text-gray-400">
                    {time}
                  </span>

                  {!isSystemUser && (
                    <span className="rounded border border-indigo-100/50 bg-indigo-50 px-1.5 py-0.5 font-bold text-indigo-600">
                      {msg.username}
                    </span>
                  )}

                  <span>{msg.content}</span>
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

      {/* 输入框区域 */}
      <form
        onSubmit={handleSend}
        className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-100 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md md:relative md:z-20 md:bg-white md:pb-4 md:shadow-none"
      >
        <div className="relative flex items-center gap-2">
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
