import type { FileTransferProgress } from '@local-party/shared/src/types'

interface ReceivedFileState {
  buffer: ArrayBuffer[]
  size: number
  name: string
  type: string
  receivedBytes: number
}

export class FileReceiver {
  private transferId: string
  private state: ReceivedFileState | null = null

  // Callbacks
  private onProgress: (progress: FileTransferProgress) => void
  private onComplete: (file: File) => void
  private onError: (error: Error) => void

  constructor(
    transferId: string,
    callbacks: {
      onProgress: (progress: FileTransferProgress) => void
      onComplete: (file: File) => void
      onError: (error: Error) => void
    },
  ) {
    this.transferId = transferId
    this.onProgress = callbacks.onProgress
    this.onComplete = callbacks.onComplete
    this.onError = callbacks.onError
  }

  public handleData(data: ArrayBuffer | string) {
    if (typeof data === 'string') {
      this.handleMetadata(data)
    } else {
      this.handleFileChunk(data)
    }
  }

  private handleMetadata(json: string) {
    try {
      const message = JSON.parse(json)
      if (message.type === 'file-meta') {
        this.state = {
          buffer: [],
          size: message.data.fileSize,
          name: message.data.fileName,
          type: message.data.fileType,
          receivedBytes: 0,
        }
        // Initialize progress
        this.onProgress({
          transferId: this.transferId,
          bytesTransferred: 0,
          totalBytes: this.state.size,
          percentage: 0,
        })
      }
    } catch (e) {
      console.error('Failed to parse metadata:', e)
      this.onError(new Error('Invalid metadata'))
    }
  }

  private handleFileChunk(chunk: ArrayBuffer) {
    if (!this.state) {
      // Metadata missed or arrived late (should handle this better in production, but for now ignore)
      console.warn('Received chunk before metadata')
      return
    }

    this.state.buffer.push(chunk)
    this.state.receivedBytes += chunk.byteLength

    const progress: FileTransferProgress = {
      transferId: this.transferId,
      bytesTransferred: this.state.receivedBytes,
      totalBytes: this.state.size,
      percentage: Math.round(
        (this.state.receivedBytes / this.state.size) * 100,
      ),
    }

    this.onProgress(progress)

    if (this.state.receivedBytes >= this.state.size) {
      this.finish()
    }
  }

  private finish() {
    if (!this.state) return

    const blob = new Blob(this.state.buffer, { type: this.state.type })
    const file = new File([blob], this.state.name, { type: this.state.type })

    this.onComplete(file)
  }
}
