/**
 * Vite 环境变量类型声明
 * 定义构建时注入的全局变量
 */

/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __APP_BUILD_TIME__: string
declare const __APP_COMMIT_HASH__: string
declare const __APP_COMMIT_MESSAGE__: string
declare const __APP_BRANCH__: string
declare const __APP_HAS_CHANGES__: boolean

// 扩展 Window 接口以包含版本工具函数
interface Window {
  getAppVersion?: typeof import('@/utils/version').getAppVersion
  printVersionInfo?: typeof import('@/utils/version').printVersionInfo
  versionInfo?: typeof import('@/utils/version').getAppVersion
  appVersion?: typeof import('@/utils/version').getAppVersion
  printVersion?: typeof import('@/utils/version').printVersionInfo
  getVersion?: () => import('@/utils/version').AppVersion
  APP_VERSION?: import('@/utils/version').AppVersion
}
