import { useState } from 'react'
import { User } from '@local-party/shared/src/types'
import { saveNickname } from '@/utils/storage'
import { copyToClipboard } from '@/utils/clipboard'
import toast from 'react-hot-toast'
import { useAppStore } from '@/stores/useAppStore'

interface RoomInfoPanelProps {
  roomId: string
  currentUser: User | null
  className?: string
}

export const RoomInfoPanel = ({
  roomId,
  currentUser,
  className = '',
}: RoomInfoPanelProps) => {
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const { socket } = useAppStore()

  const handleUpdateName = () => {
    const trimmed = tempName.trim()
    if (!trimmed) return setIsEditingName(false)
    if (trimmed === currentUser?.username) return setIsEditingName(false)

    saveNickname(trimmed)
    setIsEditingName(false)
    toast.success('昵称已更新 (刷新后完全同步)')
  }

  const handleCopyLink = () => {
    if (!socket || !roomId) {
      void copyToClipboard(window.location.href)
      return
    }

    const toastId = toast.loading('生成邀请链接...')
    socket.emit(
      'generate_invite_token',
      { roomId },
      (res: { success: boolean; token?: string; error?: string }) => {
        toast.dismiss(toastId)
        if (res.success && res.token) {
          const url = new URL(window.location.href)
          url.searchParams.set('token', res.token)
          void copyToClipboard(url.toString())
          toast.success('已复制临时邀请链接 (3分钟有效)', { icon: '🔗' })
        } else {
          // 降级：复制普通链接
          void copyToClipboard(window.location.href)
          if (res.error === '无权操作') {
            toast.error('您不在房间内')
          } else {
            toast.success('已复制房间链接 (无Token)')
          }
        }
      },
    )
  }

  return (
    <div
      className={`border-b border-gray-100 bg-white/50 p-6 backdrop-blur-xl ${className}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-gray-900">
          Room{' '}
          <span className="ml-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-lg text-indigo-600">
            {roomId}
          </span>
        </h2>
        <button
          onClick={handleCopyLink}
          className="rounded-xl p-2.5 text-gray-400 shadow-sm ring-1 ring-gray-100 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
        </button>
      </div>

      {/* 昵称编辑区 */}
      {isEditingName ? (
        <div className="animate-fade-in flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white p-1.5 shadow-lg ring-2 shadow-indigo-50 ring-indigo-50">
          <input
            autoFocus
            maxLength={12}
            className="flex-1 border-0 bg-transparent px-3 py-2 text-sm font-bold text-gray-900 outline-none placeholder:font-normal focus:ring-0"
            value={tempName}
            onChange={e => setTempName(e.target.value)}
            placeholder="新昵称"
            onKeyDown={e => e.key === 'Enter' && handleUpdateName()}
          />
          <button
            onClick={handleUpdateName}
            className="rounded-xl bg-indigo-600 p-2 text-white shadow-md transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsEditingName(false)}
            className="rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div className="group flex cursor-default items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-3 transition-all hover:border-indigo-100 hover:bg-white hover:shadow-md hover:shadow-indigo-50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-indigo-500 to-purple-600 font-black text-white shadow-lg shadow-indigo-200 transition-transform group-hover:scale-105">
              {currentUser?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="mb-0.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                Your Identity
              </div>
              <div className="text-base font-black tracking-tight text-gray-900">
                {currentUser?.username}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              setTempName(currentUser?.username || '')
              setIsEditingName(true)
            }}
            className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-xs font-bold text-indigo-600 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-indigo-200 hover:shadow-md active:scale-95"
          >
            修改
          </button>
        </div>
      )}
    </div>
  )
}
