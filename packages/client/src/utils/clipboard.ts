import toast from 'react-hot-toast'

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
