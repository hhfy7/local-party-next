import '@testing-library/jest-dom'
import { vi } from 'vitest'

// @ts-expect-error - global assignment for test environment
;(global as any).CSS = {
  supports: vi.fn(() => false),
  escape: vi.fn(str => str),
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// @ts-expect-error - global assignment for test environment
;(global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// @ts-expect-error - global assignment for test environment
;(global as any).WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
  configurable: true,
  value: 0,
  writable: true,
})

Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
  configurable: true,
  value: 100,
  writable: true,
})

Object.defineProperty(HTMLVideoElement.prototype, 'paused', {
  configurable: true,
  value: true,
  writable: true,
})

// @ts-expect-error - global assignment for test environment
;(global as any).RTCPeerConnection = vi.fn(() => ({
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  setLocalDescription: vi.fn(_desc => Promise.resolve()),
  setRemoteDescription: vi.fn(_desc => Promise.resolve()),
  addIceCandidate: vi.fn(_candidate => Promise.resolve()),
  close: vi.fn(),
  connectionState: 'new',
  iceConnectionState: 'new',
  signalingState: 'stable',
  onicecandidate: null,
  onconnectionstatechange: null,
  ondatachannel: null,
  onnegotiationneeded: null,
  createDataChannel: vi.fn(label => ({
    label,
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
}))

// @ts-expect-error - global assignment for test environment
;(global as any).MediaStream = vi.fn().mockImplementation(() => ({
  getTracks: vi.fn().mockReturnValue([]),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  clone: vi.fn(),
}))

// @ts-expect-error - global assignment for test environment
;(global as any).MediaStreamTrack = vi.fn().mockImplementation(() => ({
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

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

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  },
}))

const originalError = console.error
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return
  }
  originalError.call(console, ...args)
}
