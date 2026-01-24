import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { saveNickname } from '@/utils/storage'
import toast from 'react-hot-toast'
import { showSaveFilePicker } from '@/utils/fileHelpers'

// Hooks
import { useRoomLogic } from '@/hooks/useRoomLogic'
import { useFileHandler } from '@/hooks/useFileHandler'
import { useVideoSync } from '@/hooks/useVideoSync'
import { useP2PManager } from '@/hooks/useP2PManager'
import { useSubtitle } from '@/hooks/useSubtitle'

// Components
import { JoinModal } from '@/components/JoinModal'
import {
  ErrorScreen,
  LoadingScreen,
  RoomNotFoundScreen,
} from '@/components/StatusScreens'

// Room Components
import { P2POverlay } from '@/components/room/P2POverlay'
import { VideoStage } from '@/components/room/VideoStage'
import { DesktopSidebar } from '@/components/room/DesktopSidebar'
import { MobileView } from '@/components/room/MobileView'

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

  // --- 同步逻辑 ---
  const { handleVideoLoaded, triggerResync, isManualPaused } = useVideoSync(
    socket,
    videoRef,
    lastAction,
    videoUrl,
    isHost,
    lastActionAt,
  )

  // --- 字幕逻辑 ---
  const { subtitleUrl, subtitleName, handleUploadSubtitle } = useSubtitle()

  // --- 状态上报逻辑 ---
  const handleDurationChange = (duration: number) => {
    if (!socket || !duration) return
    const fileName = cachedFileHandle?.name || 'Local File'
    console.log('[Status Report]', { duration, fileName })
    socket.emit('update_status', { duration, fileName })
  }

  // --- 拖拽处理逻辑 ---
  const handleFileDrop = (file: File) => {
    const name = file.name.toLowerCase()

    // 1. 检查是否为字幕文件
    if (name.endsWith('.srt') || name.endsWith('.vtt')) {
      // 只有房主可以上传字幕
      if (!isHost) {
        toast.error('只有房主可以上传字幕')
        return
      }
      handleUploadSubtitle(file)
      return
    }

    // 2. 检查是否为视频文件 (简单检查)
    // 允许常见视频格式，或者 mime type 为 video/*
    if (
      name.endsWith('.mp4') ||
      name.endsWith('.mkv') ||
      name.endsWith('.webm') ||
      name.endsWith('.mov') ||
      file.type.startsWith('video/')
    ) {
      setVideoFile(file)
      toast.success('已切换视频源', { icon: '🎬' })
      return
    }

    // 3. 其他文件
    toast.error('不支持的文件格式')
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

  return (
    <div
      className={`relative flex h-[100dvh] flex-col overflow-hidden transition-colors duration-700 ease-in-out md:flex-row ${bgColor}`}
    >
      {/* --- Global P2P Components --- */}
      <P2POverlay p2p={p2p} recipientCount={users.length - 1} />

      {/* --- 区域 A: 视频舞台 (Video Stage) --- */}
      <VideoStage
        ref={videoRef}
        videoUrl={videoUrl}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        isManualPaused={isManualPaused}
        triggerResync={triggerResync}
        cachedFileHandle={cachedFileHandle}
        onRestore={restoreCachedVideo}
        onPick={pickFile}
        handleVideoLoaded={handleVideoLoaded}
        handleDurationChange={handleDurationChange}
        subtitleUrl={subtitleUrl}
        onFileDrop={handleFileDrop}
      />

      {/* --- 区域 B: 功能面板 (Content Panel) --- */}
      <MobileView
        activeTab={activeTab}
        onTabChange={setActiveTab}
        users={users}
        currentUser={currentUser}
        hostId={hostId}
        isHost={isHost}
        roomId={roomId || ''}
        cachedFileHandle={cachedFileHandle}
        fileObject={fileObject}
        videoUrl={videoUrl}
        p2p={p2p}
        isP2PVideo={isP2PVideo}
        setIsP2PVideo={setIsP2PVideo}
        pickFile={pickFile}
        showSaveFilePicker={showSaveFilePicker}
      />

      <DesktopSidebar
        isSidebarOpen={isSidebarOpen}
        roomId={roomId || ''}
        currentUser={currentUser}
        users={users}
        hostId={hostId}
        isHost={isHost}
        cachedFileHandle={cachedFileHandle}
        fileObject={fileObject}
        videoUrl={videoUrl}
        p2p={p2p}
        isP2PVideo={isP2PVideo}
        setIsP2PVideo={setIsP2PVideo}
        pickFile={pickFile}
        showSaveFilePicker={showSaveFilePicker}
        isEditingName={isEditingName}
        setIsEditingName={setIsEditingName}
        tempName={tempName}
        setTempName={setTempName}
        handleUpdateName={handleUpdateName}
        onUploadSubtitle={handleUploadSubtitle}
        subtitleName={subtitleName}
      />

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
