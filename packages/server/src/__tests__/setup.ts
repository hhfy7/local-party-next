import { vi, afterEach, afterAll } from 'vitest'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock process.env
process.env.NODE_ENV = 'test'
process.env.PORT = '4000'

// Mock setTimeout and setInterval to use fake timers
vi.useFakeTimers()

// Global test cleanup
afterEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
})

afterAll(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})
