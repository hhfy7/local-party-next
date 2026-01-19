import { copyToClipboard } from '@/utils/clipboard'
import { UserItem } from '@/components/UserItem'
import { ChatPanel } from '@/components/ChatPanel'
import { NameEditor } from './NameEditor'
import toast from 'react-hot-toast'
import type { User } from '@local-party/shared/src/types'
import type { useP2PManager } from '@/hooks/useP2PManager'

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
}: DesktopSidebarProps) => {
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
          <NameEditor
            currentUser={currentUser}
            isEditing={isEditingName}
            setIsEditing={setIsEditingName}
            tempName={tempName}
            setTempName={setTempName}
            onConfirm={handleUpdateName}
          />
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
            p2p.actions.openShareDialog(cachedFileHandle, fileObject, videoUrl)
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
  )
}
