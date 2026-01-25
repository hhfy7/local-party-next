import React, { useMemo } from 'react'
import type { useP2PManager } from '@/hooks/useP2PManager'
import {
  checkTransferError,
  shouldRenderTransfer,
  getStatusText,
} from '@/utils/transferStepUtils'

interface TransferStatusPanelProps {
  p2p: ReturnType<typeof useP2PManager>
}

export const TransferStatusPanel = ({ p2p }: TransferStatusPanelProps) => {
  const { progress, isReceiving } = p2p.data
  const { statusText, p2pStep, p2pStepStatus } = p2p.ui

  const isError = checkTransferError(p2pStepStatus, statusText)
  const percentage = progress?.percentage ?? 0

  const { shouldRender } = shouldRenderTransfer(!!statusText, progress, isError)

  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (shouldRender) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [shouldRender])

  const displayText = useMemo(
    () => getStatusText(isReceiving, p2pStep, statusText),
    [isReceiving, p2pStep, statusText],
  )

  if (!isVisible && !shouldRender) return null

  return (
    <div className="animate-in slide-in-from-top-2 flex flex-col border-b border-gray-100 bg-gray-50/80 px-4 py-3 backdrop-blur-sm transition-all duration-300">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            data-testid="status-indicator"
            className={`h-2 w-2 rounded-full ${isError ? 'bg-red-500' : 'animate-pulse bg-indigo-500'}`}
          />
          <span className="text-xs font-bold text-gray-700">
            {isReceiving ? '接收文件' : '发送文件'}
          </span>
        </div>
        <span
          className={`font-mono text-xs font-bold ${isError ? 'text-red-500' : 'text-indigo-600'}`}
        >
          {isError ? 'Error' : `${percentage}%`}
        </span>
      </div>

      <div className="relative mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        {p2pStep < 3 && !isError ? (
          <div
            data-testid="shimmer-animation"
            className="absolute top-0 left-0 h-full w-1/3 animate-[shimmer_1s_infinite] rounded-full bg-indigo-300"
          />
        ) : (
          <div
            data-testid="progress-bar"
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out ${
              isError ? 'bg-red-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <span className="max-w-[180px] truncate" title={displayText}>
          {displayText}
        </span>
      </div>

      {!isError && percentage < 100 && (
        <button
          onClick={p2p.actions.cancelTransfer}
          className="mt-2 w-full rounded-lg border border-gray-200 bg-white py-1 text-xs font-medium text-gray-600 transition-colors hover:border-red-100 hover:bg-red-50 hover:text-red-600"
        >
          取消传输
        </button>
      )}
    </div>
  )
}
