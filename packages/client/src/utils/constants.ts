// 生产环境: 使用当前域名 (Nginx 反代)
// 开发环境: 动态获取当前访问的 hostname，方便移动端在同网络下访问
const DEV_BACKEND_PORT = 4000
const devFallbackUrl = `${window.location.protocol}//${window.location.hostname}:${DEV_BACKEND_PORT}`

export const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_API_URL || devFallbackUrl
