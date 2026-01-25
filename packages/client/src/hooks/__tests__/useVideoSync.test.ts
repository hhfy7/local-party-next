import { renderHook, act } from '@testing-library/react'
import { useVideoSync } from '../useVideoSync'
import { Socket } from 'socket.io-client'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useVideoSync', () => {
  let mockSocket: Partial<Socket>
  let mockVideo: Partial<HTMLVideoElement>
  let videoRef: { current: HTMLVideoElement | null }
  let eventListeners: Record<string, EventListener> = {}

  beforeEach(() => {
    vi.useFakeTimers()
    eventListeners = {}

    // Mock Socket
    mockSocket = {
      emit: vi.fn(),
      off: vi.fn(),
    }
    mockSocket.on = vi.fn((event, handler) => {
      // @ts-ignore
      mockSocket[`_on_${event}`] = handler
      return mockSocket as Socket
    })

    // Mock Video Element
    mockVideo = {
      currentTime: 0,
      duration: 100,
      paused: true,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        eventListeners[event] = handler as EventListener
      }),
      removeEventListener: vi.fn(),
    }
    videoRef = { current: mockVideo as HTMLVideoElement }
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  // Helper to trigger socket events
  const triggerSocketEvent = (event: string, ...args: any[]) => {
    // @ts-ignore
    const handler = mockSocket[`_on_${event}`]
    if (handler) {
      act(() => {
        handler(...args)
      })
    }
  }

  // Helper to trigger DOM events
  const triggerDomEvent = (event: string) => {
    const handler = eventListeners[event]
    if (handler) {
      act(() => {
        handler(new Event(event))
      })
    }
  }

  describe('初始同步 (Initial Sync)', () => {
    it('应该在视频加载后同步到初始状态', () => {
      const lastAction = { type: 'pause' as const, timestamp: 10 }
      const { result } = renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          lastAction,
          'blob:url',
          false, // isHost
          Date.now(),
        ),
      )

      act(() => {
        result.current.handleVideoLoaded()
      })

      expect(mockVideo.currentTime).toBe(10)
      expect(mockVideo.pause).toHaveBeenCalled()
    })

    it('应该在初始播放状态下计算时间补偿', () => {
      const now = Date.now()
      const lastActionAt = now - 5000 // 5 seconds ago
      const lastAction = { type: 'play' as const, timestamp: 10 }

      const { result } = renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          lastAction,
          'blob:url',
          false,
          lastActionAt,
        ),
      )

      act(() => {
        result.current.handleVideoLoaded()
      })

      // 10s (base) + 5s (elapsed) = 15s
      expect(mockVideo.currentTime).toBeCloseTo(15, 1)
      expect(mockVideo.play).toHaveBeenCalled()
    })
  })

  describe('接收同步指令 (Receive Sync)', () => {
    it('应该响应 Play 指令', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          false,
          Date.now(),
        ),
      )

      triggerSocketEvent('receive_sync', { type: 'play', timestamp: 10 })

      expect(mockVideo.currentTime).toBe(10)
      expect(mockVideo.play).toHaveBeenCalled()
    })

    it('应该响应 Pause 指令', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          false,
          Date.now(),
        ),
      )

      triggerSocketEvent('receive_sync', { type: 'pause', timestamp: 20 })

      expect(mockVideo.currentTime).toBe(20)
      expect(mockVideo.pause).toHaveBeenCalled()
    })

    it('应该忽略微小的时间差异 (< 0.5s)', () => {
      mockVideo.currentTime = 10.2
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          false,
          Date.now(),
        ),
      )

      triggerSocketEvent('receive_sync', { type: 'play', timestamp: 10.0 })

      // Should NOT update currentTime because diff is 0.2 < 0.5
      expect(mockVideo.currentTime).toBe(10.2)
    })
  })

  describe('心跳同步 (Heartbeat Sync)', () => {
    it('应该在误差 > 2.0s 时强制同步', () => {
      mockVideo.currentTime = 10
      Object.defineProperty(mockVideo, 'paused', { value: false }) // Must be playing to sync

      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          false,
          Date.now(),
        ),
      )

      triggerSocketEvent('receive_heartbeat', { timestamp: 15, paused: false })

      // Diff is 5s > 2s, should sync
      expect(mockVideo.currentTime).toBe(15)
    })

    it('应该在本地暂停时忽略心跳同步', () => {
      mockVideo.currentTime = 10
      Object.defineProperty(mockVideo, 'paused', { value: true }) // Local paused

      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          false,
          Date.now(),
        ),
      )

      triggerSocketEvent('receive_heartbeat', { timestamp: 15, paused: false })

      // Should NOT sync
      expect(mockVideo.currentTime).toBe(10)
    })
  })

  describe('发送指令 (Send Sync)', () => {
    it('房主操作应该发送同步指令', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          true, // isHost = true
          Date.now(),
        ),
      )

      triggerDomEvent('play')

      expect(mockSocket.emit).toHaveBeenCalledWith('send_sync', {
        type: 'play',
        timestamp: 0,
      })
    })

    it('访客操作不应该发送同步指令', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          false, // isHost = false
          Date.now(),
        ),
      )

      triggerDomEvent('play')

      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'send_sync',
        expect.anything(),
      )
    })

    it('应该对 Pause 操作进行防抖', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          true,
          Date.now(),
        ),
      )

      triggerDomEvent('pause')

      // Should not emit immediately
      expect(mockSocket.emit).not.toHaveBeenCalled()

      // Fast forward 200ms
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('send_sync', {
        type: 'pause',
        timestamp: 0,
      })
    })
  })

  describe('交互锁 (Interaction Lock)', () => {
    it('应该在接收远程指令时阻止本地发送', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          true, // isHost
          Date.now(),
        ),
      )

      // 1. Receive remote sync
      triggerSocketEvent('receive_sync', { type: 'pause', timestamp: 10 })

      // 2. Trigger local event immediately (simulating the side effect of remote action)
      triggerDomEvent('pause')

      // 3. Should NOT emit send_sync
      expect(mockSocket.emit).not.toHaveBeenCalledWith(
        'send_sync',
        expect.anything(),
      )
    })

    it('应该在远程操作完成后恢复本地发送', () => {
      renderHook(() =>
        useVideoSync(
          mockSocket as Socket,
          videoRef,
          null,
          'blob:url',
          true, // isHost
          Date.now(),
        ),
      )

      // 1. Receive remote sync (Seek to 20s)
      triggerSocketEvent('receive_sync', { type: 'seek', timestamp: 20 })

      // Update mock video time to reflect the seek
      mockVideo.currentTime = 20

      // 2. Wait for lock to expire (1200ms)
      act(() => {
        vi.advanceTimersByTime(1200)
      })

      // 3. Trigger local event (e.g., Play)
      triggerDomEvent('play')

      // 4. Should emit send_sync with CORRECT timestamp
      expect(mockSocket.emit).toHaveBeenCalledWith('send_sync', {
        type: 'play',
        timestamp: 20, // Should be 20, not 0
      })
    })
  })
})
