/**
 * useAppStore 单元测试
 * 测试 Zustand 全局状态管理的核心逻辑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'

// 由于 useAppStore 包含 socket.io-client 的导入，我们需要先 mock 它
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  })),
}))

// 导入需要在 mock 之后
import { useAppStore } from '../useAppStore'

// ============================================
// Mock 数据工厂
// ============================================
// 注意：实际 User 类型来自 @local-party/shared/src/types
// interface User {
//   id: string
//   username: string
//   clientId: string
//   roomId: string
//   videoDuration?: number
//   fileName?: string
// }

function createMockUser(
  overrides?: Partial<{
    id: string
    username: string
    clientId: string
    roomId: string
    videoDuration: number
    fileName: string
  }>,
): {
  id: string
  username: string
  clientId: string
  roomId: string
  videoDuration?: number
  fileName?: string
} {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    username: 'testuser',
    clientId: `client-${Math.random().toString(36).substr(2, 9)}`,
    roomId: 'room-123',
    videoDuration: 120,
    fileName: 'test-video.mp4',
    ...overrides,
  }
}

function createMockRoomData(
  overrides?: Partial<{
    roomId: string
    hostId: string
    users: Array<{
      id: string
      username: string
      clientId: string
      roomId: string
      videoDuration?: number
      fileName?: string
    }>
  }>,
): {
  roomId: string
  hostId: string
  users: Array<{
    id: string
    username: string
    clientId: string
    roomId: string
    videoDuration?: number
    fileName?: string
  }>
} {
  return {
    roomId: 'test-room-123',
    hostId: 'host-user',
    users: [createMockUser()],
    ...overrides,
  }
}

// ============================================
// 测试套件
// ============================================
describe('useAppStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useAppStore.setState({
      socket: null,
      connected: false,
      currentUser: null,
      roomId: null,
      hostId: null,
      users: [],
      messages: [],
      lastAction: null,
      lastActionAt: 0,
      connectionError: false,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // 初始状态测试
  // ============================================
  describe('初始状态', () => {
    it('socket 应为 null', () => {
      const state = useAppStore.getState()
      expect(state.socket).toBeNull()
    })

    it('connected 应为 false', () => {
      const state = useAppStore.getState()
      expect(state.connected).toBe(false)
    })

    it('currentUser 应为 null', () => {
      const state = useAppStore.getState()
      expect(state.currentUser).toBeNull()
    })

    it('roomId 应为 null', () => {
      const state = useAppStore.getState()
      expect(state.roomId).toBeNull()
    })

    it('hostId 应为 null', () => {
      const state = useAppStore.getState()
      expect(state.hostId).toBeNull()
    })

    it('users 应为空数组', () => {
      const state = useAppStore.getState()
      expect(state.users).toEqual([])
    })

    it('messages 应为空数组', () => {
      const state = useAppStore.getState()
      expect(state.messages).toEqual([])
    })

    it('lastAction 应为 null', () => {
      const state = useAppStore.getState()
      expect(state.lastAction).toBeNull()
    })

    it('lastActionAt 应为 0', () => {
      const state = useAppStore.getState()
      expect(state.lastActionAt).toBe(0)
    })

    it('connectionError 应为 false', () => {
      const state = useAppStore.getState()
      expect(state.connectionError).toBe(false)
    })
  })

  // ============================================
  // socket 连接管理测试
  // ============================================
  describe('socket 连接管理', () => {
    it('connect 应创建 socket 实例', () => {
      act(() => {
        useAppStore.getState().connect()
      })

      const state = useAppStore.getState()
      expect(state.socket).not.toBeNull()
    })

    it('disconnect 应断开连接并清理状态', () => {
      act(() => {
        useAppStore.getState().connect()
        useAppStore.getState().disconnect()
      })

      const state = useAppStore.getState()
      expect(state.socket).toBeNull()
      expect(state.connected).toBe(false)
    })
  })

  // ============================================
  // 用户管理测试
  // ============================================
  describe('用户管理', () => {
    it('addUser 应添加用户到列表', () => {
      const user = createMockUser()

      act(() => {
        useAppStore.getState().addUser(user)
      })

      const state = useAppStore.getState()
      expect(state.users).toHaveLength(1)
      expect(state.users[0].id).toBe(user.id)
    })

    it('addUser 应支持添加多个用户', () => {
      const user1 = createMockUser()
      const user2 = createMockUser()

      act(() => {
        useAppStore.getState().addUser(user1)
        useAppStore.getState().addUser(user2)
      })

      const state = useAppStore.getState()
      expect(state.users).toHaveLength(2)
    })

    it('removeUser 应从列表中移除用户', () => {
      const user1 = createMockUser({ id: 'user-1' })
      const user2 = createMockUser({ id: 'user-2' })

      act(() => {
        useAppStore.getState().addUser(user1)
        useAppStore.getState().addUser(user2)
        useAppStore.getState().removeUser('user-1')
      })

      const state = useAppStore.getState()
      expect(state.users).toHaveLength(1)
      expect(state.users[0].id).toBe('user-2')
    })

    it('removeUser 应处理不存在的用户', () => {
      act(() => {
        useAppStore.getState().removeUser('non-existent')
      })

      const state = useAppStore.getState()
      expect(state.users).toHaveLength(0)
    })

    it('setCurrentUser 应更新当前用户', () => {
      const user = createMockUser()

      act(() => {
        useAppStore.getState().setCurrentUser(user)
      })

      const state = useAppStore.getState()
      expect(state.currentUser).toEqual(user)
    })
  })

  // ============================================
  // 房间信息管理测试
  // ============================================
  describe('房间信息管理', () => {
    it('setRoomInfo 应更新房间信息', () => {
      const roomData = createMockRoomData()

      act(() => {
        useAppStore.getState().setRoomInfo(roomData.roomId, roomData.users, [])
      })

      const state = useAppStore.getState()
      expect(state.roomId).toBe(roomData.roomId)
      expect(state.users).toEqual(roomData.users)
    })
  })

  // ============================================
  // 同步操作测试
  // ============================================
  describe('同步操作管理', () => {
    it('setLastAction 应更新最后操作', () => {
      const action = { type: 'play' as const, timestamp: 100 }

      act(() => {
        useAppStore.getState().setLastAction(action)
      })

      const state = useAppStore.getState()
      expect(state.lastAction).toEqual(action)
      expect(state.lastActionAt).toBeGreaterThan(0)
    })

    it('应支持不同类型的同步操作', () => {
      const actions = [
        { type: 'play' as const, timestamp: 0 },
        { type: 'pause' as const, timestamp: 100 },
        { type: 'seek' as const, timestamp: 50 },
      ]

      act(() => {
        actions.forEach(action => {
          useAppStore.getState().setLastAction(action)
        })
      })

      const state = useAppStore.getState()
      expect(state.lastAction).toEqual(actions[2])
    })
  })

  // ============================================
  // 边界情况测试
  // ============================================
  describe('边界情况测试', () => {
    it('disconnect 时 socket 为 null 不应报错', () => {
      act(() => {
        useAppStore.getState().disconnect()
      })

      // 不应抛出异常
      expect(useAppStore.getState().socket).toBeNull()
    })

    it('addUser 应处理重复用户', () => {
      const user = createMockUser({ id: 'user-1' })

      act(() => {
        useAppStore.getState().addUser(user)
        useAppStore.getState().addUser(user)
      })

      const state = useAppStore.getState()
      expect(state.users).toHaveLength(2)
    })

    it('removeUser 应处理空用户列表', () => {
      act(() => {
        useAppStore.getState().removeUser('any-user')
      })

      const state = useAppStore.getState()
      expect(state.users).toHaveLength(0)
    })

    it('setCurrentUser 应支持设置为 null', () => {
      const user = createMockUser()

      act(() => {
        useAppStore.getState().setCurrentUser(user)
        useAppStore.getState().setCurrentUser(null as any)
      })

      const state = useAppStore.getState()
      expect(state.currentUser).toBeNull()
    })

    it('应支持顺序更新多个状态', () => {
      act(() => {
        // 顺序更新多个状态
        useAppStore.getState().setRoomInfo('room-1', [], [])
        useAppStore.getState().setLastAction({ type: 'play', timestamp: 0 })
      })

      const state = useAppStore.getState()
      expect(state.roomId).toBe('room-1')
      expect(state.lastAction).toEqual({ type: 'play', timestamp: 0 })
    })
  })
})
