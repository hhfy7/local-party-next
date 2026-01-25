import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { SyncAction, HeartbeatPayload } from '@local-party/shared/src/types'
import { Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import {
  HEARTBEAT_INTERVAL,
  TIME_SYNC_TOLERANCE,
  REMOTE_ACTION_LOCK_DURATION,
  PAUSE_DEBOUNCE_DELAY,
  SEEK_DEBOUNCE_DELAY,
  SYNC_THRESHOLD_SECONDS,
  REMOTE_ACTION_UNLOCK_DELAY,
  INITIAL_SYNC_DELAY,
  SEEK_UNLOCK_DELAY,
  STATUS_CHECK_INTERVAL,
} from '@/utils/timingConstants'

export const useVideoSync = (
  socket: Socket | null,
  videoRef: RefObject<HTMLVideoElement | null>,
  lastAction: SyncAction | null,
  videoUrl: string | null,
  isHost: boolean,
  lastActionAt: number,
) => {
  const isRemoteAction = useRef(false)
  const hasSyncedInitialState = useRef(false)
  const pauseDebounceTimer = useRef<number | null>(null)
  const seekDebounceTimer = useRef<number | null>(null)
  const isSeekingRef = useRef(false)

  // 新增：手动暂停状态检测
  const [isManualPaused, setIsManualPaused] = useState(false)

  // 定期检测是否处于“主动掉队”状态 (房主 Play，我 Pause)
  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || isHost) return

    const checkStatus = () => {
      // 房主在放，我停了 -> 显示追赶按钮
      const isRoomPlaying = lastAction?.type === 'play'
      const isLocalPaused = videoEl.paused
      setIsManualPaused(isRoomPlaying && isLocalPaused)
    }

    const timer = setInterval(checkStatus, STATUS_CHECK_INTERVAL)
    videoEl.addEventListener('pause', checkStatus)
    videoEl.addEventListener('play', checkStatus)

    return () => {
      clearInterval(timer)
      videoEl.removeEventListener('pause', checkStatus)
      videoEl.removeEventListener('play', checkStatus)
    }
  }, [lastAction, isHost, videoRef])

  // 当视频文件变化时，重置初始同步状态
  useEffect(() => {
    hasSyncedInitialState.current = false
  }, [videoUrl])

  // --- 1. [Host] 房主心跳发送器 ---
  useEffect(() => {
    if (!socket || !isHost || !videoUrl) return

    const sendHeartbeat = () => {
      const video = videoRef.current
      if (!video || video.paused) return // 暂停时不发心跳，节省流量

      const payload: HeartbeatPayload = {
        timestamp: video.currentTime,
        paused: video.paused,
      }
      socket.emit('send_heartbeat', payload)
    }

    // 每 5 秒发送一次心跳
    const timer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    return () => clearInterval(timer)
  }, [socket, isHost, videoUrl, videoRef])

  // --- 2. [Guest] 监听心跳与同步指令 ---
  useEffect(() => {
    if (!socket) return

    // 处理常规指令 (Play/Pause/Seek)
    const handleReceiveSync = (action: SyncAction) => {
      const video = videoRef.current
      if (!video) return

      isRemoteAction.current = true

      // 时间同步
      if (
        Math.abs(video.currentTime - action.timestamp) > TIME_SYNC_TOLERANCE
      ) {
        video.currentTime = action.timestamp
      }

      // 状态同步
      if (action.type === 'play') {
        video.play().catch(err => console.warn('Play failed:', err))
      } else if (action.type === 'pause') {
        video.pause()
      }

      setTimeout(() => {
        isRemoteAction.current = false
      }, REMOTE_ACTION_LOCK_DURATION)
    }

    // 处理心跳 (自动微调)
    const handleHeartbeat = (payload: HeartbeatPayload) => {
      const video = videoRef.current
      if (!video || isHost) return // 房主忽略心跳

      // 策略：如果我暂停了，说明我可能在手动操作，忽略自动同步
      if (video.paused) return

      // 如果我也在播放，计算误差
      const diff = Math.abs(video.currentTime - payload.timestamp)

      // 误差 > 阈值 -> 强制拉回
      if (diff > SYNC_THRESHOLD_SECONDS) {
        console.log(
          `[AutoSync] Diff: ${diff.toFixed(2)}s. Syncing to ${payload.timestamp}`,
        )
        isRemoteAction.current = true
        video.currentTime = payload.timestamp

        // 绿色 Toast 提示
        toast.success('已自动同步房主进度', {
          id: 'auto-sync',
          duration: 2000,
          style: {
            background: '#ecfdf5', // green-50
            color: '#047857', // green-700
            border: '1px solid #a7f3d0', // green-200
            fontSize: '12px',
            fontWeight: 'bold',
          },
          icon: '🔄',
        })

        setTimeout(() => {
          isRemoteAction.current = false
        }, REMOTE_ACTION_UNLOCK_DELAY)
      }
    }

    socket.on('receive_sync', handleReceiveSync)
    socket.on('receive_heartbeat', handleHeartbeat)

    return () => {
      socket.off('receive_sync', handleReceiveSync)
      socket.off('receive_heartbeat', handleHeartbeat)
    }
  }, [socket, videoRef, isHost])

  // --- 3. 初始同步 (Handle Refresh/Join) ---
  const handleVideoLoaded = () => {
    const video = videoRef.current
    if (!video || !lastAction || hasSyncedInitialState.current) return

    console.log('[Initial Sync]', lastAction)
    hasSyncedInitialState.current = true
    isRemoteAction.current = true

    // 初始同步：加上时间补偿
    let targetTime = lastAction.timestamp
    if (lastAction.type === 'play') {
      const elapsed = (Date.now() - lastActionAt) / 1000
      // 防御性检查：如果计算出的 elapsed 极大（比如电脑休眠了），可能导致 targetTime 溢出
      // 但一般 lastActionAt 是 Date.now() 初始化，所以通常是准的
      targetTime += elapsed
    }

    // 防御：不要超过视频总时长
    if (video.duration && targetTime > video.duration) {
      targetTime = video.duration
    }

    video.currentTime = targetTime

    if (lastAction.type === 'play') {
      video.play().catch(e => {
        console.warn('Autoplay prevented:', e)
      })
    } else {
      video.pause()
    }

    setTimeout(() => {
      isRemoteAction.current = false
    }, INITIAL_SYNC_DELAY)
  }

  // --- 4. 发送指令 (Client -> Server) ---
  const sendSync = useCallback(
    (type: SyncAction['type']) => {
      const video = videoRef.current
      if (!video || !socket || isRemoteAction.current) return

      // 权限拦截 (Plan C: 允许本地操作，不发 socket)
      if (!isHost) return

      if (isSeekingRef.current && type !== 'seek') return

      socket.emit('send_sync', { type, timestamp: video.currentTime })
    },
    [socket, videoRef, isHost],
  )

  // 手动追赶 (保留给暂停状态的用户用)
  const triggerResync = useCallback(() => {
    const video = videoRef.current
    if (!video || !lastAction) return

    isRemoteAction.current = true

    let targetTime = lastAction.timestamp
    if (lastAction.type === 'play') {
      const elapsed = (Date.now() - lastActionAt) / 1000
      targetTime += elapsed
    }

    video.currentTime = targetTime
    if (lastAction.type === 'play') {
      video.play().catch(err => console.warn('Play failed:', err))
    } else {
      video.pause()
    }

    setTimeout(() => {
      isRemoteAction.current = false
    }, INITIAL_SYNC_DELAY)
    toast.success('已同步到房主进度')
  }, [lastAction, lastActionAt, videoRef])

  // --- 5. DOM 监听 ---
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onSeeking = () => {
      isSeekingRef.current = true
      // 如果触发了 seeking，说明之前的 pause 是由拖动进度条引起的，取消发送 pause 消息
      if (pauseDebounceTimer.current) {
        clearTimeout(pauseDebounceTimer.current)
        pauseDebounceTimer.current = null
      }
    }

    const onPlay = () => {
      // 播放时也清除可能的暂停防抖
      if (pauseDebounceTimer.current) {
        clearTimeout(pauseDebounceTimer.current)
        pauseDebounceTimer.current = null
      }
      sendSync('play')
    }

    const onPause = () => {
      // 防抖：延迟发送 pause，如果后续紧接着 seeking，则取消发送
      if (pauseDebounceTimer.current) clearTimeout(pauseDebounceTimer.current)

      pauseDebounceTimer.current = window.setTimeout(() => {
        // 再次检查 seeking 状态（双重保险）
        if (!isSeekingRef.current) {
          sendSync('pause')
        }
        pauseDebounceTimer.current = null
      }, PAUSE_DEBOUNCE_DELAY)
    }

    const onSeekedWithDebounce = () => {
      if (seekDebounceTimer.current) clearTimeout(seekDebounceTimer.current)
      seekDebounceTimer.current = window.setTimeout(() => {
        sendSync('seek')
        setTimeout(() => {
          isSeekingRef.current = false
        }, SEEK_UNLOCK_DELAY)
      }, SEEK_DEBOUNCE_DELAY)
    }

    video.addEventListener('seeking', onSeeking)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeekedWithDebounce)

    return () => {
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeekedWithDebounce)
      if (pauseDebounceTimer.current) clearTimeout(pauseDebounceTimer.current)
      if (seekDebounceTimer.current) clearTimeout(seekDebounceTimer.current)
    }
  }, [videoUrl, sendSync, videoRef])

  return { handleVideoLoaded, triggerResync, isManualPaused }
}
