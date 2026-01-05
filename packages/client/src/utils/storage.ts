import { del, get, set } from 'idb-keyval'

// 配置常量
const NICNAME_KEY = 'lp_username'
const NICNAME_EXPIRE_DAYS = 7
const VIDEO_EXPIRE_HOURS = 24

interface StoredNickname {
  value: string
  expiresAt: number
}

interface StoredVideoHandle {
  handle: FileSystemFileHandle
  name: string
  expiresAt: number
}

// --- LocalStorage (Nickname) ---

export const saveNickname = (name: string) => {
  const data: StoredNickname = {
    value: name,
    expiresAt: Date.now() + NICNAME_EXPIRE_DAYS * 24 * 60 * 60 * 1000,
  }
  localStorage.setItem(NICNAME_KEY, JSON.stringify(data))
}

export const getNickname = (): string | null => {
  try {
    const raw = localStorage.getItem(NICNAME_KEY)
    if (!raw) return null
    const data: StoredNickname = JSON.parse(raw)

    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(NICNAME_KEY)
      return null
    }
    return data.value
  } catch (e) {
    console.error('Failed to get nickname from localStorage:', e)
    return null
  }
}

// --- IndexedDB (Video Handle) ---

const getVideoKey = (roomId: string) => `lp_video_${roomId}`

export const saveVideoHandle = async (
  roomId: string,
  handle: FileSystemFileHandle,
) => {
  const data: StoredVideoHandle = {
    handle,
    name: handle.name,
    expiresAt: Date.now() + VIDEO_EXPIRE_HOURS * 60 * 60 * 1000,
  }
  await set(getVideoKey(roomId), data)
}

export const getVideoHandle = async (
  roomId: string,
): Promise<FileSystemFileHandle | null> => {
  try {
    const data = await get<StoredVideoHandle>(getVideoKey(roomId))
    if (!data) return null

    if (Date.now() > data.expiresAt) {
      await del(getVideoKey(roomId))
      return null
    }
    return data.handle
  } catch (e) {
    console.error('Failed to get video handle from IndexedDB:', e)
    return null
  }
}

export const clearVideoHandle = async (roomId: string) => {
  await del(getVideoKey(roomId))
}
