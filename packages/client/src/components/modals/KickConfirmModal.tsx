import { createPortal } from 'react-dom'
import { User } from '@local-party/shared/src/types'

interface KickConfirmModalProps {
  isOpen: boolean
  user: User
  onConfirm: () => void
  onCancel: () => void
}

export const KickConfirmModal = ({
  isOpen,
  user,
  onConfirm,
  onCancel,
}: KickConfirmModalProps) => {
  if (!isOpen) return null

  return createPortal(
    <div className="animate-fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="animate-pop-in mx-4 w-full max-w-sm transform overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl transition-all">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-3xl font-black text-red-500 shadow-inner">
            {user.username[0].toUpperCase()}
          </div>
          <h3 className="mb-3 text-2xl font-black tracking-tight text-gray-900">
            移除成员
          </h3>
          <p className="px-4 text-base leading-relaxed text-gray-600">
            确定要将{' '}
            <span className="font-bold text-gray-900">{user.username}</span>{' '}
            移出房间吗？
          </p>
          <p className="mt-2 text-xs font-medium text-red-400">
            该用户将被强制断开连接，且 5 分钟内无法重连。
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-base font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-red-500 py-4 text-base font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-600 hover:shadow-red-300 active:scale-95"
          >
            确认移除
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
