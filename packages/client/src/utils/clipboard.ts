import toast from 'react-hot-toast'

export const copyToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      toast.success('链接已复制', { icon: '🔗' })
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
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        toast.success('链接已复制', { icon: '🔗' })
      } else {
        throw new Error('Fallback copy failed')
      }
    }
  } catch (err) {
    console.error('Copy failed', err)
    toast.error('复制失败，请手动复制地址栏')
  }
}
