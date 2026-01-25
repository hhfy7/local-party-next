import type { FileTransferProgress } from '@local-party/shared/src/types'

// 配置常量
const CHUNK_SIZE = 128 * 1024 // 128KB
const MAX_BUFFERED_AMOUNT = 512 * 1024 // 512KB

export class FileSender {
  private file: File
  private dataChannel: RTCDataChannel
  private transferId: string
  private offset = 0
  private isAborted = false
  private fileReader: FileReader

  // Callbacks
  private onProgress: (progress: FileTransferProgress) => void
  private onComplete: () => void
  private onError: (error: Error) => void

  constructor(
    file: File,
    dataChannel: RTCDataChannel,
    transferId: string,
    callbacks: {
      onProgress: (progress: FileTransferProgress) => void
      onComplete: () => void
      onError: (error: Error) => void
    },
  ) {
    this.file = file
    this.dataChannel = dataChannel
    this.transferId = transferId
    this.onProgress = callbacks.onProgress
    this.onComplete = callbacks.onComplete
    this.onError = callbacks.onError

    this.fileReader = new FileReader()
    this.fileReader.onerror = this.handleReaderError
    this.fileReader.onload = this.handleReaderLoad
  }

  public start() {
    this.sendMetadata()
    this.readSlice(0)
  }

  public abort() {
    this.isAborted = true
    this.fileReader.abort()
  }

  private sendMetadata() {
    if (this.dataChannel.readyState !== 'open') return

    const fileMeta = {
      fileName: this.file.name,
      fileSize: this.file.size,
      fileType: this.file.type,
    }

    this.dataChannel.send(
      JSON.stringify({
        type: 'file-meta',
        data: fileMeta,
      }),
    )
  }

  private readSlice = (o: number) => {
    if (this.isAborted) return

    // Backpressure control
    if (this.dataChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      setTimeout(() => this.readSlice(o), 10)
      return
    }

    const slice = this.file.slice(o, o + CHUNK_SIZE)
    this.fileReader.readAsArrayBuffer(slice)
  }

  private handleReaderLoad = (e: ProgressEvent<FileReader>) => {
    if (this.isAborted || !e.target?.result) return

    try {
      this.dataChannel.send(e.target.result as ArrayBuffer)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.onError(error)
      return
    }

    this.offset += (e.target.result as ArrayBuffer).byteLength

    const progress: FileTransferProgress = {
      transferId: this.transferId,
      bytesTransferred: this.offset,
      totalBytes: this.file.size,
      percentage: Math.round((this.offset / this.file.size) * 100),
    }

    this.onProgress(progress)

    if (this.offset < this.file.size) {
      this.readSlice(this.offset)
    } else {
      this.onComplete()
    }
  }

  private handleReaderError = () => {
    this.onError(new Error('File reading failed'))
  }
}
