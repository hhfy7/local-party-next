/**
 * P2P传输步骤工具函数
 * 提供步骤状态计算和样式生成的纯函数
 */

export type TransferStep = 1 | 2 | 3
export type TransferStatus = 'pending' | 'processing' | 'completed' | 'error'

interface StepState {
  step: number
  currentStep: number
  stepStatus: TransferStatus
  isError: boolean
}

/**
 * 计算步骤指示器的颜色类名
 * 规则：
 * - 已完成的步骤：绿色背景，白色文字
 * - 当前步骤：根据状态显示不同颜色
 * - 未进行的步骤：灰色背景，灰色文字
 */
export const getStepColor = ({
  step,
  currentStep,
  stepStatus,
  isError,
}: StepState): string => {
  // 已完成的步骤
  if (step < currentStep) return 'bg-green-500 text-white'

  // 未进行的步骤
  if (step > currentStep) return 'bg-gray-200 text-gray-400'

  // 当前步骤的状态处理
  if (isError) return 'bg-red-500 text-white'
  if (stepStatus === 'completed') return 'bg-green-500 text-white'
  if (stepStatus === 'processing')
    return 'bg-indigo-600 text-white animate-pulse'

  // 默认待定状态
  return 'bg-gray-200 text-gray-400'
}

/**
 * 计算步骤指示器的图标
 * 规则：
 * - 已完成的步骤：显示勾选图标
 * - 当前步骤且出错：显示感叹号
 * - 其他情况：显示步骤数字
 */
export const getStepIcon = ({
  step,
  currentStep,
  stepStatus,
  isError,
}: StepState): React.ReactNode => {
  const isCompleted =
    step < currentStep || (step === currentStep && stepStatus === 'completed')
  const isCurrentError = step === currentStep && isError

  if (isCompleted) {
    return '✓' // 使用字符代替复杂的SVG
  }

  if (isCurrentError) return '!'
  return step.toString()
}

/**
 * 计算步骤标签的文字颜色
 * 当前步骤显示深色，其他步骤显示灰色
 */
export const getStepLabelColor = (
  step: number,
  currentStep: number,
): string => {
  return step === currentStep ? 'text-gray-900' : 'text-gray-400'
}

/**
 * 计算传输状态显示文字
 * 优先级：自定义文字 > 接收状态 > 步骤状态 > 默认文字
 */
export const getStatusText = (
  isReceiving: boolean,
  currentStep: number,
  customText?: string,
): string => {
  if (customText) return customText
  if (isReceiving) return '📥 正在接收...'
  if (currentStep === 1) return '等待响应...'
  return '📤 正在发送...'
}

/**
 * 检查是否处于错误状态
 * 从步骤状态和自定义文本中判断
 */
export const checkTransferError = (
  stepStatus: TransferStatus,
  statusText?: string,
): boolean => {
  if (stepStatus === 'error') return true

  const errorKeywords = ['失败', '拒绝', '错误', 'cancelled', 'failed']
  if (!statusText) return false

  return errorKeywords.some(keyword =>
    statusText.toLowerCase().includes(keyword),
  )
}

/**
 * 计算是否应该渲染组件
 * 规则：
 * - 有状态文字或进度未满时：延迟显示
 * - 完成或错误时：延迟隐藏
 * - 其他情况：立即隐藏
 */
export const shouldRenderTransfer = (
  hasStatusText: boolean,
  progress: { percentage: number } | null,
  isError: boolean,
): { shouldRender: boolean; delay: number } => {
  if (hasStatusText || (progress && progress.percentage < 100)) {
    return { shouldRender: true, delay: 0 }
  }

  if (progress?.percentage === 100 || isError) {
    return { shouldRender: true, delay: 3000 } // 延迟3秒后隐藏
  }

  return { shouldRender: false, delay: 0 }
}
