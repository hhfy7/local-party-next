import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { VideoPlayer } from '../components/VideoPlayer'
import { SyncAction } from '@local-party/shared/src/types'

export const RoomPage = () => {
  const { roomId } = useParams()
  const { users, currentUser, socket } = useAppStore()
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const videoRef = useRef<HTMLVideoElement>(null)
  // 关键：标记当前变动是否来自远端，防止死循环
  const isRemoteAction = useRef(false)

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  // --- 处理来自远端的同步指令 ---
  useEffect(() => {
    if (!socket) return

    const handleReceiveSync = (action: SyncAction, fromUser: string) => {
      const video = videoRef.current
      if (!video) return

      console.log(`收到来自 ${fromUser} 的同步指令:`, action)
      
      // 标记：接下来的变动是远端的，不要再发出去
      isRemoteAction.current = true

      if (action.type === 'play') {
        video.currentTime = action.timestamp
        video.play().catch(e => console.warn('自动播放受阻:', e))
      } else if (action.type === 'pause') {
        video.pause()
        video.currentTime = action.timestamp
      } else if (action.type === 'seek') {
        video.currentTime = action.timestamp
      }

      // 短暂延迟后恢复标志位 (等待原生事件触发完毕)
      setTimeout(() => {
        isRemoteAction.current = false
      }, 200)
    }

    socket.on('receive_sync', handleReceiveSync)
    return () => {
      socket.off('receive_sync')
    }
  }, [socket])

  // --- 发送本地同步指令到远端 ---
  const sendSync = useCallback((type: SyncAction['type']) => {
    const video = videoRef.current
    if (!video || !socket || isRemoteAction.current) return

    const action: SyncAction = {
      type,
      timestamp: video.currentTime
    }
    
    console.log('发送同步指令到远端:', action)
    socket.emit('send_sync', action)
  }, [socket])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
    
    // 告知后端视频信息（Phase 4.3 弱校验）
    if (socket) {
        // 这里简化了，实际应该在 join_room 时就发，但目前由于文件是后选的，我们在选完后再发一次或在业务逻辑中处理
    }
  }

  // 绑定原生视频事件
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlay = () => sendSync('play')
    const onPause = () => sendSync('pause')
    const onSeeked = () => sendSync('seek')

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeked', onSeeked)

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeked', onSeeked)
    }
  }, [videoUrl, sendSync])

  return (
    <div className="flex min-h-screen flex-col bg-black text-white md:flex-row">
      <div className="relative flex flex-1 flex-col justify-center bg-gray-900 p-2 md:h-screen">
        {!videoUrl && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/90 p-4">
            <div className="rounded-lg bg-gray-800 p-8 text-center shadow-xl">
              <h2 className="mb-4 text-xl font-bold text-indigo-400">选择本地视频</h2>
              <label className="cursor-pointer rounded bg-indigo-600 px-6 py-3 font-bold hover:bg-indigo-700">
                点击选择文件
                <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>
        )}

        <div className="aspect-video w-full max-h-screen">
            <VideoPlayer 
                ref={videoRef} 
                src={videoUrl} 
                onDurationChange={(d) => setDebugInfo(`时长: ${d.toFixed(2)}s`)}
            />
        </div>

        {videoUrl && (
           <div className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1 text-xs text-green-400">
              [SYNC ACTIVE] {debugInfo}
           </div>
        )}
      </div>

      <div className="flex w-full flex-col border-l border-gray-800 bg-gray-900 md:w-80 md:h-screen">
        <div className="border-b border-gray-800 p-4">
          <h1 className="text-lg font-bold">房间: {roomId}</h1>
          <p className="text-xs text-gray-500">同步引擎: 运行中</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-2 text-xs font-semibold text-gray-500 uppercase">Users</h2>
          <ul className="space-y-2">
            {users.map(u => (
              <li key={u.id} className="flex items-center space-x-2 rounded bg-gray-800 p-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${u.id === currentUser?.id ? 'bg-indigo-500' : 'bg-green-500'}`}></div>
                <span className="truncate">{u.username}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="border-t border-gray-800 p-4">
           <div className="text-center text-xs text-gray-600">
             Chat Panel (Phase 5)
           </div>
        </div>
      </div>
    </div>
  )
}