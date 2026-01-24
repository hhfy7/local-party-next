/**
 * Docker 感知的构建信息获取工具
 * 在 Docker 构建时，如果 .git 目录不可用，则使用环境变量
 * 现在复用统一的构建信息工具函数
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
