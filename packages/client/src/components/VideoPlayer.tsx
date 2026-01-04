import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

interface VideoPlayerProps {
  src: string | null
  className?: string
  onDurationChange?: (duration: number) => void
}

// 使用 forwardRef 允许父组件控制 video 标签（为第四阶段同步做准备）
export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, className, onDurationChange }, ref) => {
    const internalRef = useRef<HTMLVideoElement>(null)

    // 暴露 ref 给父组件
    useImperativeHandle(ref, () => internalRef.current!)

    useEffect(() => {
      const video = internalRef.current
      if (!video) return

      const handleLoadedMetadata = () => {
        if (onDurationChange) {
          onDurationChange(video.duration)
        }
      }

      video.addEventListener('loadedmetadata', handleLoadedMetadata)
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      }
    }, [onDurationChange])

    if (!src) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black text-gray-500">
          等待选择视频...
        </div>
      )
    }

    return (
      <video
        ref={internalRef}
        src={src}
        className={`h-full w-full bg-black object-contain ${className}`}
        controls
        playsInline // iPad 关键配置: 禁止自动全屏
        webkit-playsinline="true" // iOS 兼容
        controlsList="nodownload" // 禁止下载按钮
      />
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'
