/**
 * 版本信息徽章组件
 * 在页面角落显示当前版本信息
 */
import { getAppVersion } from '@/utils/version'

export const VersionBadge = () => {
  const version = getAppVersion()

  // 只在生产环境显示
  if (import.meta.env.PROD !== true) return null

  return (
    <div className="fixed right-2 bottom-2 z-50 rounded bg-black/60 px-2 py-1 text-xs text-gray-300 backdrop-blur-sm">
      <span
        className="font-mono"
        title={`版本: ${version.version}\n提交: ${version.commitHash}\n构建: ${version.buildTime}`}
      >
        {version.commitHash}
      </span>
      {version.hasChanges && (
        <span className="ml-1 text-yellow-400" title="有未提交的更改">
          *
        </span>
      )}
    </div>
  )
}
