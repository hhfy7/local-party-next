import { useAppStore } from '@/stores/useAppStore'
import { SOCKET_URL } from '@/utils/constants'

export const GlobalConnectionAlert = () => {
  const { connectionError, connected } = useAppStore()

  // 只有在发生错误且未连接时显示
  // 忽略普通的断开连接(reconnecting)，只关注 connect_error
  if (!connectionError || connected) return null

  const handleVerifyClick = () => {
    // 智能构建目标 URL
    let targetUrl = SOCKET_URL
    // 如果当前环境是 HTTPS，强制后端 URL 也尝试 HTTPS (通常是端口不同)
    if (
      window.location.protocol === 'https:' &&
      !targetUrl.startsWith('https')
    ) {
      // 假设 SOCKET_URL 是相对路径或 HTTP，尝试构建 HTTPS 链接
      // 这里做个简单的兜底，如果 SOCKET_URL 是完整的 URL 则直接用
      // 如果需要更复杂的逻辑可以扩展
      if (targetUrl.startsWith('http:')) {
        targetUrl = targetUrl.replace('http:', 'https:')
      } else if (targetUrl.startsWith('/')) {
        targetUrl = `https://${window.location.hostname}:4000` // 默认端口兜底
      }
    }

    window.open(targetUrl, '_blank')
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-white/50">
        {/* Header Section - 使用 Rose 色调强调错误 */}
        <div className="bg-gradient-to-br from-rose-50 to-white p-8 pb-6 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-white shadow-lg ring-1 shadow-rose-100 ring-rose-50">
            <svg
              className="h-10 w-10 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-gray-900">
            无法连接服务器
          </h3>
        </div>

        {/* Content Section */}
        <div className="px-8 pt-2 pb-8">
          <p className="mb-6 text-center text-sm leading-relaxed text-gray-500">
            检测到连接被拦截，通常是因为使用了
            <span className="font-bold text-rose-600"> 自签名 SSL 证书 </span>
            。浏览器为了安全，需要您手动信任该证书。
          </p>

          <div className="mb-8 rounded-2xl border border-rose-100 bg-rose-50/50 p-5">
            <h4 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-rose-800 uppercase">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-200 text-[10px]">
                1
              </span>
              如何解决
            </h4>
            <ol className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="shrink-0 text-rose-400">•</span>
                <span>
                  点击下方
                  <span className="font-bold text-gray-900">“去信任证书”</span>
                  按钮
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 text-rose-400">•</span>
                <span>
                  在打开的页面中点击{' '}
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-gray-800 shadow-sm">
                    高级
                  </span>{' '}
                  &rarr;{' '}
                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-gray-800 shadow-sm">
                    继续前往
                  </span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 text-rose-400">•</span>
                <span>看到 "Server is Running" 后关闭该页面</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleVerifyClick}
              className="group relative w-full overflow-hidden rounded-2xl bg-gray-900 py-4 text-center font-bold text-white shadow-xl shadow-gray-200 transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100" />
              <span className="relative flex items-center justify-center gap-2">
                去信任证书
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </span>
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-2xl bg-gray-50 py-4 font-bold text-gray-600 transition-all hover:bg-gray-100 hover:text-gray-900"
            >
              已完成认证，刷新页面
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
