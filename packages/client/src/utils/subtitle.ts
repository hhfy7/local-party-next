/**
 * 将 SRT 格式转换为 WebVTT 格式
 * 浏览器 <track> 标签只支持 WebVTT
 */
export function srtToVtt(srtContent: string): string {
  // 1. 替换换行符为 \n
  let vtt = 'WEBVTT\n\n' + srtContent.replace(/\r\n/g, '\n')

  // 2. 替换时间戳格式
  // SRT: 00:00:01,000 --> 00:00:04,000
  // VTT: 00:00:01.000 --> 00:00:04.000
  // 主要区别是毫秒分隔符：SRT是逗号(,), VTT是点(.)
  vtt = vtt.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})\s-->\s(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    '$1.$2 --> $3.$4',
  )

  return vtt
}

/**
 * 创建字幕 Blob URL
 */
export function createSubtitleUrl(content: string): string {
  const blob = new Blob([content], { type: 'text/vtt' })
  return URL.createObjectURL(blob)
}
