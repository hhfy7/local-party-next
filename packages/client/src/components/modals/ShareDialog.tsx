import { FileTransferMetadata } from '@local-party/shared/src/types'
import { formatFileSize } from '@/utils/fileHelpers'

interface ShareDialogProps {
  isOpen: boolean
  fileMeta: Partial<FileTransferMetadata>
  recipientCount: number
  onConfirm: () => void
  onCancel: () => void
}

export const ShareDialog = ({
  isOpen,
  fileMeta,
  recipientCount,
  onConfirm,
  onCancel,
}: ShareDialogProps) => {
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">确认分享视频</h3>
          <p className="text-sm text-gray-600">
            您即将发起视频分享，房间内的{' '}
            <span className="font-bold text-indigo-600">{recipientCount}</span>{' '}
            位成员将收到邀请。
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-gray-50 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">文件名：</span>
            <span className="line-clamp-1 max-w-[200px] font-mono text-gray-900">
              {fileMeta.fileName}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">大小：</span>
            <span className="text-gray-900">
              {formatFileSize(fileMeta.fileSize || 0)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-700"
          >
            确认分享
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          视频将通过 P2P 直接传输，不会经过服务器
        </p>
      </div>
    </div>
  )
}
