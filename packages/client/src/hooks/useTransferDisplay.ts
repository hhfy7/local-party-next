/**
 * 传输进度显示逻辑Hook
 * 管理传输进度组件的显示/隐藏逻辑和状态判断
 */

import { useState, useEffect, useMemo } from 'react'
import {
  checkTransferError,
  shouldRenderTransfer,
  type TransferStep,
  type TransferStatus,
} from '@/utils/transferStepUtils'

interface UseTransferDisplayOptions {
  progress: { percentage: number } | null
  statusText?: string
  currentStep?: TransferStep
  stepStatus?: TransferStatus
}

interface UseTransferDisplayReturn {
  shouldRender: boolean
  isError: boolean
  statusDisplay: string
  percentage: number
}

/**
 * 管理传输进度显示逻辑的Hook
 *
 * @example
 * ```tsx
 * const { shouldRender, isError, statusDisplay, percentage } = useTransferDisplay({
 *   progress: fileProgress,
 *   statusText: customStatus,
 *   currentStep: 2,
 *   stepStatus: 'processing'
 * })
 *
 * if (!shouldRender) return null
 *
 * return (
 *   <div>
 *     <span>{statusDisplay}</span>
 *     <span>{percentage}%</span>
 *   </div>
 * )
 * ```
 */
export const useTransferDisplay = ({
  progress,
  statusText,
  currentStep = 1,
  stepStatus = 'processing',
}: UseTransferDisplayOptions): UseTransferDisplayReturn => {
  const [shouldRender, setShouldRender] = useState(false)

  // 计算错误状态 - 使用useMemo避免重复计算
  const isError = useMemo(
    () => checkTransferError(stepStatus, statusText),
    [stepStatus, statusText],
  )

  // 计算显示文字 - 使用useMemo避免重复计算
  const statusDisplay = useMemo(() => {
    if (statusText) return statusText
    if (stepStatus === 'error') return '传输出错'
    if (currentStep === 1) return '等待响应...'
    return '准备中...' // 默认状态
  }, [statusText, stepStatus, currentStep])

  // 计算进度百分比 - 安全默认值处理
  const percentage = useMemo(() => progress?.percentage ?? 0, [progress])

  // 显示/隐藏逻辑管理 - 使用useEffect处理延迟显示/隐藏
  useEffect(() => {
    const { shouldRender: newShouldRender, delay } = shouldRenderTransfer(
      !!statusText,
      progress,
      isError,
    )

    if (delay === 0) {
      // 立即更新状态，避免setState嵌套调用问题
      queueMicrotask(() => setShouldRender(newShouldRender))
      return
    }

    // 延迟显示/隐藏
    const timer = setTimeout(() => {
      setShouldRender(newShouldRender)
    }, delay)

    return () => clearTimeout(timer)
  }, [statusText, progress, isError])

  return {
    shouldRender,
    isError,
    statusDisplay,
    percentage,
  }
}
