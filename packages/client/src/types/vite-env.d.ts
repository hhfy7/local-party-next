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
