import { useState } from 'react'
import { getNickname } from '@/utils/storage'

interface JoinModalProps {
  roomId: string
  onJoin: (name: string) => void
}

export const JoinModal = ({ roomId, onJoin }: JoinModalProps) => {
  const [name, setName] = useState(getNickname() || '')
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
      <div className="animate-pop-in w-full max-w-md transform rounded-[2.5rem] bg-white p-12 shadow-2xl ring-1 ring-gray-900/5 transition-all">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
            <svg
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            加入房间 <span className="font-mono text-indigo-600">{roomId}</span>
          </h2>
          <p className="mt-3 text-base text-gray-500">
            设置一个昵称，开始与朋友同步观影
          </p>
        </div>
        <div className="space-y-8">
          <div>
            <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
              你的昵称
            </label>
            <input
              type="text"
              maxLength={12}
              className="w-full rounded-2xl border-0 bg-gray-50 px-6 py-4.5 text-lg font-bold text-gray-900 ring-1 ring-gray-200 transition-all placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600 shadow-sm outline-none"
              placeholder="例如: Jack"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && name && onJoin(name)}
            />
          </div>
          <button
            onClick={() => name && onJoin(name)}
            disabled={!name}
            className="w-full rounded-2xl bg-indigo-600 py-5 text-lg font-black text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-indigo-300 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            进入聚会
          </button>
        </div>
      </div>
    </div>
  )
}
