import { vi } from 'vitest'
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, options)
}

export function createMockFn() {
  return vi.fn()
}

export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface MockUser {
  id: string
  name: string
  isHost: boolean
}

interface MockRoom {
  id: string
  name: string
  users: MockUser[]
  videoUrl: string | null
  currentTime: number
  isPlaying: boolean
}

interface MockSocket {
  emit: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  connected: boolean
  id: string
}

export function buildMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test User',
    isHost: false,
    ...overrides,
  }
}

export function buildMockRoom(overrides?: Partial<MockRoom>): MockRoom {
  return {
    id: `room-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Room',
    users: [],
    videoUrl: null,
    currentTime: 0,
    isPlaying: false,
    ...overrides,
  }
}

export function createMockSocket(): MockSocket {
  return {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    connected: true,
    id: `socket-${Math.random().toString(36).substr(2, 9)}`,
  }
}

export function createMockPeerConnection() {
  return {
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: vi
      .fn()
      .mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    connectionState: 'new',
    iceConnectionState: 'new',
    signalingState: 'stable',
    onicecandidate: null,
    onconnectionstatechange: null,
    ondatachannel: null,
    onnegotiationneeded: null,
    createDataChannel: vi.fn(() => ({
      send: vi.fn(),
      close: vi.fn(),
      readyState: 'open',
      bufferedAmount: 0,
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

export function createMockVideoElement() {
  return {
    currentTime: 0,
    duration: 100,
    paused: true,
    volume: 1,
    playbackRate: 1,
    readyState: 4,
    networkState: 1,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    load: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }
}
