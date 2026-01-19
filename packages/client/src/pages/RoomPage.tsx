import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { VideoPlayer } from '@/components/VideoPlayer'
import { ChatPanel } from '@/components/ChatPanel'
import { saveNickname } from '@/utils/storage'
import toast from 'react-hot-toast'
import { copyToClipboard } from '@/utils/clipboard'

// Hooks
import { useRoomLogic } from '@/hooks/useRoomLogic'
import { useFileHandler } from '@/hooks/useFileHandler'
import { useVideoSync } from '@/hooks/useVideoSync'
import { useP2PManager } from '@/hooks/useP2PManager'

import type { User, FileTransferMetadata } from '@local-party/shared/src/types'

// Components
import { JoinModal } from '@/components/JoinModal'
import {
  ErrorScreen,
  LoadingScreen,
  RoomNotFoundScreen,
} from '@/components/StatusScreens'
import { UserItem } from '@/components/UserItem'
import { VideoEmptyState } from '@/components/VideoEmptyState'
import { RoomInfoPanel } from '@/components/RoomInfoPanel'
import { MobileTabs } from '@/components/MobileTabs'
import { ShareDialog } from '@/components/ShareDialog'
import { TransferConfirmModal } from '@/components/TransferConfirmModal'
import { TransferProgress } from '@/components/TransferProgress'

