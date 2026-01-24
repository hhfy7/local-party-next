/**
 * 构建信息获取工具
 * 在 Vite 构建时调用，读取当前 Git 状态
 */
import { getBuildInfo as getBuildInfoFromUtils } from './build-info-utils.js'

export function getBuildInfo() {
  return getBuildInfoFromUtils()
}

// 如果直接运行此脚本，打印构建信息
if (import.meta.url === `file://${process.argv[1]}`) {
  const info = getBuildInfo()
  console.log('Build Info:', JSON.stringify(info, null, 2))
}
