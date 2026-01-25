import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { toast } from 'react-hot-toast'

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4">
      <h2 className="mb-2 text-sm font-semibold text-red-600">出错了</h2>
      <p className="mb-3 text-center text-xs text-gray-600">
        {error instanceof Error ? error.message : '发生了未知错误'}
      </p>
      <button
        onClick={() => {
          resetErrorBoundary()
          window.location.reload()
        }}
        className="rounded bg-red-500 px-3 py-1.5 text-xs text-white transition-colors hover:bg-red-600"
      >
        刷新页面
      </button>
    </div>
  )
}

export function P2PErrorBoundary({ children }: { children: React.ReactNode }) {
  const handleError = (
    error: unknown,
    info: { componentStack?: string | null },
  ) => {
    console.error('P2P Error:', error)
    console.error('Component Stack:', info.componentStack)
    toast.error('P2P 传输出现问题，请重试')
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}

export function VideoErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const handleError = (
    error: unknown,
    info: { componentStack?: string | null },
  ) => {
    console.error('Video Error:', error)
    console.error('Component Stack:', info.componentStack)
    toast.error('视频播放出现问题')
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}

export function ChatErrorBoundary({ children }: { children: React.ReactNode }) {
  const handleError = (
    error: unknown,
    info: { componentStack?: string | null },
  ) => {
    console.error('Chat Error:', error)
    console.error('Component Stack:', info.componentStack)
    toast.error('聊天功能出现问题')
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
