import toast from 'react-hot-toast'

/**
 * 格式化文件大小
 * @param bytes - 字节数
 * @returns 格式化后的字符串，如 "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * 调用浏览器原生文件系统 API 保存文件，或者回退到传统下载方式
 * @param file 要保存的文件对象
 */
export const showSaveFilePicker = async (file: File) => {
  try {
    if ('showSaveFilePicker' in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: file.name,
        types: [
          {
            description: 'Video File',
            accept: { [file.type]: ['.mp4', '.mkv', '.webm'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(file)
      await writable.close()
      toast.success('文件导出成功')
    } else {
      // Fallback for browsers not supporting File System Access API
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Save failed:', err)
      toast.error('保存失败')
    }
  }
}
