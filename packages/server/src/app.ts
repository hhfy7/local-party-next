import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import * as dotenv from 'dotenv'
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@local-party/shared/src/types'

dotenv.config()

const app = express()
app.use(cors())

const httpServer = createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // 开发环境允许所有来源
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
  console.log(`Server 正在运行在 http://localhost:${PORT}`)
})
