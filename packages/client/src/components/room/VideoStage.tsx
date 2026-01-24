import { forwardRef } from 'react'
import { VideoPlayer } from '@/components/VideoPlayer'
import { VideoEmptyState } from '@/components/VideoEmptyState'

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
    },
    ref,
  ) => {
    const leftPanelBg = videoUrl ? 'bg-black' : 'bg-transparent'

    return (
      <div
        className={`relative w-full shrink-0 transition-all duration-700 md:h-full md:flex-1 ${
          videoUrl ? 'h-[35vh]' : 'h-auto min-h-[35vh]'
        } ${leftPanelBg}`}
      >
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
            />
          )}
        </div>
      </div>
    )
  },
)

VideoStage.displayName = 'VideoStage'
