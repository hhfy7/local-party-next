// 生产环境: 使用当前域名 (Nginx 反代)
// 开发环境: 使用 VITE_API_URL 或 localhost:4000 同一个 ip 下面的地址去找 ws 服务器
export const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_API_URL || 'http://localhost:4000'
