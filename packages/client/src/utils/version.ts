/**
 * 版本信息工具
 * 提供获取和展示应用版本信息的功能
 */

export interface AppVersion {
  version: string
  commitHash: string
  commitMessage: string
  buildTime: string
  branch: string
  hasChanges: boolean
}

/**
 * 获取应用版本信息
 * 从 Vite 注入的全局变量中读取
 */
export const getAppVersion = (): AppVersion => {
  // 从全局变量读取，如果不存在则使用默认值
  const version = (
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev-unknown'
  ) as string
  const commitHash = (
    typeof __APP_COMMIT_HASH__ !== 'undefined' ? __APP_COMMIT_HASH__ : 'unknown'
  ) as string
  const commitMessage = (
    typeof __APP_COMMIT_MESSAGE__ !== 'undefined'
      ? __APP_COMMIT_MESSAGE__
      : 'unknown'
  ) as string
  const buildTime = (
    typeof __APP_BUILD_TIME__ !== 'undefined'
      ? __APP_BUILD_TIME__
      : new Date().toISOString()
  ) as string
  const branch = (
    typeof __APP_BRANCH__ !== 'undefined' ? __APP_BRANCH__ : 'unknown'
  ) as string
  const hasChanges = (
    typeof __APP_HAS_CHANGES__ !== 'undefined' ? __APP_HAS_CHANGES__ : false
  ) as boolean

  return {
    version,
    commitHash,
    commitMessage,
    buildTime,
    branch,
    hasChanges,
  }
}

/**
 * 在控制台打印版本信息
 * 使用 console.table 格式化输出
 */
export const printVersionInfo = (): void => {
  const version = getAppVersion()

  // 打印标题
  console.log(
    '%c Local Party Next %c',
    'background: #4f46e5; color: #fff; font-size: 16px; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
    'background: transparent; color: #4f46e5; font-size: 14px;',
  )

  // 打印版本信息表格
  console.group('版本信息')
  console.table({
    版本: version.version,
    提交哈希: version.commitHash,
    提交信息: version.commitMessage,
    构建时间: version.buildTime,
    分支: version.branch,
    有更改: version.hasChanges ? '是' : '否',
  })
  console.groupEnd()

  // 打印使用提示
  console.log(
    '%c 💡 提示：在控制台输入 %cgetAppVersion()%c 可再次查看版本信息',
    'color: #666;',
    'color: #4f46e5; font-family: monospace; font-weight: bold;',
    'color: #666;',
  )
}

/**
 * 获取版本信息的字符串表示
 * 用于日志或其他文本输出
 */
export const getVersionString = (): string => {
  const version = getAppVersion()
  return `${version.version} (${version.commitHash}) [${version.branch}]`
}

/**
 * 检查是否有新版本（简单对比）
 * 可以传入旧的 commit hash 进行对比
 */
export const isNewVersion = (oldCommitHash?: string): boolean => {
  if (!oldCommitHash) return true
  const currentHash = getAppVersion().commitHash
  return currentHash !== oldCommitHash && currentHash !== 'unknown'
}

/**
 * 自动打印版本信息（生产环境）
 * 延迟执行以避免与 Vite 热更新冲突
 */
if (typeof window !== 'undefined') {


  // 将函数暴露到全局作用域，使用多个可能的名称
  // 主要名称
  ;(window as any).getAppVersion = getAppVersion
  ;(window as any).printVersionInfo = printVersionInfo

  // 备用名称（防止压缩问题）
  ;(window as any).versionInfo = getAppVersion
  ;(window as any).appVersion = getAppVersion
  ;(window as any).printVersion = printVersionInfo

  // 创建一个更易访问的包装函数
  ;(window as any).getVersion = () => {
    return getAppVersion()
  }

  // 创建一个自包含的版本信息对象
  ;(window as any).APP_VERSION = getAppVersion()

}
