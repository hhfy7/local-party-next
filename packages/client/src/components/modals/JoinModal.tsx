import { useState } from 'react'
import { getNickname } from '@/utils/storage'

interface JoinModalProps {
  roomId: string
  onJoin: (name: string, password?: string) => void
  hasToken?: boolean
}

export const JoinModal = ({
  roomId,
  onJoin,
  hasToken = false,
}: JoinModalProps) => {
  const [name, setName] = useState(getNickname() || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [forcePasswordMode, setForcePasswordMode] = useState(false)

  // 如果有 Token 且没强制手动输入，则认为使用 Token
  const useToken = hasToken && !forcePasswordMode

  const handleJoin = () => {
    // 如果使用 Token，传空密码（Hook会处理Token）
    // 否则传输入的密码
    if (name) onJoin(name, useToken ? undefined : password)
  }

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
              className="w-full rounded-2xl border-0 bg-gray-50 px-6 py-4.5 text-lg font-bold text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600"
              placeholder="例如: Jack"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
          </div>

          <div>
            <label className="mb-2.5 ml-1 block text-sm font-bold text-gray-700">
              房间密码
              <span className="ml-1 font-normal text-gray-400">(可选)</span>
            </label>
            {useToken ? (
              <div className="relative">
                <div className="flex w-full items-center justify-between rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-5 py-4.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-900">
                        邀请链接已激活
                      </div>
                      <div className="text-xs text-emerald-600">
                        无需密码即可进入
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setForcePasswordMode(true)}
                    className="text-xs font-medium text-emerald-600 underline decoration-emerald-300 underline-offset-2 transition-colors hover:text-emerald-800"
                  >
                    手动输入
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  className="w-full rounded-2xl border-0 bg-gray-50 px-6 py-4.5 text-lg font-bold text-gray-900 shadow-sm ring-1 ring-gray-200 transition-all outline-none placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  placeholder="若有密码请填写"
                  value={password}
                  onChange={e =>
                    setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  onKeyDown={e => e.key === 'Enter' && handleJoin()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-4 -translate-y-1/2 p-2 text-gray-400 transition-colors hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleJoin}
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
