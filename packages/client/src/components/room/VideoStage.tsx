import { forwardRef, useState, useRef } from 'react'
import { VideoPlayer } from '@/components/VideoPlayer'
import { VideoEmptyState } from '@/components/VideoEmptyState'
import toast from 'react-hot-toast'

interface VideoStageProps {
  videoUrl: string | null
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  isManualPaused: boolean
  triggerResync: () => void
  cachedFileHandle: FileSystemFileHandle | null
  onRestore: () => void
  onPick: () => void
  handleVideoLoaded: React.ReactEventHandler<HTMLVideoElement>
  handleDurationChange: (duration: number) => void
  subtitleUrl?: string | null
  onFileDrop?: (file: File) => void
}

export const VideoStage = forwardRef<HTMLVideoElement, VideoStageProps>(
  (
    {
      videoUrl,
      isSidebarOpen,
      onToggleSidebar,
      isManualPaused,
      triggerResync,
      cachedFileHandle,
      onRestore,
      onPick,
      handleVideoLoaded,
      handleDurationChange,
      subtitleUrl,
      onFileDrop,
    },
    ref,
  ) => {
    const leftPanelBg = videoUrl ? 'bg-black' : 'bg-transparent'

    // --- 拖拽交互逻辑 ---
    const [isDragging, setIsDragging] = useState(false)
    const dragCounter = useRef(0)

    const handleDragEnter = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current += 1
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current -= 1
      if (dragCounter.current === 0) {
        setIsDragging(false)
      }
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // 必须阻止默认行为才能触发 drop
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounter.current = 0

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0]
        onFileDrop?.(file)
        e.dataTransfer.clearData()
      }
    }

    const handleVideoError = () => {
      const video = ref && 'current' in ref ? ref.current : null
      const error = video?.error

      let msg = '视频播放出错'
      if (error) {
        switch (error.code) {
          case 3: // MEDIA_ERR_DECODE
            msg = '解码失败：浏览器不支持此视频编码 (如 H.265/ProRes)'
            break
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            msg = '格式不支持：浏览器无法播放此容器格式 (如 AVI/WMV)'
            break
          default:
            msg = `播放错误 (Code: ${error.code})`
        }
      }
      console.error('[VideoStage]', msg, error)
      toast.error(msg, { duration: 5000 })
    }

    return (
      <div
        className={`relative w-full shrink-0 transition-all duration-700 md:h-full md:flex-1 ${
          videoUrl ? 'h-[35vh]' : 'h-auto min-h-[35vh]'
        } ${leftPanelBg}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* --- 拖拽遮罩层 (Drop Overlay) --- */}
        <div
          className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-indigo-500/20 backdrop-blur-md transition-all duration-300 ${
            isDragging ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <div className="rounded-[2rem] border-4 border-dashed border-white/50 bg-white/20 p-12 text-center text-white shadow-2xl backdrop-blur-xl">
            <svg
              className="mx-auto mb-4 h-16 w-16 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 className="text-2xl font-bold tracking-tight">
              释放文件以上传
            </h3>
            <p className="mt-2 text-white/80">
              支持视频 (.mp4, .mkv) 或字幕 (.srt)
            </p>
          </div>
        </div>

        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={onToggleSidebar}
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
                onRestore={onRestore}
                onPick={onPick}
              />
            </div>
          ) : (
            <VideoPlayer
              ref={ref}
              src={videoUrl}
              className="animate-fade-in h-full w-full overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10 outline-none md:rounded-2xl"
              onLoadedMetadata={handleVideoLoaded}
              onDurationChange={handleDurationChange}
              subtitleUrl={subtitleUrl}
              onError={handleVideoError}
            />
          )}
        </div>
      </div>
    )
  },
)

VideoStage.displayName = 'VideoStage'
