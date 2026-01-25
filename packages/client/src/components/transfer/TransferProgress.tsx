/**
 * P2P文件传输进度组件
 * 显示文件传输的三个步骤：对方响应、建立连接、传输文件
 * 支持拖拽定位和实时进度显示
 *
 * 重构目标：
 * 1. 分离业务逻辑和UI渲染
 * 2. 抽取纯函数降低复杂度
 * 3. 组件原子化提升可维护性
 * 4. 保持API完全兼容
 */

import React, { useMemo } from 'react'
import type { FileTransferProgress } from '@local-party/shared/src/types'
import { useDraggable } from '@/hooks/useDraggable'
import { TransferSteps } from '@/components/transfer/StepIndicator'
import { formatFileSize } from '@/utils/fileHelpers'
import {
  getStatusText,
  checkTransferError,
  shouldRenderTransfer,
  type TransferStep,
  type TransferStatus,
} from '@/utils/transferStepUtils'

// 为了API兼容性重新导出类型
export type { TransferStep, TransferStatus }

interface TransferProgressProps {
  progress: FileTransferProgress | null
  isReceiving?: boolean
  statusText?: string
  onCancel?: () => void
  currentStep?: TransferStep
  stepStatus?: TransferStatus
}

/**
 * 状态信息组件
 * 显示传输状态和进度百分比
 */
const TransferStatusInfo = React.memo(
  ({
    isError,
    statusText,
    isReceiving,
    currentStep,
    percentage,
  }: {
    isError: boolean
    statusText?: string
    isReceiving: boolean
    currentStep: TransferStep
    percentage: number
  }) => {
    const displayText = useMemo(
      () => getStatusText(isReceiving, currentStep, statusText),
      [isReceiving, currentStep, statusText],
    )

    return (
      <div className="mb-2 flex items-center justify-between">
        <h4
          className={`text-xs font-bold ${isError ? 'text-red-600' : 'text-gray-700'}`}
        >
          {displayText}
        </h4>
        <div className="flex items-center gap-2">
          {currentStep === 3 && (
            <span
              className={`font-mono text-xs font-bold ${isError ? 'text-red-500' : 'text-indigo-600'}`}
            >
              {isError ? '!' : `${percentage}%`}
            </span>
          )}
        </div>
      </div>
    )
  },
)

/**
 * 进度条组件
 * 显示传输进度和动画效果
 */
const ProgressBar = React.memo(
  ({
    currentStep,
    percentage,
    isError,
  }: {
    currentStep: TransferStep
    percentage: number
    isError: boolean
  }) => {
    return (
      <div className="relative mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        {currentStep < 3 && !isError ? (
          <div className="absolute top-0 left-0 h-full w-1/3 animate-[shimmer_1s_infinite] rounded-full bg-indigo-200" />
        ) : (
          <div
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ease-out ${isError ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: isError ? '100%' : `${percentage}%` }}
          />
        )}
      </div>
    )
  },
)

/**
 * 文件大小信息组件
 * 显示已传输和总文件大小
 */
const FileSizeInfo = React.memo(
  ({
    currentStep,
    progress,
    isError,
  }: {
    currentStep: TransferStep
    progress: FileTransferProgress | null
    isError: boolean
  }) => {
    const fileSizeText = useMemo(() => {
      if (currentStep === 3 && progress) {
        return `${formatFileSize(progress.bytesTransferred)} / ${formatFileSize(progress.totalBytes)}`
      }
      if (isError) return '已停止'
      return '准备中...'
    }, [currentStep, progress, isError])

    return <div className="text-[10px] text-gray-400">{fileSizeText}</div>
  },
)

/**
 * 关闭按钮组件
 */
const CloseButton = React.memo(({ onCancel }: { onCancel?: () => void }) => {
  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onCancel?.()
      }}
      className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
      title="关闭"
    >
      <svg
        className="h-3 w-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  )
})

/**
 * 主组件：P2P文件传输进度显示
 *
 * 重构说明：
 * - 使用React.memo优化渲染性能
 * - 将复杂逻辑抽取为独立子组件
 * - 使用useMemo避免不必要的计算
 * - 保持与原API完全兼容
 */
export const TransferProgress = React.memo(
  ({
    progress,
    isReceiving = false,
    statusText,
    onCancel,
    currentStep = 1,
    stepStatus = 'processing',
  }: TransferProgressProps) => {
    // 核心状态计算 - 直接计算，避免复杂的useMemo依赖问题
    const isError = checkTransferError(stepStatus, statusText)
    const percentage = progress?.percentage ?? 0

    // 显示/隐藏计算 - 直接调用函数
    const { shouldRender, delay } = shouldRenderTransfer(
      !!statusText,
      progress,
      isError,
    )

    // 显示/隐藏逻辑 - 保持原有行为
    const [isVisible, setIsVisible] = React.useState(false)

    React.useEffect(() => {
      if (delay === 0) {
        queueMicrotask(() => setIsVisible(shouldRender))
        return
      }

      const timer = setTimeout(() => {
        setIsVisible(shouldRender)
      }, delay)

      return () => clearTimeout(timer)
    }, [shouldRender, delay])

    // 拖拽逻辑 - 使用专用hook
    const { position, handleMouseDown } = useDraggable({
      initialPosition: { x: 0, y: 0 },
    })

    // 提前返回，保持原有行为
    if (!isVisible) return null

    return (
      <div
        className="animate-fade-in fixed top-20 right-4 z-40 w-72 cursor-move rounded-2xl border border-gray-100 bg-white p-4 shadow-xl ring-1 ring-black/5 md:top-24 md:right-6"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
      >
        {/* 步骤条 - 现在使用独立的TransferSteps组件 */}
        <TransferSteps
          currentStep={currentStep}
          stepStatus={stepStatus}
          isError={isError}
        />

        {/* 状态信息 - 独立组件，逻辑清晰 */}
        <TransferStatusInfo
          isError={isError}
          statusText={statusText}
          isReceiving={isReceiving}
          currentStep={currentStep}
          percentage={percentage}
        />

        {/* 进度条 - 独立组件，职责单一 */}
        <ProgressBar
          currentStep={currentStep}
          percentage={percentage}
          isError={isError}
        />

        {/* 文件大小信息 - 独立组件，可复用 */}
        <div className="flex items-center justify-between">
          <FileSizeInfo
            currentStep={currentStep}
            progress={progress}
            isError={isError}
          />
          {/* 关闭按钮 - 独立组件 */}
          <CloseButton onCancel={onCancel} />
        </div>
      </div>
    )
  },
)

// 添加displayName便于调试
TransferProgress.displayName = 'TransferProgress'
