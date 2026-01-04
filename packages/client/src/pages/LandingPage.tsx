import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/useAppStore'

export const LandingPage = () => {
  const navigate = useNavigate()
  const { connect, socket, connected, roomId } = useAppStore()
  
  // 视图状态: 'menu' (初始菜单) | 'create' (创建表单) | 'join' (加入表单)
  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu')
  
  // 表单数据
  const [username, setUsername] = useState('')
  const [roomName, setRoomName] = useState('')
  const [targetRoomId, setTargetRoomId] = useState('')
  const [password, setPassword] = useState('')

  // 初始化连接
  useEffect(() => {
    connect()
  }, [connect])

  // 监听加入成功跳转
  useEffect(() => {
    if (roomId) {
      navigate(`/room/${roomId}`)
    }
  }, [roomId, navigate])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !username) return alert('请输入昵称')
    
    // Mock VideoMeta (Phase 3 会替换为真实文件数据)
    const mockMeta = { duration: 0, fileSize: 0 }

    socket.emit('create_room', {
      username,
      roomName: roomName || `${username}的房间`,
      password,
      videoMeta: mockMeta
    })
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !username || !targetRoomId) return alert('请填写完整信息')
    
    const mockMeta = { duration: 0, fileSize: 0 }

    socket.emit('join_room', {
      username,
      roomId: targetRoomId,
      password,
      videoMeta: mockMeta
    })
  }

  // --- UI 组件 ---

  // 1. 初始菜单视图
  const Menu = () => (
    <div className="flex w-full max-w-4xl flex-col items-center gap-8 md:flex-row md:justify-center">
      <button
        onClick={() => setView('create')}
        className="group flex h-64 w-64 flex-col items-center justify-center gap-4 rounded-2xl bg-white p-6 shadow-lg transition-all hover:-translate-y-2 hover:shadow-xl border border-gray-100"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">创建房间</h3>
          <p className="mt-2 text-sm text-gray-500">新建一个放映室并邀请朋友</p>
        </div>
      </button>

      <button
        onClick={() => setView('join')}
        className="group flex h-64 w-64 flex-col items-center justify-center gap-4 rounded-2xl bg-white p-6 shadow-lg transition-all hover:-translate-y-2 hover:shadow-xl border border-gray-100"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-800">加入房间</h3>
          <p className="mt-2 text-sm text-gray-500">输入房间号加入现有聚会</p>
        </div>
      </button>
    </div>
  )

  // 2. 创建房间表单
  const CreateForm = () => (
    <form onSubmit={handleCreate} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800">创建新房间</h2>
        <p className="text-gray-500">设置好你的昵称和房间信息</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">你的昵称</label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
            placeholder="例如: Jack"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">房间名称 (可选)</label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
            placeholder="默认: [昵称]的房间"
            value={roomName}
            onChange={e => setRoomName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">房间密码 (可选)</label>
          <input
            type="password"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
            placeholder="留空则无密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => setView('menu')}
          className="flex-1 rounded-lg border border-gray-300 py-3 font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          返回
        </button>
        <button
          type="submit"
          disabled={!connected}
          className="flex-[2] rounded-lg bg-indigo-600 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-50"
        >
          立即创建
        </button>
      </div>
    </form>
  )

  // 3. 加入房间表单
  const JoinForm = () => (
    <form onSubmit={handleJoin} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-gray-100">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800">加入房间</h2>
        <p className="text-gray-500">输入 5 位房间代码</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">你的昵称</label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="例如: Rose"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">房间代码</label>
          <input
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-center text-2xl font-mono tracking-widest text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            placeholder="ABCDE"
            value={targetRoomId}
            onChange={e => setTargetRoomId(e.target.value.toUpperCase())}
            maxLength={5}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">房间密码 (可选)</label>
          <input
            type="password"
            className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => setView('menu')}
          className="flex-1 rounded-lg border border-gray-300 py-3 font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          返回
        </button>
        <button
          type="submit"
          disabled={!connected}
          className="flex-[2] rounded-lg bg-emerald-600 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
        >
          加入房间
        </button>
      </div>
    </form>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg">
           <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
             <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
             <path d="M10 8v8l6-4-6-4z" fill="white" />
           </svg>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Local Party</h1>
        <p className="mt-2 text-lg text-gray-500">异地同屏，共享本地高清画质</p>
      </div>

      <div className="w-full flex justify-center transition-all duration-300">
        {view === 'menu' && <Menu />}
        {view === 'create' && <CreateForm />}
        {view === 'join' && <JoinForm />}
      </div>

      {/* Footer / Status */}
      <div className="fixed bottom-6 text-sm text-gray-400">
        Status: {connected ? <span className="text-emerald-500 font-medium">● Connected</span> : <span className="text-rose-500 font-medium">● Disconnected</span>}
      </div>
    </div>
  )
}
