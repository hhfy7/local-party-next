import { useState, useRef } from 'react'
import { KickConfirmModal } from '@/components/modals/KickConfirmModal'
import { User } from '@local-party/shared/src/types'
import { PortalTooltip } from '@/components/ui/PortalTooltip'
import { useAppStore } from '@/stores/useAppStore'
import toast from 'react-hot-toast'
import {
  SpinnerIcon,
  CheckIcon,
  WarningIcon,
  KickIcon,
  CloseIcon,
} from '@/components/icons'

// 状态类型
interface StatusInfo {
  color: string
  icon: React.ReactNode | null
  text: string
}

// 提取状态判定逻辑为独立函数 - 减少嵌套
const getStatusInfo = (
  user: User,
  isHost: boolean,
  hostDuration: number | undefined,
  transferStatus: 'pending' | 'completed' | null | undefined,
): StatusInfo => {
  // 传输完成状态
  if (transferStatus === 'completed') {
    return {
      color: 'bg-green-500',
      icon: <CheckIcon className="ml-1 h-3 w-3 text-green-500" />,
      text: '已接收',
    }
  }

  // 传输中状态
  if (transferStatus === 'pending') {
    return {
      color: 'bg-blue-400',
      icon: <SpinnerIcon className="ml-1 h-3 w-3 animate-spin text-blue-500" />,
      text: '接收中...',
    }
  }

  // 无视频时长
  if (!user.videoDuration) {
    return {
      color: 'bg-gray-300',
      icon: null,
      text: '等待选择',
    }
  }

  // 我有时长且对方是普通成员（未选择视频）
  if (!hostDuration && !isHost) {
    return {
      color: 'bg-emerald-400',
      icon: null,
      text: '已就绪',
    }
  }

  // 有 host 时长，比较差异
  if (hostDuration) {
    const diff = Math.abs(user.videoDuration - hostDuration)
    if (diff < 2) {
      return {
        color: 'bg-emerald-400',
        icon: null,
        text: '已就绪',
      }
    }
    return {
      color: 'bg-amber-400',
      icon: <WarningIcon className="ml-1 h-3 w-3 text-amber-500" />,
      text: '时长不符',
    }
  }

  // 我是房主且我有时长（我是基准）
  return {
    color: 'bg-emerald-400',
    icon: null,
    text: '基准',
  }
}

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
  isHost: boolean // 目标用户是房主
  isMe: boolean
  amIHost: boolean // 我(当前视角)是房主
  hostDuration?: number
  variant?: 'horizontal' | 'vertical'
  transferStatus?: 'pending' | 'completed' | null
}

export const UserItem = ({
  user,
  isHost,
  isMe,
  amIHost,
  hostDuration,
  variant = 'horizontal',
  transferStatus,
}: UserItemProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const itemRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const { socket } = useAppStore()
  const [isKickModalOpen, setIsKickModalOpen] = useState(false)

  const handleMouseEnter = () => {
    if (itemRef.current) {
      setRect(itemRef.current.getBoundingClientRect())
      setIsHovered(true)
    }
  }

  const handleKickClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsKickModalOpen(true)
  }

  const handleConfirmKick = () => {
    if (!socket) return

    const toastId = toast.loading('正在移除...')
    socket.emit('kick_user', { targetUserId: user.id }, res => {
      if (res.success) {
        toast.success('已移除', { id: toastId })
        setIsKickModalOpen(false)
      } else {
        toast.error(res.error || '移除失败', { id: toastId })
        setIsKickModalOpen(false)
      }
    })
  }

  // 使用提取的状态判定函数
  const statusInfo = getStatusInfo(user, isHost, hostDuration, transferStatus)

  if (variant === 'vertical') {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center gap-3">
          {/* 头像/状态灯 */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl font-black text-white ${statusInfo.color} shadow-md`}
          >
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{user.username}</span>
              {isHost && (
                <span className="rounded-md bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-700">
                  HOST
                </span>
              )}
              {isMe && (
                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  ME
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>{statusInfo.text}</span>
              {user.videoDuration && (
                <>
                  <span>•</span>
                  <span className="font-mono">
                    {formatDuration(user.videoDuration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user.fileName && (
            <div className="max-w-[100px] truncate rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
              {user.fileName}
            </div>
          )}
          {amIHost && !isMe && (
            <button
              onClick={handleKickClick}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-colors hover:bg-red-100 active:scale-95"
              title="移出房间"
            >
              <KickIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <KickConfirmModal
          isOpen={isKickModalOpen}
          user={user}
          onConfirm={handleConfirmKick}
          onCancel={() => setIsKickModalOpen(false)}
        />
      </div>
    )
  }

  return (
    <>
      <div
        ref={itemRef}
        className="group relative flex shrink-0 cursor-default items-center gap-2 rounded-2xl border border-gray-100 bg-white py-2 pr-9 pl-2.5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`h-2.5 w-2.5 rounded-full ${statusInfo.color} ${isMe ? 'animate-pulse' : ''} shadow-sm`}
        ></div>

        <span className="max-w-[80px] truncate text-xs font-black text-gray-700">
          {user.username}
        </span>

        {isHost && (
          <span className="ml-0.5 rounded-full border border-yellow-100 bg-yellow-50 px-1.5 py-0.5 text-[9px] font-bold tracking-tight text-yellow-600">
            HOST
          </span>
        )}

        {statusInfo.icon}

        {amIHost && !isMe && (
          <button
            onClick={handleKickClick}
            className="invisible absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-gray-400 opacity-0 transition-all group-hover:visible group-hover:opacity-100 hover:bg-red-500 hover:text-white active:scale-95"
            title="移除用户"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <KickConfirmModal
        isOpen={isKickModalOpen}
        user={user}
        onConfirm={handleConfirmKick}
        onCancel={() => setIsKickModalOpen(false)}
      />

      {/* Portal Tooltip (只在 Horizontal 模式下需要，Vertical 模式直接显示了信息) */}
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
            {statusInfo.text === '时长不符' && (
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
