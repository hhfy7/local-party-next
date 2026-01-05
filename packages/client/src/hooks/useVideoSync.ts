import { RefObject, useCallback, useEffect, useRef } from 'react'
import { SyncAction } from '@local-party/shared/src/types'
import { Socket } from 'socket.io-client'

export const useVideoSync = (
  socket: Socket | null,
  videoRef: RefObject<HTMLVideoElement | null>,
  lastAction: SyncAction | null,
  videoUrl: string | null, // 视频 URL，用于侦测视频变化
) => {
  const isRemoteAction = useRef(false)
  const hasSyncedInitialState = useRef(false)
  const seekDebounceTimer = useRef<number | null>(null)

  // 当视频文件变化时，重置初始同步状态
  useEffect(() => {
    // videoUrl 变化意味着换了新文件，允许进行新的初始同步
    hasSyncedInitialState.current = false
  }, [videoUrl])

  // 监听后端同步指令
  useEffect(() => {
    if (!socket) return

    const handleReceiveSync = (action: SyncAction) => {
      const video = videoRef.current
      if (!video) return

      isRemoteAction.current = true

      if (Math.abs(video.currentTime - action.timestamp) > 0.5) {
        video.currentTime = action.timestamp
      }

      if (action.type === 'play') video.play().catch(() => {})
      else if (action.type === 'pause') video.pause()

      setTimeout(() => {
        isRemoteAction.current = false
      }, 1200)
    }

    socket.on('receive_sync', handleReceiveSync)
    return () => {
      socket.off('receive_sync', handleReceiveSync)
    }
  }, [socket, videoRef])

  // 处理文件加载后的初始同步
  const handleVideoLoaded = () => {
    // 上报状态 (视频时长检查)
    const video = videoRef.current
    if (video && socket) {
      // 从 URL 获取文件名 (这里用 cachedFileHandle?.name 或 'Local File' 模拟，实际上 VideoPlayer 没传文件名进来)
      // 我们需要想个办法拿到文件名。
      // 简单做法：从 DOM video.src 或者让 RoomPage 传进来。
      // 这里先只传 duration，文件名由 RoomPage 处理
    }

    // ... (rest of the sync logic)
    if (!video || !lastAction || hasSyncedInitialState.current) return

    console.log('[Initial Sync]', lastAction)
    hasSyncedInitialState.current = true
    isRemoteAction.current = true

    video.currentTime = lastAction.timestamp
    if (lastAction.type === 'play') video.play().catch(() => {})
    else video.pause()

    setTimeout(() => {
      isRemoteAction.current = false
    }, 1000)
  }

  // 发送指令
  const sendSync = useCallback(
    (type: SyncAction['type']) => {
      const video = videoRef.current
      if (!video || !socket || isRemoteAction.current) return
      socket.emit('send_sync', { type, timestamp: video.currentTime })
    },
    [socket, videoRef],
  )

  // 绑定事件监听 (包含防抖)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => sendSync('play')
    const onPause = () => sendSync('pause')
    const onSeeked = () => {
      if (seekDebounceTimer.current) clearTimeout(seekDebounceTimer.current)
      seekDebounceTimer.current = window.setTimeout(() => sendSync('seek'), 600)
    }

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeeked)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeeked)
      if (seekDebounceTimer.current) clearTimeout(seekDebounceTimer.current)
    }
  }, [videoUrl, sendSync, videoRef]) // 当 videoUrl 变化时，重新绑定事件

  return { handleVideoLoaded }
}
