/**
 * Docker 感知的构建信息获取工具
 * 在 Docker 构建时，如果 .git 目录不可用，则使用环境变量
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

export function getBuildInfo() {
  try {
    // 首先尝试读取 Git 信息
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
    } catch (gitError) {
      // 如果 Git 不可用（如在 Docker 中），尝试环境变量
      console.log('Git 不可用，尝试使用环境变量...')

      // 尝试从环境变量获取信息
      const commitHash =
        process.env.GIT_COMMIT_HASH || process.env.COMMIT_HASH || 'unknown'
      const commitMessage =
        process.env.GIT_COMMIT_MESSAGE ||
        process.env.COMMIT_MESSAGE ||
        'unknown'
      const branch = process.env.GIT_BRANCH || process.env.BRANCH || 'unknown'
      const buildTime = new Date().toISOString()
      const hasChanges = process.env.GIT_HAS_CHANGES === 'true'

      return {
        version: `${branch}-${commitHash}${hasChanges ? '-docker' : ''}`,
        commitHash,
        commitMessage,
        buildTime,
        branch,
        hasChanges,
      }
    }
  } catch (error) {
    console.warn('无法读取构建信息，使用默认值:', error.message)
    return {
      version: 'docker-unknown',
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
