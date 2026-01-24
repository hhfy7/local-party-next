import express from 'express'
import { createServer as createHttpServer } from 'http'
import { createServer as createHttpsServer } from 'https' // Import HTTPS
import { Server } from 'socket.io'
import cors from 'cors'
import * as dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@local-party/shared/src/types'

dotenv.config()

const app = express()
app.use(cors())

// Health Check Route (for SSL verification)
app.get('/', (req, res) => {
  // 动态构造前端地址：同域名，端口换成 5173
  const host = req.headers.host || 'localhost:4000'
  const protocol = req.protocol // 'http' or 'https'
  const hostname = host.split(':')[0] // IP or hostname without port
  const frontendUrl = `${protocol}://${hostname}:5173`

  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Local Party Server - SSL 认证成功</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-900 text-white">
      <div class="flex min-h-screen items-center justify-center px-4">
        <div class="w-full max-w-md rounded-2xl bg-gray-800/50 p-8 text-center shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <!-- 图标 -->
          <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 ring-4 ring-indigo-500/30">
            <svg class="h-10 w-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- 标题 -->
          <h1 class="mb-2 text-2xl font-bold tracking-tight text-white">SSL 证书已验证成功</h1>
          <p class="mb-6 text-gray-300">Local Party Server 正在安全运行</p>

          <!-- 按钮 -->
          <a href="${frontendUrl}" class="inline-flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-6 py-3 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-700 active:scale-100">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
            进入主页面
          </a>

          <!-- 提示 -->
          <p class="mt-6 text-xs text-gray-400">点击按钮返回视频同步页面</p>
        </div>
      </div>
    </body>
    </html>
  `)
})

// 尝试加载 SSL 证书 (从项目根目录的 keys 文件夹)
const rootDir = path.resolve(__dirname, '../../../')
const keyPath = path.join(rootDir, 'keys/key.pem')
const certPath = path.join(rootDir, 'keys/cert.pem')

console.log('[Server] Checking for keys at:', keyPath) // Debug Log

let httpServer
let protocol = 'http'

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('[Server] Loading SSL certificates...')
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }
  httpServer = createHttpsServer(options, app)
  protocol = 'https'
} else {
  console.log('[Server] No SSL certificates found, using HTTP.')
  httpServer = createHttpServer(app)
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 4000

import { registerRoomHandlers } from './socket/roomHandler'

// ... (previous imports)

// Socket.io 连接处理
io.on('connection', socket => {
  console.log(`用户连接: ${socket.id}`)

  registerRoomHandlers(io, socket)
})

httpServer.listen(PORT, () => {
  console.log(`Server 正在运行在 ${protocol}://localhost:${PORT}`)
})
