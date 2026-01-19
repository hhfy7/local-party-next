import toast from 'react-hot-toast'

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
