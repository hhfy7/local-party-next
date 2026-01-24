/**
 * 传输步骤指示器组件
 * 显示P2P传输的三个步骤：对方响应、建立连接、传输文件
 */

import React from 'react'
import {
  getStepColor,
  getStepIcon,
  getStepLabelColor,
  type TransferStep,
  type TransferStatus,
} from '@/utils/transferStepUtils'

interface StepIndicatorProps {
  step: TransferStep
  currentStep: TransferStep
  status: TransferStatus
  isError: boolean
  label: string
}

/**
 * 单个步骤指示器
 * 显示步骤的图标、颜色和标签
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  currentStep,
  status,
  isError,
  label,
}) => {
  const color = getStepColor({ step, currentStep, stepStatus: status, isError })
  const icon = getStepIcon({ step, currentStep, stepStatus: status, isError })
  const labelColor = getStepLabelColor(step, currentStep)

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${color}`}
      >
        {icon}
      </div>
      <span className={`mt-1 text-[9px] font-medium ${labelColor}`}>
        {label}
      </span>
    </div>
  )
}

interface StepConnectorProps {
  isActive: boolean
}

/**
 * 步骤之间的连接线
 */
export const StepConnector: React.FC<StepConnectorProps> = ({ isActive }) => {
  return (
    <div className="mx-1 h-0.5 flex-1 bg-gray-100">
      <div
        className={`h-full bg-green-500 transition-all duration-500 ${isActive ? 'w-full' : 'w-0'}`}
      />
    </div>
  )
}

interface TransferStepsProps {
  currentStep: TransferStep
  stepStatus: TransferStatus
  isError: boolean
}

/**
 * 完整的传输步骤指示器
 * 包含三个步骤和连接线
 *
 * @example
 * ```tsx
 * <TransferSteps
 *   currentStep={2}
 *   stepStatus="processing"
 *   isError={false}
 * />
 * ```
 */
export const TransferSteps: React.FC<TransferStepsProps> = ({
  currentStep,
  stepStatus,
  isError,
}) => {
  return (
    <div className="flex items-center justify-between px-2">
      <StepIndicator
        step={1}
        currentStep={currentStep}
        status={stepStatus}
        isError={isError}
        label="对方响应"
      />
      <StepConnector isActive={currentStep > 1} />
      <StepIndicator
        step={2}
        currentStep={currentStep}
        status={stepStatus}
        isError={isError}
        label="建立连接"
      />
      <StepConnector isActive={currentStep > 2} />
      <StepIndicator
        step={3}
        currentStep={currentStep}
        status={stepStatus}
        isError={isError}
        label="传输文件"
      />
    </div>
  )
}
