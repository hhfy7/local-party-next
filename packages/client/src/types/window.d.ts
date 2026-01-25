/**
 * File System Access API 类型定义
 * 参考: https://developer.mozilla.org/en-US/docs/Web/API/window/showOpenFilePicker
 */

export {}

declare global {
  interface Window {
    showOpenFilePicker(
      options?: FilePickerOptions,
    ): Promise<FileSystemFileHandle[]>
  }

  interface FilePickerOptions {
    multiple?: boolean
    types?: FilePickerAcceptType[]
    excludeAcceptAllOption?: boolean
  }

  interface FilePickerAcceptType {
    description?: string
    accept: Record<string, string | string[]>
  }

  interface FileSystemFileHandle {
    kind: 'file'
    name: string
    getFile(): Promise<File>
    createWritable(
      options?: FileSystemCreateWritableOptions,
    ): Promise<FileSystemWritableFileStream>
    queryPermission(options?: {
      mode: 'read' | 'readwrite'
    }): Promise<PermissionState>
    requestPermission(options?: {
      mode: 'read' | 'readwrite'
    }): Promise<PermissionState>
  }

  interface FileSystemWritableFileStream {
    write(data: BufferSource | Blob | string): Promise<void>
    close(): Promise<void>
    seek(position: number): Promise<void>
    truncate(size: number): Promise<void>
  }

  interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean
  }
}
