import toast from 'react-hot-toast'

interface VideoActionsProps {
  isHost: boolean
  videoUrl: string | null
  isP2PVideo: boolean
  subtitleName?: string | null
  onUploadSubtitle?: (file: File) => void
  p2p: {
    actions: {
      getReceivedFile: () => File | null
    }
  }
  showSaveFilePicker: (file: File) => void
  pickFile: () => void
  setIsP2PVideo: (isP2P: boolean) => void
}

export const VideoActions = ({
  isHost,
  videoUrl,
  isP2PVideo,
  subtitleName,
  onUploadSubtitle,
  p2p,
  showSaveFilePicker,
  pickFile,
  setIsP2PVideo,
}: VideoActionsProps) => {
  if (!videoUrl) return null

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 bg-white p-4 pb-6">
      {/* Subtitle Section (Host Only) */}
      {isHost && onUploadSubtitle && (
        <label className="group flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-2.5 text-xs font-medium text-gray-500 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
          <input
            type="file"
            accept=".srt,.vtt"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) {
                onUploadSubtitle(file)
              }
              setTimeout(() => {
                const input = e.target as HTMLInputElement
                input.value = ''
              }, 0)
            }}
            onClick={e => {
              setTimeout(() => {
                const input = e.currentTarget as HTMLInputElement
                input.value = ''
              }, 0)
            }}
          />
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
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
          {subtitleName ? (
            <span className="max-w-[180px] truncate">{subtitleName}</span>
          ) : (
            '上传字幕 (CC)'
          )}
        </label>
      )}

      <div className="flex justify-center gap-3">
        {/* P2P Video Export Button (Persistent) */}
        {isP2PVideo && (
          <button
            onClick={() => {
              const file = p2p.actions.getReceivedFile()
              if (file) showSaveFilePicker(file)
              else toast.error('文件已失效')
            }}
            className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-100 active:scale-95"
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
            setIsP2PVideo(false)
          }}
          className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-bold text-gray-500 transition-all hover:bg-indigo-50 hover:text-indigo-600"
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
          更换视频
        </button>
      </div>
    </div>
  )
}
