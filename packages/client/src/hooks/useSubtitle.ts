import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { srtToVtt, createSubtitleUrl } from '@/utils/subtitle'
import toast from 'react-hot-toast'

export const useSubtitle = () => {
  const { socket, currentUser, hostId } = useAppStore()
  const isHost = currentUser?.id === hostId
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null)
  const [subtitleName, setSubtitleName] = useState<string | null>(null)

  // 接收端：监听字幕同步事件
  useEffect(() => {
    if (!socket) return

    const handleSubtitle = (data: {
      content: string
      name: string
      type: 'vtt' | 'srt'
    }) => {
      console.log('[Subtitle] Received:', data.name)
      let vttContent = data.content

      // 如果是 SRT，先转换
      if (data.type === 'srt') {
        vttContent = srtToVtt(data.content)
      }

      // 创建 Blob URL
      const url = createSubtitleUrl(vttContent)

      // 释放旧 URL
      setSubtitleUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setSubtitleName(data.name)

      if (!isHost) {
        toast.success(`已加载字幕: ${data.name}`)
      }
    }

    socket.on('subtitle_synced', handleSubtitle)

    return () => {
      socket.off('subtitle_synced', handleSubtitle)
    }
  }, [socket, isHost])

  // 发送端：处理文件上传
  const handleUploadSubtitle = useCallback(
    async (file: File) => {
      if (!socket || !isHost) return

      try {
        const text = await file.text()
        const isSrt = file.name.endsWith('.srt')
        const type = isSrt ? 'srt' : 'vtt'

        // 立即在本地生效
        const vttContent = isSrt ? srtToVtt(text) : text
        const url = createSubtitleUrl(vttContent)

        setSubtitleUrl(prev => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        setSubtitleName(file.name)

        // 广播给所有人
        socket.emit('sync_subtitle', {
          content: text, // 发送原始内容，接收端处理转换
          name: file.name,
          type,
        })

        toast.success('字幕已同步给所有成员')
      } catch (error) {
        console.error('Subtitle upload failed:', error)
        toast.error('字幕解析失败')
      }
    },
    [socket, isHost],
  )

  return {
    subtitleUrl,
    subtitleName,
    handleUploadSubtitle,
  }
}
