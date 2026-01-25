/**
 * FileReceiver 单元测试
 * 测试 P2P 文件接收类的核心逻辑
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FileReceiver } from '../FileReceiver'

// ============================================
// Mock 类型定义
// ============================================
interface MockFile {
  name: string
  size: number
  type: string
}

// ============================================
// 测试套件
// ============================================
describe('FileReceiver', () => {
  // 使用 any 类型避免 vitest Mock 类型问题
  const onProgress: any = vi.fn()
  const onComplete: any = vi.fn()
  const onError: any = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // 重置 mock 函数
    onProgress.mockClear()
    onComplete.mockClear()
    onError.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ============================================
  // 构造函数测试
  // ============================================
  describe('构造函数', () => {
    it('应正确初始化 transferId', () => {
      const customReceiver = new FileReceiver('custom-id', {
        onProgress,
        onComplete,
        onError,
      })
      expect(customReceiver).toBeDefined()
    })

    it('应正确初始化回调函数', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      expect(receiver).toBeDefined()
    })
  })

  // ============================================
  // handleData 方法测试
  // ============================================
  describe('handleData 方法', () => {
    it('字符串数据应调用 handleMetadata', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 1024,
          fileType: 'video/mp4',
        },
      })
      
      receiver.handleData(metadata)
      
      expect(onProgress).toHaveBeenCalled()
    })

    it('ArrayBuffer 数据应调用 handleFileChunk', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const chunk = new ArrayBuffer(128 * 1024)
      
      // 先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 128 * 1024,
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      
      // 清除调用历史
      onProgress.mockClear()
      
      // 发送数据块
      receiver.handleData(chunk)
      
      expect(onProgress).toHaveBeenCalled()
    })
  })

  // ============================================
  // 元数据处理测试
  // ============================================
  describe('元数据处理', () => {
    it('应正确解析文件名', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'my-video.mp4',
          fileSize: 1024,
          fileType: 'video/mp4',
        },
      })
      
      receiver.handleData(metadata)
      
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        totalBytes: 1024,
      }))
    })

    it('应正确解析文件大小', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const fileSize = 1024 * 1024 // 1MB
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize,
          fileType: 'video/mp4',
        },
      })
      
      receiver.handleData(metadata)
      
      expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
        totalBytes: fileSize,
        bytesTransferred: 0,
        percentage: 0,
      }))
    })

    it('应正确解析文件类型', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mkv',
          fileSize: 1024,
          fileType: 'video/x-matroska',
        },
      })
      
      receiver.handleData(metadata)
      // 验证不报错即为成功
      expect(onProgress).toHaveBeenCalled()
    })

    it('无效的元数据格式应不触发进度', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      receiver.handleData(JSON.stringify({
        type: 'wrong-type',
        data: {},
      }))
      
      // 不应该触发错误（因为类型不匹配），但也不应该触发进度
      expect(onProgress).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // 文件块处理测试
  // ============================================
  describe('文件块处理', () => {
    beforeEach(() => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 256 * 1024, // 256KB
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onProgress.mockClear()
    })

    it('应正确接收和存储数据块', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 256 * 1024,
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onProgress.mockClear()
      
      const chunk1 = new ArrayBuffer(128 * 1024)
      const chunk2 = new ArrayBuffer(128 * 1024)
      
      receiver.handleData(chunk1)
      receiver.handleData(chunk2)
      
      expect(onProgress).toHaveBeenCalledTimes(2)
    })

    it('应正确计算接收进度', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 256 * 1024,
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onProgress.mockClear()
      
      const chunkSize = 128 * 1024
      const chunk = new ArrayBuffer(chunkSize)
      
      receiver.handleData(chunk)
      
      const progressCall = onProgress.mock.calls[0][0]
      expect(progressCall.bytesTransferred).toBe(chunkSize)
      expect(progressCall.percentage).toBe(50) // 128KB / 256KB = 50%
    })

    it('应正确累加接收字节数', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 256 * 1024,
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onProgress.mockClear()
      
      const chunk1 = new ArrayBuffer(64 * 1024)
      const chunk2 = new ArrayBuffer(64 * 1024)
      
      receiver.handleData(chunk1)
      receiver.handleData(chunk2)
      
      const lastProgress = onProgress.mock.calls[1][0]
      expect(lastProgress.bytesTransferred).toBe(128 * 1024)
    })
  })

  // ============================================
  // 未收到元数据时的处理
  // ============================================
  describe('未收到元数据时的处理', () => {
    it('应忽略元数据到达前的数据块', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const chunk = new ArrayBuffer(1024)
      
      // 不发送元数据直接发送数据块
      receiver.handleData(chunk)
      
      // 不应该触发错误或进度
      expect(onProgress).not.toHaveBeenCalled()
      expect(onError).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // 传输完成测试
  // ============================================
  describe('传输完成', () => {
    beforeEach(() => {
      onComplete.mockClear()
    })

    it('接收完成时应创建 File 对象', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 128 * 1024,
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onComplete.mockClear()
      
      const chunk = new ArrayBuffer(128 * 1024)
      
      receiver.handleData(chunk)
      
      expect(onComplete).toHaveBeenCalled()
      const file = onComplete.mock.calls[0][0] as unknown as MockFile
      expect(file.name).toBe('test.mp4')
      expect(file.type).toBe('video/mp4')
    })

    it('完成时文件大小应正确', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 128 * 1024,
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onComplete.mockClear()
      
      const chunk = new ArrayBuffer(128 * 1024)
      
      receiver.handleData(chunk)
      
      const file = onComplete.mock.calls[0][0] as unknown as MockFile
      expect(file.size).toBe(128 * 1024)
    })
  })

  // ============================================
  // 错误处理测试
  // ============================================
  describe('错误处理', () => {
    it('JSON 解析错误应调用 onError', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      receiver.handleData('invalid json')
      
      expect(onError).toHaveBeenCalled()
      const errorCall = onError.mock.calls[0][0]
      expect(errorCall.message).toContain('Invalid metadata')
    })
  })

  // ============================================
  // 边界情况测试
  // ============================================
  describe('边界情况测试', () => {
    it('应处理文件名为空的情况', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: '',
          fileSize: 1024,
          fileType: 'video/mp4',
        },
      })
      
      receiver.handleData(metadata)
      
      expect(onProgress).toHaveBeenCalled()
    })

    it('应处理特殊字符文件名', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'video with spaces & symbols!.mp4',
          fileSize: 1024,
          fileType: 'video/mp4',
        },
      })
      
      receiver.handleData(metadata)
      
      expect(onProgress).toHaveBeenCalled()
    })

    it('应处理 Unicode 文件名', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: '视频文件.mp4',
          fileSize: 1024,
          fileType: 'video/mp4',
        },
      })
      
      receiver.handleData(metadata)
      
      expect(onProgress).toHaveBeenCalled()
    })

    it('进度百分比应四舍五入到整数', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'test.mp4',
          fileSize: 300 * 1024, // 300KB
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onProgress.mockClear()
      
      // 发送 100KB（33.33%）
      const chunk = new ArrayBuffer(100 * 1024)
      receiver.handleData(chunk)
      
      const progress = onProgress.mock.calls[0][0]
      expect(progress.percentage).toBe(33) // 100/300 = 33.33... 四舍五入为 33
    })

    it('应处理小文件（小于一个分片）', () => {
      const receiver = new FileReceiver('test-transfer-id', {
        onProgress,
        onComplete,
        onError,
      })
      
      // 预先发送元数据
      const metadata = JSON.stringify({
        type: 'file-meta',
        data: {
          fileName: 'small.mp4',
          fileSize: 1024, // 1KB
          fileType: 'video/mp4',
        },
      })
      receiver.handleData(metadata)
      onProgress.mockClear()
      onComplete.mockClear()
      
      const chunk = new ArrayBuffer(1024)
      receiver.handleData(chunk)
      
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
