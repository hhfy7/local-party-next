import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/stores/useAppStore'
import { getNickname, saveNickname, saveLastRoom } from '@/utils/storage'
import toast from 'react-hot-toast'

export const useRoomLogic = (roomId?: string) => {
  const navigate = useNavigate()
  const { currentUser, socket, connect, connected } = useAppStore()

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  // 优化：使用函数式初始化，避免在 effect 中直接设置 state
  const [isAutoJoining, setIsAutoJoining] = useState(() => {
    return !!getNickname() && !useAppStore.getState().currentUser
  })
  const autoJoinAttempted = useRef(false)

  // 1. 确保连接
  useEffect(() => {
    connect()
  }, [connect])

  // 2. 核心加入逻辑 (使用 useCallback 优化)
  const handleJoin = useCallback(
    (username: string, isAuto = false) => {
      if (!socket || !roomId) return

      console.log(
        `[Client] Joining room: "${roomId}" with username: "${username}"`,
      )

      socket.emit(
        'join_room',
        {
          username,
          roomId,
          password: '',
          videoMeta: { duration: 0, fileSize: 0 },
        },
        (res: { success: boolean; error?: string }) => {
          setIsAutoJoining(false)

          if (res.success) {
            saveNickname(username)
            saveLastRoom(roomId)
            if (!isAuto) toast.success(`欢迎加入, ${username}!`, { icon: '🎉' })
          } else {
            if (isAuto) {
              console.warn('[Auto Join Failed]', res.error)
              if (res.error === '房间不存在') {
                setErrorMsg('房间不存在')
                if (!import.meta.env.PROD) {
                  toast('开发环境提示: 后端可能重启了，房间数据已丢失。', {
                    icon: '🐛',
                  })
                }
              }
            } else {
              toast.error('加入失败: ' + (res.error || '未知错误'))
              if (res.error === '房间不存在') {
                setErrorMsg('房间不存在')
                if (!import.meta.env.PROD) {
                  toast('开发环境提示: 后端可能重启了，房间数据已丢失。', {
                    icon: '🐛',
                  })
                }
              }
            }
          }
        },
      )
    },
    [socket, roomId],
  )

  // 3. 自动登录尝试
  useEffect(() => {
    if (
      socket &&
      connected &&
      roomId &&
      !currentUser &&
      !autoJoinAttempted.current
    ) {
      const cachedName = getNickname()
      if (cachedName) {
        autoJoinAttempted.current = true
        // 状态已经在初始化时设置，这里只需调用 handleJoin
        console.log('[Auto Join] Attempting with:', cachedName)
        handleJoin(cachedName, true)
      }
    }
  }, [socket, connected, roomId, currentUser, handleJoin])

  // 3. 核心创建逻辑 (用于重生)
  const handleCreate = useCallback(() => {
    if (!socket) return
    const username = getNickname() || '新用户'

    socket.emit(
      'create_room',
      {
        username,
        roomName: `${username}的房间`,
        password: '',
        videoMeta: { duration: 0, fileSize: 0 },
      },
      (res: { success: boolean; roomId?: string; error?: string }) => {
        if (res.success && res.roomId) {
          saveLastRoom(res.roomId)
          toast.success('新房间已开启', { icon: '✨' })
          navigate(`/room/${res.roomId}`)
          setErrorMsg(null)
        } else {
          toast.error('创建失败: ' + (res.error || '未知错误'))
        }
      },
    )
  }, [socket, navigate])

  return {
    currentUser,
    isAutoJoining,
    errorMsg,
    handleJoin,
    handleCreate,
    navigate,
  }
}
