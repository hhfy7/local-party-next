/**
 * transferStepUtils 单元测试
 * 测试 P2P 传输步骤相关的纯函数
 */

import { describe, it, expect } from 'vitest'
import {
  getStepColor,
  getStepIcon,
  getStepLabelColor,
  getStatusText,
  checkTransferError,
  shouldRenderTransfer,
} from '../transferStepUtils'
import { formatFileSize } from '../fileHelpers'

describe('transferStepUtils', () => {
  // ============================================
  // getStepColor Tests
  // ============================================
  describe('getStepColor', () => {
    it('已完成步骤应返回绿色样式', () => {
      expect(
        getStepColor({
          step: 1,
          currentStep: 2,
          stepStatus: 'completed',
          isError: false,
        }),
      ).toBe('bg-green-500 text-white')
    })

    it('当前步骤且状态为completed应返回绿色样式', () => {
      expect(
        getStepColor({
          step: 2,
          currentStep: 2,
          stepStatus: 'completed',
          isError: false,
        }),
      ).toBe('bg-green-500 text-white')
    })

    it('当前步骤且isError为true应返回红色样式', () => {
      expect(
        getStepColor({
          step: 2,
          currentStep: 2,
          stepStatus: 'error',
          isError: true,
        }),
      ).toBe('bg-red-500 text-white')
    })

    it('当前步骤且状态为processing应返回脉冲样式', () => {
      expect(
        getStepColor({
          step: 2,
          currentStep: 2,
          stepStatus: 'processing',
          isError: false,
        }),
      ).toBe('bg-indigo-600 text-white animate-pulse')
    })

    it('当前步骤且状态为pending应返回灰色样式', () => {
      expect(
        getStepColor({
          step: 2,
          currentStep: 2,
          stepStatus: 'pending',
          isError: false,
        }),
      ).toBe('bg-gray-200 text-gray-400')
    })

    it('未进行的步骤应返回灰色样式', () => {
      expect(
        getStepColor({
          step: 3,
          currentStep: 2,
          stepStatus: 'pending',
          isError: false,
        }),
      ).toBe('bg-gray-200 text-gray-400')
    })

    it('边界情况：step为1，currentStep为1，处理中状态', () => {
      expect(
        getStepColor({
          step: 1,
          currentStep: 1,
          stepStatus: 'processing',
          isError: false,
        }),
      ).toBe('bg-indigo-600 text-white animate-pulse')
    })

    it('边界情况：step为3，currentStep为1，已完成状态', () => {
      expect(
        getStepColor({
          step: 3,
          currentStep: 1,
          stepStatus: 'completed',
          isError: false,
        }),
      ).toBe('bg-gray-200 text-gray-400')
    })
  })

  // ============================================
  // getStepIcon Tests
  // ============================================
  describe('getStepIcon', () => {
    it('已完成步骤应返回勾选符号', () => {
      expect(
        getStepIcon({
          step: 1,
          currentStep: 2,
          stepStatus: 'completed',
          isError: false,
        }),
      ).toBe('✓')
    })

    it('当前步骤且状态为completed应返回勾选符号', () => {
      expect(
        getStepIcon({
          step: 2,
          currentStep: 2,
          stepStatus: 'completed',
          isError: false,
        }),
      ).toBe('✓')
    })

    it('当前步骤且isError为true应返回感叹号', () => {
      expect(
        getStepIcon({
          step: 2,
          currentStep: 2,
          stepStatus: 'error',
          isError: true,
        }),
      ).toBe('!')
    })

    it('当前步骤且无错误应返回步骤数字', () => {
      expect(
        getStepIcon({
          step: 2,
          currentStep: 2,
          stepStatus: 'pending',
          isError: false,
        }),
      ).toBe('2')
    })

    it('未进行的步骤应返回步骤数字', () => {
      expect(
        getStepIcon({
          step: 3,
          currentStep: 2,
          stepStatus: 'pending',
          isError: false,
        }),
      ).toBe('3')
    })
  })

  // ============================================
  // getStepLabelColor Tests
  // ============================================
  describe('getStepLabelColor', () => {
    it('当前步骤应返回深色文字', () => {
      expect(getStepLabelColor(2, 2)).toBe('text-gray-900')
    })

    it('非当前步骤应返回灰色文字', () => {
      expect(getStepLabelColor(1, 2)).toBe('text-gray-400')
      expect(getStepLabelColor(3, 2)).toBe('text-gray-400')
    })

    it('边界情况：第一步为当前步骤', () => {
      expect(getStepLabelColor(1, 1)).toBe('text-gray-900')
    })

    it('边界情况：第三步为当前步骤，其他步骤', () => {
      expect(getStepLabelColor(1, 3)).toBe('text-gray-400')
      expect(getStepLabelColor(2, 3)).toBe('text-gray-400')
      expect(getStepLabelColor(3, 3)).toBe('text-gray-900')
    })
  })

  // ============================================
  // getStatusText Tests
  // ============================================
  describe('getStatusText', () => {
    it('有自定义文字时应返回自定义文字', () => {
      expect(getStatusText(false, 1, '自定义状态')).toBe('自定义状态')
    })

    it('接收模式时应返回接收提示', () => {
      expect(getStatusText(true, 1)).toBe('📥 正在接收...')
      expect(getStatusText(true, 2)).toBe('📥 正在接收...')
      expect(getStatusText(true, 3)).toBe('📥 正在接收...')
    })

    it('发送模式且当前步骤为1时应返回等待响应', () => {
      expect(getStatusText(false, 1)).toBe('等待响应...')
    })

    it('发送模式且当前步骤大于1时应返回发送提示', () => {
      expect(getStatusText(false, 2)).toBe('📤 正在发送...')
      expect(getStatusText(false, 3)).toBe('📤 正在发送...')
    })

    it('边界情况：接收模式带自定义文字', () => {
      expect(getStatusText(true, 2, '特殊接收中')).toBe('特殊接收中')
    })
  })

  // ============================================
  // checkTransferError Tests
  // ============================================
  describe('checkTransferError', () => {
    it('stepStatus为error时应返回true', () => {
      expect(checkTransferError('error')).toBe(true)
    })

    it('stepStatus为completed时应返回false', () => {
      expect(checkTransferError('completed')).toBe(false)
    })

    it('stepStatus为processing时应返回false', () => {
      expect(checkTransferError('processing')).toBe(false)
    })

    it('stepStatus为pending时应返回false', () => {
      expect(checkTransferError('pending')).toBe(false)
    })

    it('statusText包含"失败"时应返回true', () => {
      expect(checkTransferError('processing', '传输失败')).toBe(true)
      expect(checkTransferError('pending', '连接失败')).toBe(true)
    })

    it('statusText包含"拒绝"时应返回true', () => {
      expect(checkTransferError('processing', '连接被拒绝')).toBe(true)
    })

    it('statusText包含"错误"时应返回true', () => {
      expect(checkTransferError('processing', '发生错误')).toBe(true)
    })

    it('statusText包含英文"cancelled"时应返回true', () => {
      expect(checkTransferError('processing', 'cancelled')).toBe(true)
    })

    it('statusText包含英文"failed"时应返回true', () => {
      expect(checkTransferError('processing', 'transfer failed')).toBe(true)
    })

    it('statusText不包含错误关键词时应返回false', () => {
      expect(checkTransferError('processing', '正在接收文件')).toBe(false)
      expect(checkTransferError('pending', '等待对方接受')).toBe(false)
    })

    it('statusText为undefined时应返回false', () => {
      expect(checkTransferError('processing')).toBe(false)
    })

    it('statusText为null时应返回false', () => {
      expect(checkTransferError('processing', null as any)).toBe(false)
    })

    it('statusText为空字符串时应返回false', () => {
      expect(checkTransferError('processing', '')).toBe(false)
    })

    it('statusText大小写不敏感', () => {
      expect(checkTransferError('processing', 'failed')).toBe(true)
      expect(checkTransferError('processing', 'Failed')).toBe(true)
      expect(checkTransferError('processing', 'FAILED')).toBe(true)
      expect(checkTransferError('processing', '失败')).toBe(true)
    })
  })

  // ============================================
  // formatFileSize Tests
  // ============================================
  describe('formatFileSize', () => {
    it('0字节应返回"0 B"', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('小文件应正确格式化', () => {
      expect(formatFileSize(512)).toBe('512 B')
      expect(formatFileSize(1023)).toBe('1023 B')
    })

    it('1KB应正确显示', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('大于1KB应正确显示', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(2048)).toBe('2 KB')
    })

    it('1MB应正确显示', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    })

    it('大于1MB应正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
      expect(formatFileSize(1024 * 1024 * 2)).toBe('2 MB')
    })

    it('1GB应正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('大于1GB应正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB')
    })

    it('边界情况：大数值', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 10)).toBe('10 GB')
    })
  })

  // ============================================
  // shouldRenderTransfer Tests
  // ============================================
  describe('shouldRenderTransfer', () => {
    it('有状态文字时应立即渲染', () => {
      const result = shouldRenderTransfer(true, null, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })

    it('进度未满100%时应立即渲染', () => {
      const result = shouldRenderTransfer(false, { percentage: 50 }, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })

    it('进度为0时应立即渲染', () => {
      const result = shouldRenderTransfer(false, { percentage: 0 }, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })

    it('进度为99%时应立即渲染', () => {
      const result = shouldRenderTransfer(false, { percentage: 99 }, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })

    it('进度完成100%时应延迟3秒后隐藏', () => {
      const result = shouldRenderTransfer(false, { percentage: 100 }, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(3000)
    })

    it('错误状态时应延迟3秒后隐藏', () => {
      const result = shouldRenderTransfer(false, null, true)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(3000)
    })

    it('错误状态且进度完成时应延迟3秒后隐藏', () => {
      const result = shouldRenderTransfer(false, { percentage: 100 }, true)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(3000)
    })

    it('无状态文字、进度完成、无错误时应不渲染', () => {
      const result = shouldRenderTransfer(false, null, false)
      expect(result.shouldRender).toBe(false)
      expect(result.delay).toBe(0)
    })

    it('无状态文字、无进度、无错误时应不渲染', () => {
      const result = shouldRenderTransfer(false, null, false)
      expect(result.shouldRender).toBe(false)
    })

    it('边界情况：进度为null且有状态文字', () => {
      const result = shouldRenderTransfer(true, null, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })

    it('边界情况：进度为null且是错误状态', () => {
      const result = shouldRenderTransfer(false, null, true)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(3000)
    })

    it('边界情况：进度为undefined时应不渲染', () => {
      const result = shouldRenderTransfer(false, undefined as any, false)
      expect(result.shouldRender).toBe(false)
      expect(result.delay).toBe(0)
    })

    it('边界情况：进度为undefined但有状态文字时应立即渲染', () => {
      const result = shouldRenderTransfer(true, undefined as any, false)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })

    it('边界情况：进度为undefined且是错误状态时应延迟隐藏', () => {
      const result = shouldRenderTransfer(false, undefined as any, true)
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(3000)
    })

    it('边界情况：进度percentage为undefined时应不渲染', () => {
      const result = shouldRenderTransfer(
        false,
        { percentage: undefined as any },
        false,
      )
      expect(result.shouldRender).toBe(false)
      expect(result.delay).toBe(0)
    })

    it('边界情况：进度percentage为undefined但有状态文字时应立即渲染', () => {
      const result = shouldRenderTransfer(
        true,
        { percentage: undefined as any },
        false,
      )
      expect(result.shouldRender).toBe(true)
      expect(result.delay).toBe(0)
    })
  })
})
