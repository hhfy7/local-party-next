import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ChatPanel } from '@/components/ChatPanel'
import { saveNickname } from '@/utils/storage'
import toast from 'react-hot-toast'

// Hooks
import { useRoomLogic } from '../hooks/useRoomLogic'
import { useFileHandler } from '../hooks/useFileHandler'
import { useVideoSync } from '../hooks/useVideoSync'

// Components
import { JoinModal } from '@/components/JoinModal'
import {
  ErrorScreen,
  LoadingScreen,
  RoomNotFoundScreen,
} from '@/components/StatusScreens'
import { UserItem } from '@/components/UserItem'
import { VideoEmptyState } from '@/components/VideoEmptyState'

export const RoomPage = () => {
  const { roomId } = useParams()
  const { users, currentUser, socket, lastAction } = useAppStore()

  // UI State
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  // 1. 房间逻辑
  const { isAutoJoining, errorMsg, handleJoin, handleCreate, navigate } =
    useRoomLogic(roomId)

  // 2. 文件逻辑
  const {
    videoUrl,
    cachedFileHandle,
    pickFile,
    restoreCachedVideo,
    handleInputSelect,
  } = useFileHandler(roomId)

  // 3. 同步逻辑
  const { handleVideoLoaded } = useVideoSync(
    socket,
    videoRef,
    lastAction,
    videoUrl,
  )

  // --- 状态上报逻辑 ---
  const handleDurationChange = (duration: number) => {
    if (!socket || !duration) return
    const fileName = cachedFileHandle?.name || 'Local File'
    console.log('[Status Report]', { duration, fileName })
    socket.emit('update_status', { duration, fileName })
  }

  // --- Handlers ---
  const handleUpdateName = () => {
    const trimmed = tempName.trim()
    if (!trimmed) return setIsEditingName(false)
    if (trimmed === currentUser?.username) return setIsEditingName(false)

    saveNickname(trimmed)
    setIsEditingName(false)
    toast.success('昵称已更新 (刷新后完全同步)')
  }

  // --- Render ---

  if (errorMsg === '房间不存在' && roomId) {
    return (
      <RoomNotFoundScreen
        roomId={roomId}
        onBack={() => navigate('/')}
        onCreateNew={handleCreate}
      />
    )
  }

  if (errorMsg)
    return <ErrorScreen message={errorMsg} onBack={() => navigate('/')} />
  if (isAutoJoining) return <LoadingScreen />
  if (!currentUser && roomId)
    return <JoinModal roomId={roomId} onJoin={name => handleJoin(name)} />

  const bgColor = videoUrl ? 'bg-gray-900' : 'bg-gray-50'
  const leftPanelBg = videoUrl ? 'bg-black' : 'bg-transparent'

  return (
    <div
      className={`relative flex h-screen flex-col overflow-hidden transition-colors duration-700 ease-in-out md:flex-row ${bgColor}`}
    >
      {/* --- 左侧视频/操作区 --- */}
      <div
        className={`relative flex flex-1 flex-col overflow-hidden transition-colors duration-700 ${leftPanelBg}`}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={`absolute top-6 right-6 z-30 rounded-full border border-white/10 p-3 shadow-lg backdrop-blur-md transition-all duration-300 ${
            videoUrl
              ? 'bg-black/20 text-white/70 hover:bg-black/40 hover:text-white'
              : 'bg-white/60 text-gray-500 ring-1 ring-gray-200/50 hover:bg-white hover:text-indigo-600'
          } ${isSidebarOpen ? 'rotate-180' : ''}`}
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
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>

        <div className="relative flex h-full w-full flex-1 items-center justify-center p-4 md:p-8">
          {!videoUrl ? (
            <VideoEmptyState
              cachedFileHandle={cachedFileHandle}
              onRestore={restoreCachedVideo}
              onPick={pickFile}
              onInputSelect={handleInputSelect}
            />
          ) : (
            <VideoPlayer
              ref={videoRef}
              src={videoUrl}
              className="animate-fade-in h-full w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10 outline-none"
              onLoadedMetadata={handleVideoLoaded}
              onDurationChange={handleDurationChange}
            />
          )}
        </div>
      </div>

      {/* --- 右侧侧边栏 --- */}
      <div
        className={`cubic-bezier(0.4, 0, 0.2, 1) relative z-20 flex flex-col bg-white shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] transition-all duration-500 ${isSidebarOpen ? 'w-full translate-x-0 opacity-100 md:w-96' : 'w-0 translate-x-20 overflow-hidden opacity-0'} ${isSidebarOpen ? 'h-[40vh] md:h-full' : 'h-0 md:h-full'} `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 shrink-0 border-b border-gray-100 bg-white/50 p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black tracking-tight text-gray-900">
              Room{' '}
              <span className="ml-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-lg text-indigo-600">
                {roomId}
              </span>
            </h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                toast.success('链接已复制', { icon: '🔗' })
              }}
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

        {/* 用户列表 */}
        <div className="scrollbar-hide flex shrink-0 gap-2.5 overflow-x-auto border-b border-gray-100 bg-white px-6 py-4">
          {users.map(u => (
            <UserItem
              key={u.id}
              user={u}
              isHost={u.id === (users[0]?.id || '')}
              isMe={u.id === currentUser?.id}
              hostDuration={users[0]?.videoDuration}
            />
          ))}
        </div>

        <ChatPanel className="min-h-0 flex-1" />

        {videoUrl && (
          <div className="flex shrink-0 justify-center border-t border-gray-100 bg-white p-4 pb-6">
            <button
              onClick={pickFile}
              className="group flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-bold text-gray-500 transition-all hover:bg-indigo-50 hover:text-indigo-600"
            >
              <span className="rounded-lg bg-gray-100 p-1.5 transition-colors group-hover:bg-indigo-200 group-hover:text-indigo-700">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </span>
              更换视频源
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