export const RoomPage = () => {
  const { roomId: paramRoomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()

  // UI State
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)

  // P2P UI State
  const [isP2PVideo, setIsP2PVideo] = useState(false)

  // Mobile UI State
  const [activeTab, setActiveTab] = useState<'chat' | 'users' | 'info'>('chat')

  // 从 Store 获取全局状态
  const {
    currentUser,
    socket,
    roomId,
    users,
    hostId,
    lastAction,
    lastActionAt,
  } = useAppStore()

  const isHost = currentUser?.id === hostId

  // 房间业务逻辑
  const { errorMsg, isAutoJoining, handleJoin, handleCreate } =
    useRoomLogic(paramRoomId)

  // --- File Handler ---
  const {
    cachedFileHandle,
    fileObject,
    handleInputSelect,
    restoreCachedVideo,
    pickFile,
    videoUrl,
    setVideoFile,
  } = useFileHandler(roomId || undefined)

  // --- P2P Manager ---
  // 将 P2P 逻辑完全委托给 useP2PManager
  const p2p = useP2PManager(setVideoFile, setIsP2PVideo)

  // Helper: 保存文件选择器
  const showSaveFilePicker = async (file: File) => {
    try {
      if ('showSaveFilePicker' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: file.name,
          types: [
            {
              description: 'Video File',
              accept: { [file.type]: ['.mp4', '.mkv', '.webm'] },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(file)
        await writable.close()
        toast.success('文件导出成功')
      } else {
        // Fallback
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Save failed:', err)
        toast.error('保存失败')
      }
    }
  }

  // --- 同步逻辑 ---
  const { handleVideoLoaded, triggerResync, isManualPaused } = useVideoSync(
    socket,
    videoRef,
    lastAction,
    videoUrl,
    isHost,
    lastActionAt,
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

  if (errorMsg === '房间不存在' && paramRoomId) {
    return (
      <RoomNotFoundScreen
        roomId={paramRoomId}
        onBack={() => navigate('/')}
        onCreateNew={handleCreate}
      />
    )
  }

  if (errorMsg)
    return <ErrorScreen message={errorMsg} onBack={() => navigate('/')} />
  if (isAutoJoining) return <LoadingScreen />
  if (!currentUser && paramRoomId)
    return <JoinModal roomId={paramRoomId} onJoin={name => handleJoin(name)} />

  const bgColor = videoUrl ? 'bg-gray-900' : 'bg-gray-50'
  const leftPanelBg = videoUrl ? 'bg-black' : 'bg-transparent'

  const renderDesktopNameEditor = () => {
    if (isEditingName) {
      return (
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
      )
    }
    return (
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
    )
  }

  return (
    <div
      className={`relative flex h-[100dvh] flex-col overflow-hidden transition-colors duration-700 ease-in-out md:flex-row ${bgColor}`}
    >
      {/* --- Global P2P Components --- */}
      <TransferConfirmModal
        isOpen={!!p2p.ui.confirmModalData}
        fromUser={p2p.ui.confirmModalData?.fromUser || ({} as User)}
        fileMeta={
          p2p.ui.confirmModalData?.fileMeta || ({} as FileTransferMetadata)
        }
        onReject={p2p.actions.rejectTransfer}
        onAccept={p2p.actions.acceptTransfer}
      />

      <ShareDialog
        isOpen={p2p.ui.isShareDialogOpen}
        fileMeta={p2p.ui.shareFileMeta}
        recipientCount={users.length - 1} // 排除自己
        onConfirm={p2p.actions.confirmShare}
        onCancel={p2p.actions.closeShareDialog}
      />

      <TransferProgress
        progress={p2p.data.progress}
        isReceiving={p2p.data.isReceiving}
        statusText={p2p.ui.statusText}
        currentStep={p2p.ui.p2pStep}
        stepStatus={p2p.ui.p2pStepStatus}
        onCancel={() => {
          p2p.actions.cancelTransfer()
        }}
      />

      {/* --- 区域 A: 视频舞台 (Video Stage) --- */}
      <div
        className={`relative w-full shrink-0 transition-all duration-700 md:h-full md:flex-1 ${
          videoUrl ? 'h-[35vh]' : 'h-auto min-h-[35vh]'
        } ${leftPanelBg}`}
      >
        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={`absolute top-6 right-6 z-30 hidden rounded-full border border-white/10 p-3 shadow-lg backdrop-blur-md transition-all duration-300 md:block ${
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

        <div className="relative flex h-full w-full items-center justify-center p-4 md:p-8">
          {/* --- 掉队提示按钮 (仅在手动暂停掉队时显示) --- */}
          {isManualPaused && videoUrl && (
            <button
              onClick={triggerResync}
              className="absolute top-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100/90 px-3 py-1.5 text-[10px] font-bold text-orange-700 shadow-lg backdrop-blur transition-all hover:scale-105 hover:bg-orange-200 md:top-12 md:gap-2 md:px-4 md:py-2 md:text-xs"
            >
              <span className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-orange-500 md:h-2 md:w-2"></span>
              </span>
              与房主不同步 (点击追赶)
            </button>
          )}

          {!videoUrl ? (
            // Empty State (Mobile: Scale 75%)
            <div className="scale-75 md:scale-100">
              <VideoEmptyState
                cachedFileHandle={cachedFileHandle}
                onRestore={restoreCachedVideo}
                onPick={pickFile}
              />
            </div>
          ) : (
            <VideoPlayer
              ref={videoRef}
              src={videoUrl}
              className="animate-fade-in h-full w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10 outline-none md:rounded-2xl"
              onLoadedMetadata={handleVideoLoaded}
              onDurationChange={handleDurationChange}
            />
          )}
        </div>
      </div>

      {/* --- 区域 B: 功能面板 (Content Panel) --- */}
      <div
        className={`relative z-20 flex min-h-0 flex-1 flex-col bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 md:shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] ${
          isSidebarOpen
            ? 'md:w-80 md:flex-none md:translate-x-0 md:opacity-100'
            : 'md:w-0 md:flex-none md:translate-x-20 md:overflow-hidden md:opacity-0'
        }`}
      >
        {/* === Mobile View === */}
        <div className="flex h-full flex-col md:hidden">
          <MobileTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div
            className={`pb-safe min-h-0 flex-1 ${
              activeTab === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'
            }`}
          >
            {activeTab === 'chat' && (
              <ChatPanel
                className="h-full"
                isHost={isHost}
                hasFile={!!cachedFileHandle || !!fileObject}
                onShareClick={() =>
                  p2p.actions.openShareDialog(
                    cachedFileHandle,
                    fileObject,
                    videoUrl,
                  )
                }
              />
            )}

            {activeTab === 'users' && (
              <div className="flex flex-col gap-3 p-4">
                {users.map(u => (
                  <UserItem
                    key={u.id}
                    user={u}
                    isHost={u.id === hostId}
                    isMe={u.id === currentUser?.id}
                    hostDuration={
                      users.find(user => user.id === hostId)?.videoDuration
                    }
                    variant="vertical"
                  />
                ))}
              </div>
            )}

            {activeTab === 'info' && (
              <div className="h-full bg-gray-50/50">
                <RoomInfoPanel
                  roomId={roomId || ''}
                  currentUser={currentUser}
                  className="bg-transparent shadow-none"
                />
                <div className="flex flex-col gap-3 p-6">
                  {/* P2P Export Button (Mobile) */}
                  {isP2PVideo && (
                    <button
                      onClick={() => {
                        const file = p2p.actions.getReceivedFile()
                        if (file) showSaveFilePicker(file)
                        else toast.error('文件已失效')
                      }}
                      className="w-full rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-md active:scale-95"
                    >
                      💾 保存视频到本地
                    </button>
                  )}

                  {/* 手机端独有的更换视频按钮 */}
                  {videoUrl && (
                    <div className="flex flex-col gap-3">
                      {isHost && (
                        <button
                          onClick={() =>
                            p2p.actions.openShareDialog(
                              cachedFileHandle,
                              fileObject,
                              videoUrl,
                            )
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-50 py-4 font-bold text-indigo-600 shadow-sm transition-all active:scale-95"
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
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                          分享视频给成员
                        </button>
                      )}

                      <button
                        onClick={() => {
                          pickFile()
                          setIsP2PVideo(false)
                        }}
                        className="w-full rounded-2xl border border-gray-200 bg-white py-4 font-bold text-gray-700 shadow-sm"
                      >
                        更换视频源
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === Desktop View === */}
        <div className="hidden h-full flex-col md:flex">
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
                  void copyToClipboard(window.location.href)
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
            {renderDesktopNameEditor()}
          </div>

          {/* User List (Horizontal) */}
          <div className="scrollbar-hide flex shrink-0 gap-2.5 overflow-x-auto border-b border-gray-100 bg-white px-6 py-4">
            {users.map(u => (
              <UserItem
                key={u.id}
                user={u}
                isHost={u.id === hostId}
                isMe={u.id === currentUser?.id}
                hostDuration={
                  users.find(user => user.id === hostId)?.videoDuration
                }
                variant="horizontal"
              />
            ))}
          </div>

          {/* Chat */}
          <ChatPanel
            className="min-h-0 flex-1"
            isHost={isHost}
            hasFile={!!cachedFileHandle || !!fileObject}
            onShareClick={() =>
              p2p.actions.openShareDialog(
                cachedFileHandle,
                fileObject,
                videoUrl,
              )
            }
          />

          {/* Change Video Button */}
          {videoUrl && (
            <div className="flex shrink-0 justify-center gap-3 border-t border-gray-100 bg-white p-4 pb-6">
              {/* P2P Video Export Button (Persistent) */}
              {isP2PVideo && (
                <button
                  onClick={() => {
                    const file = p2p.actions.getReceivedFile()
                    if (file) showSaveFilePicker(file)
                    else toast.error('文件已失效')
                  }}
                  className="group flex items-center gap-2 rounded-2xl bg-indigo-50 px-5 py-3 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:scale-95"
                >
                  <span className="rounded-lg bg-white p-1.5 text-indigo-600 shadow-sm transition-transform group-hover:scale-110">
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </span>
                  保存视频
                </button>
              )}

              <button
                onClick={() => {
                  pickFile()
                  setIsP2PVideo(false) // Reset flag when manually picking
                }}
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

      {/* Global Hidden Input for iPad/Fallback File Selection */}
      <input
        id="hidden-file-input"
        type="file"
        accept="video/*"
        onChange={handleInputSelect}
        className="hidden"
      />
    </div>
  )
}
