import toast from 'react-hot-toast'
import { Socket } from 'socket.io-client'
import { useAppStore } from '@/stores/useAppStore'

export const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // 降级方案：创建临时 input
      const textArea = document.createElement('textarea')
      textArea.value = text

      // 避免手机上键盘弹出
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '0'

      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.body.removeChild(textArea)
    }
  } catch (err) {
    console.error('Copy failed', err)
    toast.error('复制失败，请手动复制地址栏')
  }
}

/**
 * 复制房间邀请链接
 * @param roomId - 房间 ID
 * @param socket - Socket 实例（可选，如果不传则从 store 获取）
 * @returns 复制是否成功
 */
export async function copyRoomInviteLink(
  roomId: string,
  socket?: Socket | null,
): Promise<boolean> {
  const finalSocket = socket || useAppStore.getState().socket

  if (!finalSocket) {
    console.error('Socket not connected')
    return false
  }

  return new Promise(resolve => {
    finalSocket.emit(
      'generate_invite_token',
      { roomId },
      (res: { success: boolean; token?: string; error?: string }) => {
        if (res.success && res.token) {
          const inviteUrl = `${window.location.origin}/room/${roomId}?token=${res.token}`

          navigator.clipboard
            .writeText(inviteUrl)
            .then(() => {
              console.log('Invite link copied to clipboard')
              resolve(true)
            })
            .catch(err => {
              console.error('Failed to copy to clipboard:', err)
              resolve(false)
            })
        } else if (res.error === '房间无密码') {
          // 降级方案：复制不带 token 的链接
          const inviteUrl = `${window.location.origin}/room/${roomId}`

          navigator.clipboard
            .writeText(inviteUrl)
            .then(() => {
              console.log('Invite link (without token) copied to clipboard')
              resolve(true)
            })
            .catch(err => {
              console.error('Failed to copy to clipboard:', err)
              resolve(false)
            })
        } else {
          console.error('Failed to generate invite token:', res.error)
          resolve(false)
        }
      },
    )
  })
}
