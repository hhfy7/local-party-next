/**
 * 构建信息获取工具
 * 在 Vite 构建时调用，读取当前 Git 状态
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

export function getBuildInfo() {
  try {
    // 获取当前 commit hash (短格式)
    const commitHash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
    }).trim()

    // 获取 commit message (第一行)
    const commitMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf8',
    })
      .split('\n')[0]
      .trim()

    // 获取构建时间
    const buildTime = new Date().toISOString()

    // 获取当前分支名
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim()

    // 获取是否有未提交的更改
    const hasChanges =
      execSync('git status --porcelain', { encoding: 'utf8' }).length > 0

    return {
      version: `${branch}-${commitHash}${hasChanges ? '-dirty' : ''}`,
      commitHash,
      commitMessage,
      buildTime,
      branch,
      hasChanges,
    }
  } catch (error) {
    console.warn('无法读取 git 信息，使用默认值:', error.message)
    return {
      version: 'dev-unknown',
      commitHash: 'unknown',
      commitMessage: 'unknown',
      buildTime: new Date().toISOString(),
      branch: 'unknown',
      hasChanges: false,
    }
  }
}

// 如果直接运行此脚本，打印构建信息
if (import.meta.url === `file://${process.argv[1]}`) {
  const info = getBuildInfo()
  console.log('Build Info:', JSON.stringify(info, null, 2))
}
