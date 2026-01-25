import { copyToClipboard } from '@/utils/clipboard'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { TransferStatusPanel } from '@/components/transfer/TransferStatusPanel'
import { SidebarHeader } from './SidebarHeader'
import { UserList } from './UserList'
import { VideoActions } from './VideoActions'
import toast from 'react-hot-toast'
import type { User } from '@local-party/shared/src/types'
import type { useP2PManager } from '@/hooks/useP2PManager'
import { useAppStore } from '@/stores/useAppStore'

interface DesktopSidebarProps {
  isSidebarOpen: boolean
  roomId: string
  currentUser: User | null
  users: User[]
  hostId: string | null
  isHost: boolean
  cachedFileHandle: FileSystemFileHandle | null
  fileObject: File | null
  videoUrl: string | null
  p2p: ReturnType<typeof useP2PManager>
  isP2PVideo: boolean
  setIsP2PVideo: (isP2P: boolean) => void
  pickFile: () => void
  showSaveFilePicker: (file: File) => void
  // Name Editor Props
  isEditingName: boolean
  setIsEditingName: (v: boolean) => void
  tempName: string
  setTempName: (v: string) => void
  handleUpdateName: () => void
  // Subtitle Props
  onUploadSubtitle?: (file: File) => void
  subtitleName?: string | null
}

export const DesktopSidebar = ({
  isSidebarOpen,
  roomId,
  currentUser,
  users,
  hostId,
  isHost,
  cachedFileHandle,
  fileObject,
  videoUrl,
  p2p,
  isP2PVideo,
  setIsP2PVideo,
  pickFile,
  showSaveFilePicker,
  isEditingName,
  setIsEditingName,
  tempName,
  setTempName,
  handleUpdateName,
  onUploadSubtitle,
  subtitleName,
}: DesktopSidebarProps) => {
  const { socket } = useAppStore()

  const handleCopyLink = () => {
    if (!socket || !roomId) {
      void copyToClipboard(window.location.href)
      toast.success('已复制房间链接', { icon: '🔗' })
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
        } else if (res.error === '房间无密码') {
          void copyToClipboard(window.location.href)
          toast.success('已复制房间链接', { icon: '🔗' })
        } else {
          void copyToClipboard(window.location.href)
          if (res.error === '无权操作') {
            toast.error('您不在房间内')
          } else {
            toast.success('已复制房间链接', { icon: '🔗' })
          }
        }
      },
    )
  }

  return (
    <div
      className={`relative z-20 hidden flex-col bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 md:flex md:shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] ${
        isSidebarOpen
          ? 'md:w-80 md:flex-none md:translate-x-0 md:opacity-100'
          : 'md:w-0 md:flex-none md:translate-x-20 md:overflow-hidden md:opacity-0'
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <SidebarHeader
          roomId={roomId}
          currentUser={currentUser}
          isEditingName={isEditingName}
          setIsEditingName={setIsEditingName}
          tempName={tempName}
          setTempName={setTempName}
          handleUpdateName={handleUpdateName}
          onCopyLink={handleCopyLink}
        />

        {/* User List (Horizontal) */}
        <UserList
          users={users}
          currentUser={currentUser}
          hostId={hostId}
          isHost={isHost}
        />

        <TransferStatusPanel p2p={p2p} />

        {/* Chat */}
        <ChatPanel
          className="min-h-0 flex-1"
          isHost={isHost}
          hasFile={!!cachedFileHandle || !!fileObject}
          onShareClick={() =>
            p2p.actions.openShareDialog(cachedFileHandle, fileObject, videoUrl)
          }
        />

        {/* Change Video Button */}
        <VideoActions
          isHost={isHost}
          videoUrl={videoUrl}
          isP2PVideo={isP2PVideo}
          subtitleName={subtitleName}
          onUploadSubtitle={onUploadSubtitle}
          p2p={p2p}
          showSaveFilePicker={showSaveFilePicker}
          pickFile={pickFile}
          setIsP2PVideo={setIsP2PVideo}
        />
      </div>
    </div>
  )
}
