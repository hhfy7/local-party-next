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
  const isSeekingRef = useRef(false) // 新增：正在跳转的锁

  // 当视频文件变化时，重置初始同步状态
  useEffect(() => {
    hasSyncedInitialState.current = false
  }, [videoUrl])

  // 1. 监听后端同步指令
  useEffect(() => {
    if (!socket) return

    const handleReceiveSync = (action: SyncAction) => {
      const video = videoRef.current
      if (!video) return

      // 标记为远程操作，防止触发 sendSync
      isRemoteAction.current = true

      // 时间同步：只有当误差 > 0.5s 时才强制校准，避免卡顿
      if (Math.abs(video.currentTime - action.timestamp) > 0.5) {
        video.currentTime = action.timestamp
      }

      // 状态同步
      if (action.type === 'play') {
        video.play().catch(() => {})
      } else if (action.type === 'pause') {
        video.pause()
      }
      // seek 只需要设置 currentTime，上面已经处理了

      // 1.2s 后释放锁 (给予足够的时间让 seek/play 完成)
      setTimeout(() => {
        isRemoteAction.current = false
      }, 1200)
    }

    socket.on('receive_sync', handleReceiveSync)
    return () => {
      socket.off('receive_sync', handleReceiveSync)
    }
  }, [socket, videoRef])

  // 2. 处理文件加载后的初始同步
  const handleVideoLoaded = () => {
    const video = videoRef.current
    
    // 如果没有视频、没有初始状态，或者已经同步过了，直接跳过
    if (!video || !lastAction || hasSyncedInitialState.current) return

    console.log('[Initial Sync]', lastAction)
    hasSyncedInitialState.current = true
    isRemoteAction.current = true // 初始同步也算是远程操作

    // 强制同步到房间当前状态
    video.currentTime = lastAction.timestamp
    if (lastAction.type === 'play') {
      video.play().catch(e => {
        console.warn('Autoplay prevented:', e)
        // 自动播放失败是正常的，通常需要用户交互
      })
    } else {
      video.pause()
    }

    setTimeout(() => {
      isRemoteAction.current = false
    }, 1000)
  }

  // 3. 发送指令 (核心逻辑)
  const sendSync = useCallback(
    (type: SyncAction['type']) => {
      const video = videoRef.current
      
      // 卫语句：
      // 1. 视频未加载
      // 2. Socket 未连接
      // 3. 正在响应远程指令 (避免死循环)
      if (!video || !socket || isRemoteAction.current) return
      
      // 4. [新增] 正在跳转中 (抑制中间的 play/pause)
      // 如果是 seeking 状态下触发了 play/pause，忽略之
      if (isSeekingRef.current && type !== 'seek') return

      socket.emit('send_sync', { type, timestamp: video.currentTime })
    },
    [socket, videoRef],
  )

  // 4. 绑定 DOM 事件监听
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onSeeking = () => {
      isSeekingRef.current = true
    }

    const onPlay = () => sendSync('play')
    const onPause = () => sendSync('pause')
    
    const onSeeked = () => {
      // 防抖：只有当用户停止拖动（不再频繁触发 seeked）后才发送
      if (seekDebounceTimer.current) {
        clearTimeout(seekDebounceTimer.current)
      }
      
      seekDebounceTimer.current = window.setTimeout(() => {
        // Seek 结束，发送状态
        sendSync('seek')
        
        // 发送后延迟释放锁，防止后续自动触发的 play/pause
        setTimeout(() => {
          isSeekingRef.current = false
        }, 500)
      }, 600) // 600ms 防抖，确保是“松手”后的最后一次
    }

    video.addEventListener('seeking', onSeeking)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeeked)

    return () => {
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeeked)
      if (seekDebounceTimer.current) clearTimeout(seekDebounceTimer.current)
    }
  }, [videoUrl, sendSync, videoRef]) // 当 videoUrl 变化时重新绑定

  return { handleVideoLoaded }
}