import { RoomState } from '@local-party/shared/src/types'

// 核心内存存储：RoomID -> RoomState
const rooms = new Map<string, RoomState>()

// 缓刑计时器存储：RoomID -> Timer
const cleanupTimers = new Map<string, NodeJS.Timeout>()

// 缓刑时间：5 分钟
const GRACE_PERIOD = 5 * 60 * 1000

export const roomStore = {
  getRoom: (roomId: string) => rooms.get(roomId),

  createRoom: (room: RoomState) => {
    // 如果创建了一个正在缓刑的房间 ID（极低概率），先取消其清理任务
    roomStore.cancelCleanup(room.id)
    rooms.set(room.id, room)
    return room
  },

  deleteRoom: (roomId: string) => {
    roomStore.cancelCleanup(roomId)
    return rooms.delete(roomId)
  },

  // --- 缓刑逻辑 ---

  // 计划清理：当房间人数为 0 时调用
  scheduleCleanup: (roomId: string) => {
    roomStore.cancelCleanup(roomId) // 确保没有重复计时器

    const timer = setTimeout(() => {
      console.log(`[Grace Period Expired] Deleting room: ${roomId}`)
      rooms.delete(roomId)
      cleanupTimers.delete(roomId)
    }, GRACE_PERIOD)

    cleanupTimers.set(roomId, timer)
  },

  // 取消清理：当有人重新加入时调用
  cancelCleanup: (roomId: string) => {
    const timer = cleanupTimers.get(roomId)
    if (timer) {
      clearTimeout(timer)
      cleanupTimers.delete(roomId)
      console.log(`[Grace Period Cancelled] Room recovered: ${roomId}`)
    }
  },

  // 调试用
  getAllRooms: () => Object.fromEntries(rooms),
}
