import { vi, Mock } from 'vitest'
import { Request, Response, NextFunction } from 'express'

// Mock function with proper typing
export function createMockFn<T extends (...args: any[]) => any>(): Mock<T> {
  return vi.fn()
}

// Create mock Express request
export function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'GET',
    url: '/',
    ...overrides,
  } as Request
}

// Create mock Express response
export function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
    getHeader: vi.fn(),
  } as unknown as Response

  return res
}

// Create mock Express next function
export function createMockNext(): NextFunction {
  return vi.fn()
}

// Mock socket.io server
export function createMockServerSocket() {
  return {
    emit: vi.fn(),
    broadcast: {
      emit: vi.fn(),
    },
    to: vi.fn().mockReturnThis(),
    join: vi.fn(),
    leave: vi.fn(),
    disconnect: vi.fn(),
    id: 'mock-socket-id',
    handshake: {
      query: {},
      headers: {},
    },
  }
}

// Test data builders
export function buildMockRoom(overrides?: Partial<any>) {
  return {
    id: 'room-123',
    name: 'Test Room',
    users: [],
    videoUrl: null,
    currentTime: 0,
    isPlaying: false,
    createdAt: new Date(),
    ...overrides,
  }
}

export function buildMockUser(overrides?: Partial<any>) {
  return {
    id: 'user-123',
    socketId: 'socket-123',
    name: 'Test User',
    isHost: false,
    joinedAt: new Date(),
    ...overrides,
  }
}

export function buildMockVideoState(overrides?: Partial<any>) {
  return {
    currentTime: 0,
    duration: 100,
    isPlaying: false,
    playbackRate: 1,
    ...overrides,
  }
}

// Async test helpers
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve))
}
