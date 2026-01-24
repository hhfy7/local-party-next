/**
 * 统一的构建信息获取工具
 * 提供统一的北京时间格式化和其他构建信息获取功能
 */
import { execSync } from 'child_process'

/**
 * 获取北京时间格式化的当前时间
 * 统一使用相同的格式：YYYY/MM/DD HH:mm:ss
 */
export function getBeijingTime() {
  return new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * 从 Git 获取构建信息
 */
export function getGitBuildInfo() {
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
      branch,
      hasChanges,
    }
  } catch (error) {
    console.warn(
      '无法读取 git 信息:',
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}

/**
 * 从环境变量获取构建信息
 * 主要用于 Docker 构建场景
 */
export function getEnvBuildInfo() {
  const commitHash = process.env.GIT_COMMIT_HASH || process.env.COMMIT_HASH
  if (!commitHash) {
    return null
  }

  const commitMessage =
    process.env.GIT_COMMIT_MESSAGE || process.env.COMMIT_MESSAGE || 'unknown'
  const branch = process.env.GIT_BRANCH || process.env.BRANCH || 'unknown'
  const hasChanges = process.env.GIT_HAS_CHANGES === 'true'

  return {
    version: `${branch}-${commitHash}${hasChanges ? '-docker' : ''}`,
    commitHash,
    commitMessage,
    branch,
    hasChanges,
  }
}

/**
 * 获取默认的构建信息（当其他方式都失败时）
 */
export function getDefaultBuildInfo() {
  return {
    version: 'unknown',
    commitHash: 'unknown',
    commitMessage: 'unknown',
    branch: 'unknown',
    hasChanges: false,
  }
}

/**
 * 统一的构建信息获取函数
 * 按优先级尝试：Git → 环境变量 → 默认值
 */
export function getBuildInfo() {
  // 首先尝试从 Git 获取
  const gitInfo = getGitBuildInfo()
  if (gitInfo) {
    return {
      ...gitInfo,
      buildTime: getBeijingTime(),
    }
  }

  // 然后尝试从环境变量获取
  const envInfo = getEnvBuildInfo()
  if (envInfo) {
    return {
      ...envInfo,
      buildTime: getBeijingTime(),
    }
  }

  // 最后使用默认值
  return {
    ...getDefaultBuildInfo(),
    buildTime: getBeijingTime(),
  }
}
