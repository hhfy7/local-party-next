interface ErrorScreenProps {
  message: string
  onBack: () => void
}

export const ErrorScreen = ({ message, onBack }: ErrorScreenProps) => (
  <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-gray-50 text-gray-900">
    <div className="max-w-md rounded-3xl bg-white p-12 text-center shadow-xl ring-1 ring-gray-100">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <svg
          className="h-10 w-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="mb-3 text-2xl font-bold text-gray-900">哎呀，出错了</h2>
      <p className="mb-8 leading-relaxed text-gray-500">{message}</p>
      <button
        onClick={onBack}
        className="rounded-2xl bg-gray-900 px-8 py-3.5 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-xl active:translate-y-0"
      >
        返回首页
      </button>
    </div>
  </div>
)

export const LoadingScreen = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
    <div className="flex flex-col items-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      <p className="text-sm font-medium text-gray-500">正在进入房间...</p>
    </div>
  </div>
)
