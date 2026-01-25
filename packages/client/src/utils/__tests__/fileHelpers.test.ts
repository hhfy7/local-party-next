/**
 * fileHelpers 单元测试
 * 测试文件大小格式化相关的纯函数
 */

import { describe, it, expect } from 'vitest'
import { formatFileSize } from '../fileHelpers'

describe('formatFileSize', () => {
  // ============================================
  // 边界值测试
  // ============================================
  describe('边界值测试', () => {
    it('0 字节应返回 "0 B"', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })

    it('最小非零值 1 字节', () => {
      expect(formatFileSize(1)).toBe('1 B')
    })

    it('最大整数安全值', () => {
      expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toMatch(/^\d+(\.\d)? [PT]B$/)
    })
  })

  // ============================================
  // 字节单位测试
  // ============================================
  describe('字节单位转换测试', () => {
    it('字节边界值（1023字节）', () => {
      expect(formatFileSize(1023)).toBe('1023 B')
    })

    it('字节边界值（1024字节 = 1KB）', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('小于1KB的值应显示为字节', () => {
      expect(formatFileSize(500)).toBe('500 B')
      expect(formatFileSize(100)).toBe('100 B')
    })
  })

  // ============================================
  // KB 单位测试
  // ============================================
  describe('KB 单位转换测试', () => {
    it('1 KB 正确显示', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
    })

    it('1.5 KB 正确显示（保留一位小数）', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('2 KB 正确显示', () => {
      expect(formatFileSize(2048)).toBe('2 KB')
    })

    it('小于1MB的KB值', () => {
      expect(formatFileSize(512 * 1024)).toBe('512 KB')
    })
  })

  // ============================================
  // MB 单位测试
  // ============================================
  describe('MB 单位转换测试', () => {
    it('1 MB 正确显示', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    })

    it('1.5 MB 正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
    })

    it('2 MB 正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 2)).toBe('2 MB')
    })

    it('小于1GB的MB值', () => {
      expect(formatFileSize(512 * 1024 * 1024)).toBe('512 MB')
    })
  })

  // ============================================
  // GB 单位测试
  // ============================================
  describe('GB 单位转换测试', () => {
    it('1 GB 正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('2.5 GB 正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB')
    })

    it('10 GB 正确显示（大数值）', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 10)).toBe('10 GB')
    })

    it('小于1TB的GB值', () => {
      expect(formatFileSize(512 * 1024 * 1024 * 1024)).toBe('512 GB')
    })
  })

  // ============================================
  // TB 单位测试
  // ============================================
  describe('TB 单位转换测试', () => {
    it('1 TB 正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB')
    })

    it('2 TB 正确显示', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 2)).toBe('2 TB')
    })
  })

  // ============================================
  // 精度测试
  // ============================================
  describe('精度测试', () => {
    it('应保留一位小数', () => {
      // 测试各种大小确保只有一位小数
      expect(formatFileSize(1024 * 1.5)).toMatch(/^\d+\.\d [KMGT]B$/)
      expect(formatFileSize(1024 * 1024 * 1.5)).toMatch(/^\d+\.\d [KMGT]B$/)
      expect(formatFileSize(1024 * 1024 * 1024 * 1.5)).toMatch(/^\d+\.\d [KMGT]B$/)
    })

    it('整数应不显示小数点', () => {
      expect(formatFileSize(1024)).not.toContain('.')
      expect(formatFileSize(1024 * 1024)).not.toContain('.')
      expect(formatFileSize(1024 * 1024 * 1024)).not.toContain('.')
    })
  })

  // ============================================
  // 边界情况测试
  // ============================================
  describe('边界情况测试', () => {
    it('应正确处理 999 字节', () => {
      expect(formatFileSize(999)).toBe('999 B')
    })

    it('应正确处理 1025 字节', () => {
      expect(formatFileSize(1025)).toBe('1 KB')
    })

    it('应正确处理 1.9 MB', () => {
      expect(formatFileSize(1024 * 1024 * 1.9)).toBe('1.9 MB')
    })

    it('应正确处理 999 MB', () => {
      expect(formatFileSize(999 * 1024 * 1024)).toBe('999 MB')
    })

    it('应正确处理 0.5 GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 0.5)).toBe('512 MB')
    })
  })
})
