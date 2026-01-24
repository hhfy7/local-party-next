import { MobileTabs } from '@/components/MobileTabs'
import { ChatPanel } from '@/components/ChatPanel'
import { UserItem } from '@/components/UserItem'
import { RoomInfoPanel } from '@/components/RoomInfoPanel'
import toast from 'react-hot-toast'
import type { User } from '@local-party/shared/src/types'
import type { useP2PManager } from '@/hooks/useP2PManager'

interface MobileViewProps {
  activeTab: 'chat' | 'users' | 'info'
  onTabChange: (tab: 'chat' | 'users' | 'info') => void
  users: User[]
  currentUser: User | null
  hostId: string | null
  isHost: boolean
  roomId: string
  cachedFileHandle: FileSystemFileHandle | null
  fileObject: File | null
  videoUrl: string | null
  p2p: ReturnType<typeof useP2PManager>
  isP2PVideo: boolean
  setIsP2PVideo: (isP2P: boolean) => void
  pickFile: () => void
  showSaveFilePicker: (file: File) => void
}

export const MobileView = ({
  activeTab,
  onTabChange,
  users,
  currentUser,
  hostId,
  isHost,
  roomId,
  cachedFileHandle,
  fileObject,
  videoUrl,
  p2p,
  isP2PVideo,
  setIsP2PVideo,
  pickFile,
  showSaveFilePicker,
}: MobileViewProps) => {
  return (
    <div className="relative z-20 flex min-h-0 flex-1 flex-col bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] md:hidden">
      <div className="flex h-full flex-col">
        <MobileTabs activeTab={activeTab} onTabChange={onTabChange} />

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
                  amIHost={isHost}
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
    </div>
  )
}
