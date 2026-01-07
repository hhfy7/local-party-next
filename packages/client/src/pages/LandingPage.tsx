import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { getLastRoom, clearLastRoom, saveLastRoom } from '@/utils/storage'
import toast from 'react-hot-toast'

// 图标组件
const IconCreate = () => (
  <svg
    className="h-12 w-12 text-indigo-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
)

const IconJoin = () => (
  <svg
    className="h-12 w-12 text-emerald-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
    />
  </svg>
)

const IconBack = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
)

const IconRejoin = () => (
  <svg
    className="h-8 w-8 text-sky-600"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
    />
  </svg>
)

export const LandingPage = () => {
  const navigate = useNavigate()
  const { connect, socket, connected } = useAppStore()

  const [view, setView] = useState<'menu' | 'create' | 'join'>('menu')
  const [lastRoom, setLastRoom] = useState(() => getLastRoom())

  // 表单状态
  const [username, setUsername] = useState('')
  const [roomName, setRoomName] = useState('')
  const [targetRoomId, setTargetRoomId] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    connect()
  }, [connect])

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !username) return toast.error('请输入昵称')

    const mockMeta = { duration: 0, fileSize: 0 }

    socket.emit(
      'create_room',
      {
        username,
        roomName: roomName || `${username}的房间`,
        password,
        videoMeta: mockMeta,
      },
      (res: { success: boolean; roomId?: string; error?: string }) => {
        if (res.success && res.roomId) {
          saveLastRoom(res.roomId)
          toast.success('房间创建成功！')
          navigate(`/room/${res.roomId}`)
        } else {
          toast.error('创建失败: ' + (res.error || '未知错误'))
        }
      },
    )
  }

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!socket || !username || !targetRoomId)
      return toast.error('请填写完整信息')

    const mockMeta = { duration: 0, fileSize: 0 }

    socket.emit(
      'join_room',
      {
        username,
        roomId: targetRoomId,
        password,
        videoMeta: mockMeta,
      },
      (res: { success: boolean; roomId?: string; error?: string }) => {
        if (res.success && res.roomId) {
          saveLastRoom(res.roomId)
          toast.success('加入成功！')
          navigate(`/room/${res.roomId}`)
        } else {
          toast.error('加入失败: ' + (res.error || '未知错误'))
        }
      },
    )
  }

  const handleForget = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearLastRoom()
    setLastRoom(null)
    toast.success('已清除历史记录', { icon: '🧹' })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-gray-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* 顶部标题区 */}
      <div
        className={`mb-12 text-center transition-all duration-500 ${view === 'menu' ? 'translate-y-0 opacity-100' : 'hidden -translate-y-4 opacity-0'}`}
      >
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-xl shadow-indigo-100/50">
          <svg
            className="h-10 w-10 text-indigo-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            <path d="M10 8v8l6-4-6-4z" fill="white" />
          </svg>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
          Local Party
        </h1>
        <p className="mt-4 text-lg text-gray-500">异地同屏，共享本地高清画质</p>
      </div>

      {/* 主容器 */}
      <div className="relative w-full max-w-4xl">
        {/* 1. 菜单视图 */}
        {view === 'menu' && (
          <div className="flex flex-col items-center justify-center gap-6">
            {/* --- 新增：回到上次房间按钮 --- */}
            {lastRoom && (
              <div className="animate-fade-in-up mb-4 w-full max-w-sm md:w-80">
                <button
                  onClick={() => navigate(`/room/${lastRoom}`)}
                  className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl bg-white p-4 shadow-lg ring-1 ring-sky-100 transition-all hover:scale-105 hover:bg-sky-50 hover:shadow-sky-100"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-600 group-hover:bg-sky-200 group-hover:text-sky-700">
                      <IconRejoin />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold tracking-wider text-sky-600/70 uppercase">
                        Continue
                      </p>
                      <p className="text-lg font-bold text-gray-900">
                        回到房间 {lastRoom}
                      </p>
                    </div>
                  </div>

                  {/* 忘记/清除按钮 */}
                  <div
                    onClick={handleForget}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-gray-200 hover:text-gray-500"
                    title="忘记此房间"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </button>
              </div>
            )}

            <div className="flex flex-col gap-6 md:flex-row">
              <button
                onClick={() => setView('create')}
                className="group relative flex h-72 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-100 md:w-80"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 transition-transform duration-300 group-hover:scale-110">
                  <IconCreate />
                </div>
                <h3 className="relative mt-8 text-2xl font-bold text-gray-900">
                  创建房间
                </h3>
                <p className="relative mt-2 text-center text-sm leading-relaxed text-gray-500">
                  新建一个放映室
                  <br />
                  生成邀请链接
                </p>
              </button>

              <button
                onClick={() => setView('join')}
                className="group relative flex h-72 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-100 md:w-80"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 transition-transform duration-300 group-hover:scale-110">
                  <IconJoin />
                </div>
                <h3 className="relative mt-8 text-2xl font-bold text-gray-900">
                  加入房间
                </h3>
                <p className="relative mt-2 text-center text-sm leading-relaxed text-gray-500">
                  输入房间代码
                  <br />
                  加入朋友的聚会
                </p>
              </button>
            </div>
          </div>
        )}

        {/* 2. 创建房间表单 */}
        {view === 'create' && (
          <div className="animate-fade-in-up mx-auto max-w-md">
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={() => setView('menu')}
                className="rounded-full bg-white p-2 text-gray-400 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <IconBack />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">创建新房间</h2>
            </div>

            <form
              onSubmit={handleCreate}
              className="rounded-[2.5rem] bg-white p-10 shadow-2xl ring-1 shadow-gray-200/50 ring-gray-100"
            >
              <div className="space-y-6">
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
                    你的昵称
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    className="w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    placeholder="例如: Jack"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
                    房间名称{' '}
                    <span className="ml-1 font-normal text-gray-400">
                      (可选)
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    className="w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    placeholder={`默认: ${username ? username : '我'}的房间`}
                    value={roomName}
                    onChange={e => setRoomName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
                    房间密码{' '}
                    <span className="ml-1 font-normal text-gray-400">
                      (可选)
                    </span>
                  </label>
                  <input
                    type="password"
                    maxLength={20}
                    className="w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-10">
                <button
                  type="submit"
                  disabled={!connected}
                  className="w-full rounded-2xl bg-indigo-600 py-4.5 text-lg font-bold text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-300 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  立即创建
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. 加入房间表单 */}
        {view === 'join' && (
          <div className="animate-fade-in-up mx-auto max-w-md">
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={() => setView('menu')}
                className="rounded-full bg-white p-2 text-gray-400 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <IconBack />
              </button>
              <h2 className="text-2xl font-bold text-gray-900">加入房间</h2>
            </div>

            <form
              onSubmit={handleJoin}
              className="rounded-[2.5rem] bg-white p-10 shadow-2xl ring-1 shadow-gray-200/50 ring-gray-100"
            >
              <div className="space-y-6">
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
                    你的昵称
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    className="w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    placeholder="例如: Rose"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
                    房间代码
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    className="w-full rounded-2xl border-0 bg-gray-50 px-5 py-5 text-center font-mono text-3xl font-black tracking-[0.2em] text-emerald-600 uppercase shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    placeholder="输入5位代码"
                    value={targetRoomId}
                    onChange={e =>
                      setTargetRoomId(e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
                    房间密码{' '}
                    <span className="ml-1 font-normal text-gray-400">
                      (可选)
                    </span>
                  </label>
                  <input
                    type="password"
                    maxLength={20}
                    className="w-full rounded-2xl border-0 bg-gray-50 px-5 py-4 text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-10">
                <button
                  type="submit"
                  disabled={!connected}
                  className="w-full rounded-2xl bg-emerald-600 py-4.5 text-lg font-bold text-white shadow-xl shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-emerald-300 active:translate-y-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
                >
                  加入房间
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 底部状态 */}
      <div className="fixed bottom-8 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-gray-500 shadow-sm ring-1 ring-gray-100">
        <div
          className={`h-2 w-2 animate-pulse rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`}
        ></div>
        {connected ? '服务器已就绪' : '正在连接服务器...'}
      </div>
    </div>
  )
}
