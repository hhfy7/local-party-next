/**
 * TransferStatusPanel 组件单元测试
 * 测试 P2P 传输状态面板的渲染和行为
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransferStatusPanel } from '../TransferStatusPanel'

// Mock transferStepUtils with proper implementation
vi.mock('@/utils/transferStepUtils', () => ({
  checkTransferError: vi.fn((stepStatus, statusText) => {
    if (stepStatus === 'error') return true
    const errorKeywords = ['失败', '拒绝', '错误', 'cancelled', 'failed']
    if (!statusText) return false
    return errorKeywords.some(keyword =>
      statusText.toLowerCase().includes(keyword),
    )
  }),
  shouldRenderTransfer: vi.fn((hasStatusText, progress, isError) => {
    if (hasStatusText || (progress && progress.percentage < 100)) {
      return { shouldRender: true, delay: 0 }
    }
    if (progress?.percentage === 100 || isError) {
      return { shouldRender: true, delay: 3000 }
    }
    return { shouldRender: false, delay: 0 }
  }),
  getStatusText: vi.fn((isReceiving, step, customText) => {
    if (customText) return customText
    if (isReceiving) return '📥 正在接收...'
    if (step === 1) return '等待响应...'
    return '📤 正在发送...'
  }),
}))

// Mock useP2PManager hook
const mockCancelTransfer = vi.fn()

// Create mock P2P manager with proper structure
const createMockP2P = (
  overrides: {
    data?: Partial<{
      progress: { percentage: number } | null
      isReceiving: boolean
    }>
    ui?: Partial<{ statusText: string; p2pStep: number; p2pStepStatus: string }>
    actions?: Partial<{ cancelTransfer: () => void }>
  } = {},
) => {
  const mock = {
    data: {
      progress: { percentage: 0 },
      isReceiving: false,
      ...overrides.data,
    },
    ui: {
      isShareDialogOpen: false,
      confirmModalData: null,
      p2pStep: 1,
      p2pStepStatus: 'pending' as const,
      statusText: '',
      shareFileMeta: { fileName: '', fileSize: 0 },
      ...overrides.ui,
    },
    actions: {
      openShareDialog: vi.fn(),
      closeShareDialog: vi.fn(),
      confirmShare: vi.fn(),
      acceptTransfer: vi.fn(),
      rejectTransfer: vi.fn(),
      cancelTransfer: mockCancelTransfer,
      getReceivedFile: vi.fn(),
      ...overrides.actions,
    },
  }
  return mock as any
}

describe('TransferStatusPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockCancelTransfer.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('基本渲染', () => {
    it('应该在传输进行时显示状态面板', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '正在传输中...', p2pStep: 2 },
        data: { progress: { percentage: 50 }, isReceiving: true },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('接收文件')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('发送文件时应该显示"发送文件"标签', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '正在发送...', p2pStep: 2 },
        data: { progress: { percentage: 30 }, isReceiving: false },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('发送文件')).toBeInTheDocument()
    })

    it('接收文件时应该显示"接收文件"标签', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '正在接收...', p2pStep: 2 },
        data: { progress: { percentage: 70 }, isReceiving: true },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('接收文件')).toBeInTheDocument()
    })
  })

  describe('进度显示', () => {
    it('应该正确显示进度百分比', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输中', p2pStep: 2 },
        data: { progress: { percentage: 75 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('进度为0时应该显示0%', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '开始传输', p2pStep: 1 },
        data: { progress: { percentage: 0 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('进度为100%时应该显示100%', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输完成', p2pStep: 3 },
        data: { progress: { percentage: 100 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('错误状态', () => {
    it('错误状态时应该显示Error而非百分比', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输失败', p2pStepStatus: 'error', p2pStep: 2 },
        data: { progress: { percentage: 50 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('错误状态时状态指示器应该为红色', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '连接失败', p2pStepStatus: 'error', p2pStep: 1 },
        data: { progress: { percentage: 20 }, isReceiving: true },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      // 直接查找红色指示器
      const indicator = document.querySelector('.bg-red-500')
      expect(indicator).toBeInTheDocument()
    })

    it('错误状态时进度条应该为红色', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输错误', p2pStepStatus: 'error', p2pStep: 2 },
        data: { progress: { percentage: 45 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      const progressBar = document.querySelector('.bg-red-500')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('取消按钮', () => {
    it('传输进行中应该显示取消按钮', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '正在传输', p2pStep: 2 },
        data: { progress: { percentage: 60 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('取消传输')).toBeInTheDocument()
    })

    it('点击取消按钮应该调用cancelTransfer', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输中', p2pStep: 2 },
        data: { progress: { percentage: 40 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      fireEvent.click(screen.getByText('取消传输'))
      expect(mockCancelTransfer).toHaveBeenCalledTimes(1)
    })

    it('错误状态时不应该显示取消按钮', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输失败', p2pStepStatus: 'error', p2pStep: 2 },
        data: { progress: { percentage: 30 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.queryByText('取消传输')).not.toBeInTheDocument()
    })

    it('进度完成100%时不应该显示取消按钮', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输完成', p2pStep: 3 },
        data: { progress: { percentage: 100 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.queryByText('取消传输')).not.toBeInTheDocument()
    })
  })

  describe('状态文字显示', () => {
    it('应该显示自定义状态文字', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '自定义状态文字', p2pStep: 2 },
        data: { isReceiving: true },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('自定义状态文字')).toBeInTheDocument()
    })

    it('接收模式无自定义文字时应该显示默认接收提示', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '', p2pStep: 2 },
        data: { isReceiving: true },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('📥 正在接收...')).toBeInTheDocument()
    })

    it('发送模式无自定义文字且步骤为1时应该显示等待响应', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '', p2pStep: 1 },
        data: { isReceiving: false },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('等待响应...')).toBeInTheDocument()
    })

    it('发送模式无自定义文字且步骤大于1时应该显示发送提示', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '', p2pStep: 2 },
        data: { isReceiving: false },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      expect(screen.getByText('📤 正在发送...')).toBeInTheDocument()
    })
  })

  describe('动画效果', () => {
    it('步骤1-2应该显示 shimmer 动画', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '传输中', p2pStep: 1 },
        data: { progress: { percentage: 20 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      const shimmerElement = document.querySelector(
        '.animate-\\[shimmer_1s_infinite\\]',
      )
      expect(shimmerElement).toBeInTheDocument()
    })

    it('步骤3不应该显示 shimmer 动画', () => {
      const mockP2P = createMockP2P({
        ui: { statusText: '即将完成', p2pStep: 3 },
        data: { progress: { percentage: 90 } },
      })

      render(<TransferStatusPanel p2p={mockP2P} />)
      vi.runAllTimers()

      const shimmerElement = document.querySelector(
        '.animate-\\[shimmer_1s_infinite\\]',
      )
      expect(shimmerElement).not.toBeInTheDocument()
    })
  })
})
