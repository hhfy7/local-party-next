import { User, FileTransferMetadata } from '@local-party/shared/src/types'

interface TransferConfirmModalProps {
  isOpen: boolean
  fromUser: User
  fileMeta: FileTransferMetadata
  onAccept: () => void
  onReject: () => void
}

export const TransferConfirmModal = ({
  isOpen,
  fromUser,
  fileMeta,
  onAccept,
  onReject,
}: TransferConfirmModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-fade-in mx-4 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">收到视频分享</h3>
          <p className="text-sm text-gray-600">
            <span className="font-bold text-indigo-600">
              {fromUser.username}
            </span>{' '}
            想要分享视频给你
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-gray-50 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">文件名：</span>
            <span className="font-mono text-gray-900">{fileMeta.fileName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">大小：</span>
            <span className="text-gray-900">
              {formatFileSize(fileMeta.fileSize)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
          >
            拒绝
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-700"
          >
            接受
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          视频将通过 P2P 直接传输，不会经过服务器
        </p>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
