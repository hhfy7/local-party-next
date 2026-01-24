import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// 使用统一的构建信息工具函数
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getBuildInfo } = require('./scripts/build-info-utils.js')

// 获取构建信息
const buildInfo = getBuildInfo()

console.log('Build Info for Vite:', {
  version: buildInfo.version,
  commitHash: buildInfo.commitHash,
  branch: buildInfo.branch,
  hasChanges: buildInfo.hasChanges,
})

// https://vitejs.dev/config/
// 这里的 ({ command }) 就是解构了 Vite 传给我们的环境对象
export default defineConfig(({ command }) => ({
  // 如果是本地开发(serve)，基础路径就是根目录 /
  // 如果是打包发布(build)，基础路径就是你公网子目录 /local-party/
  base: command === 'serve' ? '/' : '/local-party/', // 开发环境用根路径，生产打包用子路径
  plugins: [react(), tailwindcss(), basicSsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Enable network access for iPad testing
  },
  // 注入全局变量
  define: {
    __APP_VERSION__: JSON.stringify(buildInfo.version),
    __APP_BUILD_TIME__: JSON.stringify(buildInfo.buildTime),
    __APP_COMMIT_HASH__: JSON.stringify(buildInfo.commitHash),
    __APP_COMMIT_MESSAGE__: JSON.stringify(buildInfo.commitMessage),
    __APP_BRANCH__: JSON.stringify(buildInfo.branch),
    __APP_HAS_CHANGES__: JSON.stringify(buildInfo.hasChanges),
  },
}))
