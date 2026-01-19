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
app.get('/', (_req, res) => {
  res.send(`
    <div style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center;">
      <h1 style="color: #4f46e5;">Local Party Server is Running 🚀</h1>
      <p>SSL Certificate Verified Successfully.</p>
      <p style="color: #666;">You can close this tab now and return to the application.</p>
    </div>
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
