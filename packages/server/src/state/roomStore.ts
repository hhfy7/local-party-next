import { RoomState } from '@local-party/shared/src/types'

// 核心内存存储：RoomID -> RoomState
const rooms = new Map<string, RoomState>()

export const roomStore = {
  getRoom: (roomId: string) => rooms.get(roomId),
  
  createRoom: (room: RoomState) => {
    rooms.set(room.id, room)
    return room
  },

  deleteRoom: (roomId: string) => {
    return rooms.delete(roomId)
  },

  // 调试用
  getAllRooms: () => Object.fromEntries(rooms)
}
