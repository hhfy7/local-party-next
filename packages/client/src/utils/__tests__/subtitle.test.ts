/**
 * subtitle 单元测试
 * 测试 SRT 格式转换和字幕 Blob URL 相关的纯函数
 */

import { describe, it, expect } from 'vitest'
import { srtToVtt } from '../subtitle'

describe('srtToVtt', () => {
  // ============================================
  // 基本转换测试
  // ============================================
  describe('基本转换测试', () => {
    it('应在转换后添加 WEBVTT 头', () => {
      const input = '1\n00:00:01,000 --> 00:00:04,000\nHello World'
      const result = srtToVtt(input)
      
      expect(result.startsWith('WEBVTT\n\n')).toBe(true)
    })

    it('应保留原始字幕内容', () => {
      const input = '1\n00:00:01,000 --> 00:00:04,000\nHello World'
      const result = srtToVtt(input)
      
      expect(result).toContain('Hello World')
    })

    it('空输入应只返回 WEBVTT 头', () => {
      const result = srtToVtt('')
      
      expect(result).toBe('WEBVTT\n\n')
    })

    it('只有换行符的输入应正确处理', () => {
      const result = srtToVtt('\n\n')
      
      expect(result.startsWith('WEBVTT\n\n')).toBe(true)
    })
  })

  // ============================================
  // 时间戳格式转换测试
  // ============================================
  describe('时间戳格式转换测试', () => {
    it('应将 SRT 时间戳转换为 VTT 格式', () => {
      const input = '00:00:01,000 --> 00:00:04,000'
      const result = srtToVtt(input)
      
      expect(result).toContain('00:00:01.000 --> 00:00:04.000')
    })

    it('应将毫秒分隔符从逗号改为点', () => {
      const input = '00:00:01,500 --> 00:00:04,500'
      const result = srtToVtt(input)
      
      expect(result).toContain('00:00:01.500 --> 00:00:04.500')
      expect(result).not.toContain(',')
    })

    it('应处理多行时间戳', () => {
      const input = `1
00:00:01,000 --> 00:00:04,000
First line

2
00:00:05,000 --> 00:00:08,000
Second line`
      const result = srtToVtt(input)
      
      expect(result).toContain('00:00:01.000 --> 00:00:04.000')
      expect(result).toContain('00:00:05.000 --> 00:00:08.000')
    })

    it('应处理长视频时间戳（小时级别）', () => {
      const input = '01:30:45,000 --> 01:30:48,000'
      const result = srtToVtt(input)
      
      expect(result).toContain('01:30:45.000 --> 01:30:48.000')
    })
  })

  // ============================================
  // 换行符处理测试
  // ============================================
  describe('换行符处理测试', () => {
    it('应将 CRLF 转换为 LF', () => {
      const input = '00:00:01,000 --> 00:00:04,000\r\nHello\r\nWorld'
      const result = srtToVtt(input)
      
      expect(result).not.toContain('\r\n')
      expect(result).toContain('\n')
    })

    it('应保留正常的 LF 换行符', () => {
      const input = '00:00:01,000 --> 00:00:04,000\nHello\nWorld'
      const result = srtToVtt(input)
      
      // 正常换行符应保留
      expect(result).toContain('Hello\nWorld')
    })
  })

  // ============================================
  // VTT 格式合规性测试
  // ============================================
  describe('VTT 格式合规性测试', () => {
    it('输出应包含正确的 VTT 头格式', () => {
      const input = `1
00:00:01,000 --> 00:00:04,000
<Test>
      `
      const result = srtToVtt(input)
      
      // VTT 格式要求：WEBVTT 头 + 空行 + 时间戳 + 字幕内容
      const lines = result.split('\n')
      expect(lines[0]).toBe('WEBVTT')
      expect(lines[1]).toBe('')
    })

    it('应正确处理带 HTML 标签的字幕', () => {
      const input = '00:00:01,000 --> 00:00:04,000\n<b>Bold</b> and <i>Italic</i>'
      const result = srtToVtt(input)
      
      expect(result).toContain('<b>Bold</b>')
      expect(result).toContain('<i>Italic</i>')
    })

    it('应处理多语言字幕', () => {
      const input = `1
00:00:01,000 --> 00:00:04,000
English: Hello
Chinese: 你好
Japanese: こんにちは`
      const result = srtToVtt(input)
      
      expect(result).toContain('English: Hello')
      expect(result).toContain('Chinese: 你好')
      expect(result).toContain('Japanese: こんにちは')
    })
  })

  // ============================================
  // 边界情况测试
  // ============================================
  describe('边界情况测试', () => {
    it('应处理只有一个字幕块的输入', () => {
      const input = '00:00:00,500 --> 00:00:02,000\nTest'
      const result = srtToVtt(input)
      
      expect(result).toContain('Test')
      expect(result).toContain('00:00:00.500 --> 00:00:02.000')
    })

    it('应处理很长的时间戳间隔', () => {
      const input = '00:00:00,000 --> 01:30:00,000\nLong duration subtitle'
      const result = srtToVtt(input)
      
      expect(result).toContain('01:30:00.000')
    })

    it('应处理特殊字符', () => {
      const input = '00:00:01,000 --> 00:00:04,000\nSpecial: & < > " \' `'
      const result = srtToVtt(input)
      
      expect(result).toContain('Special: & < > " \' `')
    })

    it('应处理连续的时间戳', () => {
      const input = `1
00:00:01,000 --> 00:00:02,000
First subtitle

2
00:00:02,000 --> 00:00:03,000
Second subtitle`
      const result = srtToVtt(input)
      
      expect(result).toContain('First subtitle')
      expect(result).toContain('Second subtitle')
    })

    it('应处理没有序号的字幕块', () => {
      const input = '00:00:01,000 --> 00:00:04,000\nSubtitle without index'
      const result = srtToVtt(input)
      
      expect(result).toContain('Subtitle without index')
    })

    it('应处理包含数字序号的时间戳', () => {
      const input = '00:00:01,000 --> 00:00:04,000\nTimestamp 00:00:02,500'
      const result = srtToVtt(input)
      
      // 确保只替换时间戳格式，不替换内容中的时间
      expect(result).toContain('00:00:02,500') // 原始内容保持不变
    })
  })
})
