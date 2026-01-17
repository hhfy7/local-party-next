import { useState, useEffect, useRef } from 'react'
import type { FileTransferProgress } from '@local-party/shared/src/types'

interface TransferProgressProps {
  progress: FileTransferProgress | null
  isReceiving?: boolean
  statusText?: string
  onCancel?: () => void
  currentStep?: 1 | 2 | 3 // 1: 响应, 2: 连接, 3: 传输
  stepStatus?: 'pending' | 'processing' | 'completed' | 'error'
}

export const TransferProgress = ({
  progress,
  isReceiving = false,
  statusText,
  onCancel,
  currentStep = 1,
  stepStatus = 'processing',
}: TransferProgressProps) => {
  const [shouldRender, setShouldRender] = useState(false)

  // 拖拽逻辑状态
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // 判断是否为错误/失败状态
  const isError =
    stepStatus === 'error' ||
    statusText?.includes('失败') ||
    statusText?.includes('拒绝') ||
    statusText?.includes('错误')

  useEffect(() => {
    // 只要有 statusText 或者有进度，就显示
    if (statusText || (progress && progress.percentage < 100)) {
      const timer = setTimeout(() => setShouldRender(true), 0)
      return () => clearTimeout(timer)
    } else if (progress?.percentage === 100 || isError) {
      // 完成或错误后延迟关闭
      const timer = setTimeout(() => setShouldRender(false), 3000)
      return () => clearTimeout(timer)
    } else {
      const timer = setTimeout(() => setShouldRender(false), 0)
      return () => clearTimeout(timer)
    }
  }, [progress, statusText, isError])

  // --- 拖拽处理 ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStartRef.current) {
        setPosition({
          x: e.clientX - dragStartRef.current.x,
          y: e.clientY - dragStartRef.current.y,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      dragStartRef.current = null
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!shouldRender) return null

  // 计算百分比
  const percentage = progress?.percentage || 0

  // 步骤条组件
  const renderStep = (step: number, label: string) => {
    let color = 'bg-gray-200 text-gray-400' // Pending
    if (step < currentStep) {
      color = 'bg-green-500 text-white' // Completed
    } else if (step === currentStep) {
      if (isError)
        color = 'bg-red-500 text-white' // Error
      else if (stepStatus === 'completed') color = 'bg-green-500 text-white'
      else color = 'bg-indigo-600 text-white animate-pulse' // Processing
    }

    return (
      <div className="flex flex-col items-center">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${color}`}
        >
          {step < currentStep ||
          (step === currentStep && stepStatus === 'completed') ? (
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
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : isError && step === currentStep ? (
            '!'
          ) : (
            step
          )}
        </div>
        <span
          className={`mt-1 text-[9px] font-medium ${step === currentStep ? 'text-gray-900' : 'text-gray-400'}`}
        >
          {label}
        </span>
      </div>
    )
  }

  return (
    <div
      className="animate-fade-in fixed top-20 right-4 z-40 w-72 cursor-move rounded-2xl border border-gray-100 bg-white p-4 shadow-xl ring-1 ring-black/5 md:top-24 md:right-6"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 步骤条 */}
      <div className="mb-4 flex items-center justify-between px-2">
        {renderStep(1, '对方响应')}
        <div className="mx-1 h-0.5 flex-1 bg-gray-100">
          <div
            className={`h-full bg-green-500 transition-all duration-500 ${currentStep > 1 ? 'w-full' : 'w-0'}`}
          />
        </div>
        {renderStep(2, '建立连接')}
        <div className="mx-1 h-0.5 flex-1 bg-gray-100">
          <div
            className={`h-full bg-green-500 transition-all duration-500 ${currentStep > 2 ? 'w-full' : 'w-0'}`}
          />
        </div>
        {renderStep(3, '传输文件')}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h4
          className={`text-xs font-bold ${isError ? 'text-red-600' : 'text-gray-700'}`}
        >
          {statusText ||
            (isReceiving
              ? '📥 正在接收...'
              : currentStep === 1
                ? '等待响应...'
                : '📤 正在发送...')}
        </h4>
        <div className="flex items-center gap-2">
          {currentStep === 3 && (
            <span
              className={`font-mono text-xs font-bold ${isError ? 'text-red-500' : 'text-indigo-600'}`}
            >
              {isError ? '!' : `${percentage}%`}
            </span>
          )}
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
        </div>
      </div>

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

      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-400">
          {currentStep === 3 && progress
            ? `${formatFileSize(progress.bytesTransferred)} / ${formatFileSize(progress.totalBytes)}`
            : isError
              ? '已停止'
              : '准备中...'}
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
