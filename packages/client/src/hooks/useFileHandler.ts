import { useEffect, useState } from 'react'
import {
  clearVideoHandle,
  getVideoHandle,
  saveVideoHandle,
} from '@/utils/storage'
import toast from 'react-hot-toast'

export const useFileHandler = (roomId?: string) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [cachedFileHandle, setCachedFileHandle] =
    useState<FileSystemFileHandle | null>(null)
  // 新增：直接存储 File 对象（用于 iPad/Fallback 场景）
  const [fileObject, setFileObject] = useState<File | null>(null)

  // 1. 初始化检查缓存
  useEffect(() => {
    if (roomId) {
      // 每次 roomId 变化都尝试读取，不依赖 videoUrl
      console.log('[FileHandler] Checking cache for room:', roomId)
      getVideoHandle(roomId).then(handle => {
        console.log('[FileHandler] Cache result:', handle ? 'Found' : 'Empty')
        if (handle) setCachedFileHandle(handle)
      })
    }
  }, [roomId])

  // Helper: 加载文件对象
  const loadVideo = (file: File) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
  }

  // Action: 选择文件 (支持 File System Access API)
  const pickFile = async () => {
    try {
      // 检查浏览器是否支持 showOpenFilePicker
      if ('showOpenFilePicker' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Video Files',
              accept: { 'video/*': ['.mp4', '.mkv', '.webm'] },
            },
          ],
          multiple: false,
        })
        const file = await handle.getFile()
        if (roomId) await saveVideoHandle(roomId, handle)
        loadVideo(file)

        // 保存句柄和文件对象
        setCachedFileHandle(handle)
        setFileObject(file)
      } else {
        // 降级方案 (iPad / Firefox / Insecure)
        console.warn(
          '[FileHandler] File System Access API not available. Fallback to input.',
        )
        if (!window.isSecureContext) {
          console.warn(
            '[FileHandler] Reason: Insecure context (HTTP). Please use HTTPS or localhost.',
          )
        }
        document.getElementById('hidden-file-input')?.click()
      }
    } catch (err) {
      // 用户取消选择，不做处理
      if ((err as Error).name === 'AbortError') return
      console.log('File pick cancelled:', err)
    }
  }

  // Action: 从缓存恢复
  const restoreCachedVideo = async () => {
    if (!cachedFileHandle) return
    try {
      // 显式请求权限
      const mode = 'read' as const
      const currentPermission = await cachedFileHandle.queryPermission({ mode })
      if (currentPermission !== 'granted') {
        const requestPermission = await cachedFileHandle.requestPermission({
          mode,
        })
        if (requestPermission !== 'granted') {
          throw new Error('Permission to access file was denied.')
        }
      }

      const file = await cachedFileHandle.getFile()
      loadVideo(file)
      setFileObject(file) // 恢复缓存时也设置 fileObject
      toast.success('视频已恢复', { icon: '💿' })
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('Video Restore Failed:', err)
      toast.error('无法访问上次的文件，可能已被移动或删除。')
      if (roomId) await clearVideoHandle(roomId)
      setCachedFileHandle(null)
      setFileObject(null)
    }
  }

  // Action: 直接设置文件 (用于 P2P 接收)
  const setVideoFile = (file: File) => {
    loadVideo(file)
    setFileObject(file)
    setCachedFileHandle(null) // P2P 接收的文件没有持久化句柄
  }

  // Action: Input降级处理
  const handleInputSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadVideo(file)
      setFileObject(file) // 关键：保存 File 对象

      // Input 选择的文件没有 FileHandle
      if (roomId) clearVideoHandle(roomId)
      setCachedFileHandle(null)
    }
  }

  return {
    videoUrl,
    cachedFileHandle,
    fileObject, // 暴露给外部使用
    pickFile,
    restoreCachedVideo,
    handleInputSelect,
    setVideoFile,
  }
}
