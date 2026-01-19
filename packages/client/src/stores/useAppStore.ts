import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import {
  ChatMessage,
  ClientToServerEvents,
  ServerToClientEvents,
  SyncAction,
  User,
} from '@local-party/shared/src/types'
import { SOCKET_URL } from '@/utils/constants'

interface AppState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
  connected: boolean
  currentUser: User | null
  roomId: string | null
  hostId: string | null
  users: User[]
  messages: ChatMessage[]
  lastAction: SyncAction | null
  lastActionAt: number
  connectionError: boolean

  // Actions
  connect: () => void
  disconnect: () => void
  setCurrentUser: (user: User) => void
  setRoomInfo: (roomId: string, users: User[], history: ChatMessage[]) => void
  setLastAction: (action: SyncAction) => void
  addUser: (user: User) => void
  removeUser: (userId: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
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

  connect: () => {
    if (get().socket) return

    const socket = io(SOCKET_URL)

    socket.on('connect', () => {
      set({ connected: true, connectionError: false })
      console.log('Socket Connected:', socket.id)
    })

    socket.on('connect_error', err => {
      console.error('Socket Connection Error:', err)
      set({ connectionError: true })
    })

    socket.on('disconnect', () => {
      set({ connected: false })
      console.log('Socket Disconnected')
    })

    // 监听通用事件
    socket.on('room_joined', data => {
      const me =
        data.users.find(
          (u: { id: string | undefined }) => u.id === socket.id,
        ) || null
      set({
        roomId: data.roomId,
        hostId: data.hostId,
        users: data.users,
        messages: data.history,
        currentUser: me,
        lastAction: data.currentStatus || null,
        lastActionAt: Date.now(), // 更新时间戳
      })
    })

    socket.on('host_updated', newHostId => {
      set({ hostId: newHostId })
    })

    socket.on('user_joined', user => {
      set(state => ({ users: [...state.users, user] }))
    })

    socket.on('user_updated', updatedUser => {
      set(state => ({
        users: state.users.map(u =>
          u.id === updatedUser.id ? updatedUser : u,
        ),
      }))
    })

    socket.on('user_left', userId => {
      set(state => ({ users: state.users.filter(u => u.id !== userId) }))
    })

    socket.on('receive_message', msg => {
      set(state => ({ messages: [...state.messages, msg] }))
    })

    // 监听同步事件更新 lastAction
    socket.on('receive_sync', action => {
      set({ lastAction: action, lastActionAt: Date.now() }) // 更新时间戳
    })

    set({ socket })
  },

  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false })
    }
  },

  setCurrentUser: user => set({ currentUser: user }),
  setRoomInfo: (roomId, users, history) =>
    set({ roomId, users, messages: history }),
  setLastAction: action =>
    set({ lastAction: action, lastActionAt: Date.now() }),
  addUser: user => set(state => ({ users: [...state.users, user] })),
  removeUser: userId =>
    set(state => ({ users: state.users.filter(u => u.id !== userId) })),
}))
