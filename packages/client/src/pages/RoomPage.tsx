import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'
import { VideoPlayer } from '../components/VideoPlayer'
import { ChatPanel } from '../components/ChatPanel'
import { SyncAction } from '@local-party/shared/src/types'

// 直接访问时的“补票”模态框
const JoinModal = ({ roomId, onJoin }: { roomId: string, onJoin: (name: string) => void }) => {
  const [name, setName] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-fade-in-up">
        <h2 className="mb-6 text-2xl font-bold text-gray-900 text-center">加入房间: {roomId}</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">你的昵称</label>
            <input
              type="text"
              className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-gray-900 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-emerald-500"
              placeholder="请输入昵称"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <button
            onClick={() => name && onJoin(name)}
            disabled={!name}
            className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
          >
            加入聚会
          </button>
        </div>
      </div>
    </div>
  )
}

export const RoomPage = () => {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { users, currentUser, socket, connect } = useAppStore()
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  
  // 引用
  const videoRef = useRef<HTMLVideoElement>(null)
  const isRemoteAction = useRef(false)

  // 1. 确保 Socket 连接
  useEffect(() => {
    connect()
  }, [connect])

  // 2. 处理直接访问链接的情况
  const handleLateJoin = (username: string) => {
    if (!socket || !roomId) return
    
    socket.emit('join_room', {
      username,
      roomId,
      password: '',
      videoMeta: { duration: 0, fileSize: 0 }
    }, (res: { success: boolean; error?: string }) => {
       if (!res.success) {
         alert('加入失败: ' + (res.error || '未知错误'))
         // 如果房间不存在，跳回首页
         if (res.error === '房间不存在') {
           navigate('/')
         }
       }
    })
  }

  // 3. 视频同步逻辑 (保持不变)
  useEffect(() => {
    if (!socket) return

    const handleReceiveSync = (action: SyncAction) => {
      const video = videoRef.current
      if (!video) return

      // 系统日志会在 ChatPanel 里通过 receive_message (system type) 显示
      // 这里只负责操作视频

      isRemoteAction.current = true
      
      if (action.type === 'play') {
        // 计算时差补偿（可选优化）
        video.currentTime = action.timestamp
        video.play().catch(() => {})
      } else if (action.type === 'pause') {
        video.pause()
        video.currentTime = action.timestamp
      } else if (action.type === 'seek') {
        video.currentTime = action.timestamp
      }

      setTimeout(() => { isRemoteAction.current = false }, 300)
    }

    socket.on('receive_sync', handleReceiveSync)
    return () => { socket.off('receive_sync', handleReceiveSync) }
  }, [socket])

  // 4. 发送同步指令
  const sendSync = useCallback((type: SyncAction['type']) => {
    const video = videoRef.current
    if (!video || !socket || isRemoteAction.current) return

    const action: SyncAction = { type, timestamp: video.currentTime }
    socket.emit('send_sync', action)
  }, [socket])

  // 5. 文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
  }

  // 绑定事件
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

  // --- Render ---

  // 如果未加入（没有 currentUser），显示模态框
  if (!currentUser && roomId) {
    return <JoinModal roomId={roomId} onJoin={handleLateJoin} />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden md:flex-row">
      {/* 顶部/左侧: 视频区 */}
      <div className="flex-1 relative flex flex-col bg-black">
        {/* Header (Mobile Only) */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none md:hidden">
           <h1 className="text-white font-bold text-shadow">Room: {roomId}</h1>
        </div>

        {/* Video Container */}
        <div className="flex-1 flex items-center justify-center relative">
          {!videoUrl ? (
            <div className="text-center p-8">
              <div className="mb-6 mx-auto h-20 w-20 bg-gray-800 rounded-full flex items-center justify-center">
                 <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
              </div>
              <h2 className="text-white text-xl font-bold mb-2">选择本地视频</h2>
              <p className="text-gray-400 mb-6 max-w-sm">
                每个参与者都需要选择自己电脑上的同一个视频文件。
              </p>
              <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold transition">
                浏览文件
                <input type="file" accept="video/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          ) : (
             <VideoPlayer 
               ref={videoRef} 
               src={videoUrl} 
               className="w-full h-full"
             />
          )}
        </div>
      </div>

      {/* 右侧/底部: 聊天与用户列表 */}
      <div className="h-[40vh] md:h-full md:w-96 flex flex-col bg-white shadow-xl z-10 relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="font-bold text-gray-900">Room {roomId}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="flex h-2 w-2 relative">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               <span className="text-xs text-gray-500">{users.length} 人在线</span>
            </div>
          </div>
          <button 
             onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('链接已复制！')
             }}
             className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"
             title="复制链接"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
          </button>
        </div>

        {/* User List (Collapsed by default or small) */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex gap-2 overflow-x-auto">
           {users.map(u => (
             <div key={u.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-gray-200 shadow-sm shrink-0">
               <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
               <span className="text-xs font-medium text-gray-700">{u.username}</span>
             </div>
           ))}
        </div>

        {/* Chat */}
        <ChatPanel className="flex-1 min-h-0" />
      </div>
    </div>
  )
}
