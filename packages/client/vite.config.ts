import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// 获取构建信息 - Docker 友好的方式
function getBuildInfo() {
  try {
    // 首先尝试从环境变量获取（Docker 构建时）
    const envHash = process.env.GIT_COMMIT_HASH
    const envMessage = process.env.GIT_COMMIT_MESSAGE
    const envBranch = process.env.GIT_BRANCH
    const envHasChanges = process.env.GIT_HAS_CHANGES === 'true'

    if (envHash) {
      console.log('Using environment variables for build info')
      return {
        version: `${envBranch || 'unknown'}-${envHash}${envHasChanges ? '-docker' : ''}`,
        commitHash: envHash,
        commitMessage: envMessage || 'unknown',
        buildTime: new Date().toISOString(),
        branch: envBranch || 'unknown',
        hasChanges: envHasChanges,
      }
    }

    // 否则尝试读取 Git 信息（本地构建时）
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process')
    const commitHash = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
    }).trim()
    const commitMessage = execSync('git log -1 --pretty=%B', {
      encoding: 'utf8',
    })
      .split('\n')[0]
      .trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim()
    const buildTime = new Date().toISOString()
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn('无法读取构建信息，使用默认值:', errorMessage)
    return {
      version: 'unknown',
      commitHash: 'unknown',
      commitMessage: 'unknown',
      buildTime: new Date().toISOString(),
      branch: 'unknown',
      hasChanges: false,
    }
  }
}

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
