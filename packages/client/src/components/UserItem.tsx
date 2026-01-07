import { useState, useRef } from 'react'
import { User } from '@local-party/shared/src/types'
import { PortalTooltip } from './PortalTooltip'

// Helper
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

interface UserItemProps {
  user: User
  isHost: boolean
  isMe: boolean
  hostDuration?: number
}

export const UserItem = ({
  user,
  isHost,
  isMe,
  hostDuration,
}: UserItemProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const handleMouseEnter = () => {
    if (itemRef.current) {
      setRect(itemRef.current.getBoundingClientRect())
      setIsHovered(true)
    }
  }

  // 状态判定逻辑
  let statusColor = 'bg-gray-300'
  let statusIcon = null
  let statusText = '等待选择'

  if (user.videoDuration) {
    if (!hostDuration && !isHost) {
      statusColor = 'bg-emerald-400'
      statusText = '已就绪'
    } else if (hostDuration) {
      const diff = Math.abs(user.videoDuration - hostDuration)
      if (diff < 2) {
        statusColor = 'bg-emerald-400'
        statusText = '已就绪'
      } else {
        statusColor = 'bg-amber-400'
        statusText = '时长不符'
        statusIcon = (
          <svg
            className="ml-1 h-3 w-3 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )
      }
    } else {
      // 我是房主且我有时长
      statusColor = 'bg-emerald-400'
      statusText = '基准'
    }
  }

  return (
    <>
      <div
        ref={itemRef}
        className="relative flex shrink-0 cursor-help items-center gap-2 rounded-2xl border border-gray-100 bg-white py-2 pr-4 pl-2.5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`h-2.5 w-2.5 rounded-full ${statusColor} ${isMe ? 'animate-pulse' : ''} shadow-sm`}
        ></div>

        <span className="max-w-[80px] truncate text-xs font-black text-gray-700">
          {user.username}
        </span>

        {isHost && (
          <span className="ml-0.5 rounded-full border border-yellow-100 bg-yellow-50 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-yellow-600">
            HOST
          </span>
        )}

        {statusIcon}
      </div>

      {/* Portal Tooltip */}
      <PortalTooltip
        isVisible={isHovered && !!user.videoDuration}
        targetRect={rect}
        content={
          <div className="flex flex-col gap-0.5 text-center">
            <div className="font-bold text-gray-200">
              {user.fileName || 'Unknown File'}
            </div>
            <div className="font-mono text-white/80">
              {user.videoDuration
                ? formatDuration(user.videoDuration)
                : '--:--'}
            </div>
            {statusText === '时长不符' && (
              <div className="mt-1 text-[9px] font-bold text-amber-400">
                ⚠️ 版本不一致
              </div>
            )}
          </div>
        }
      />
    </>
  )
}
