import {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react'

interface VideoPlayerProps extends Omit<
  React.VideoHTMLAttributes<HTMLVideoElement>,
  'src' | 'onDurationChange'
> {
  src: string | null

  className?: string

  onDurationChange?: (duration: number) => void

  onVideoClick?: () => void
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, className, onDurationChange, onVideoClick, ...props }, ref) => {
    const internalRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isIdle, setIsIdle] = useState(false)
    // 记录点击反馈的状态: 'play' | 'pause' | null
    const [feedbackIcon, setFeedbackIcon] = useState<'play' | 'pause' | null>(
      null,
    )

    const idleTimer = useRef<number | null>(null)
    const feedbackTimer = useRef<number | null>(null)

    useImperativeHandle(ref, () => internalRef.current!)

    useEffect(() => {
      const video = internalRef.current
      if (!video) return
      const handleLoadedMetadata = () => {
        if (onDurationChange) onDurationChange(video.duration)
      }
      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () =>
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }, [onDurationChange])

    // 沉浸式鼠标隐藏
    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const resetIdleTimer = () => {
        setIsIdle(false)
        if (idleTimer.current) clearTimeout(idleTimer.current)
        idleTimer.current = setTimeout(() => {
          if (internalRef.current && !internalRef.current.paused)
            setIsIdle(true)
        }, 3000)
      }
      const handleMouseMove = () => resetIdleTimer()
      container.addEventListener('mousemove', handleMouseMove)
      resetIdleTimer()
      return () => {
        container.removeEventListener('mousemove', handleMouseMove)
        if (idleTimer.current) clearTimeout(idleTimer.current)
      }
    }, [src])

    // 点击反馈逻辑
    const triggerFeedback = (type: 'play' | 'pause') => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      setFeedbackIcon(type)
      // 动画结束后重置 (动画时长 600ms)
      feedbackTimer.current = setTimeout(() => setFeedbackIcon(null), 600)
    }

    const handleOverlayClick = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation()
      const video = internalRef.current
      if (video) {
        if (video.paused) {
          video.play().catch(() => {})
          triggerFeedback('play')
        } else {
          video.pause()
          triggerFeedback('pause')
        }
      }
      if (onVideoClick) onVideoClick()
    }

    if (!src) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black text-gray-500">
          等待选择视频...
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={`relative h-full w-full bg-black transition-all ${isIdle ? 'cursor-none' : ''}`}
      >
        <video
          ref={internalRef}
          src={src}
          className={`h-full w-full object-contain ${className}`}
          controls
          playsInline
          webkit-playsinline="true"
          controlsList="nodownload"
          {...props}
        />

        {/* 透明遮罩层 */}
        <div
          className="absolute top-0 right-0 left-0 z-10 flex h-[85%] cursor-pointer items-center justify-center"
          onClick={handleOverlayClick}
        >
          {/* 点击反馈图标 (绝对居中) */}
          {feedbackIcon && (
            <div className="animate-video-ping pointer-events-none absolute z-20 rounded-full bg-black/40 p-6 text-white backdrop-blur-sm">
              {feedbackIcon === 'play' ? (
                <svg className="h-12 w-12 fill-white" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="h-12 w-12 fill-white" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
)

VideoPlayer.displayName = 'VideoPlayer'
