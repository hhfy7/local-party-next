import { describe, it, expect } from 'vitest'
import {
  buildMockRoom,
  buildMockUser,
  createMockServerSocket,
} from '../utils/testUtils'

describe('Example Server Tests', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true)
  })

  it('should create mock user correctly', () => {
    const user = buildMockUser({ name: 'Test User' })
    expect(user.name).toBe('Test User')
    expect(user.id).toBeDefined()
    expect(user.isHost).toBe(false)
  })

  it('should create mock room correctly', () => {
    const room = buildMockRoom({ name: 'Test Room' })
    expect(room.name).toBe('Test Room')
    expect(room.id).toBeDefined()
    expect(room.users).toEqual([])
  })

  it('should create mock server socket correctly', () => {
    const socket = createMockServerSocket()
    expect(socket.emit).toBeDefined()
    expect(socket.broadcast.emit).toBeDefined()
    expect(socket.to).toBeDefined()
  })
})
