# Local Party 重构项目详细技术设计文档

**项目名称**: Local Party Next
**日期**: 2026年1月4日
**目标平台**: macOS (PC端) / iPad (移动端)
**架构模式**: Monorepo (React 19 SPA + Node.js/Express)
**语言**: TypeScript (全栈)

---

## 1. 项目概述与核心需求

**Local Party** 是一个“异地同屏”网页应用，允许用户与朋友同步观看**本地存储**的视频文件。
核心理念是**隐私与性能**：视频文件**从不**上传到服务器。通过现代浏览器的 `URL.createObjectURL` 技术直接读取本地文件，服务器仅作为信令中继，负责同步播放状态（播放/暂停/进度）和转发聊天消息。

### 1.1 核心需求清单

1.  **视频同步**: 实现毫秒级的播放状态同步（播放、暂停、进度跳转）。
2.  **多端兼容**:
    - **PC/Mac**: 经典的左视频、右聊天布局。
    - **iPad**: 完美适配 Safari，解决自动全屏问题，支持横屏/竖屏自适应布局。
3.  **交互体验**:
    - **房间系统**: 支持创建房间（带密码）、通过链接直接邀请好友（自动填写房间号）。
    - **即插即用**: 无需注册登录，输入昵称即可使用。
    - **弱校验机制**: 允许双方文件存在细微差异（如时长），仅做提示而不强制拦截。
    - **键盘控制**: 支持方向键快进/后退，空格键暂停/播放（输入框焦点时自动屏蔽）。
4.  **技术重构**: 使用 React 19 + TypeScript + Zustand + Tailwind CSS 重写。
5.  **部署要求**: 自建服务器，配置 HTTPS 以支持所有现代浏览器特性。

---

## 2. 技术架构设计

采用 **Monorepo** 结构，确保前后端类型定义（Type Definitions）的绝对一致性。

### 2.1 目录结构

```text
local-party-next/
├── package.json          # 根工作区配置 (Workspaces)
├── packages/
│   ├── shared/           # 前后端共享代码
│   │   ├── types.ts      # 核心接口定义 (SocketEvents, RoomState)
│   │   └── package.json
│   ├── client/           # 前端应用 (Vite + React 19)
│   │   ├── vite.config.ts
│   │   ├── src/
│   │   │   ├── pages/    # 页面组件
│   │   │   │   ├── LandingPage.tsx
│   │   │   │   └── RoomPage.tsx
│   │   │   ├── stores/   # Zustand 状态管理
│   │   │   ├── components/
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   └── Layout.tsx
│   │   │   └── hooks/    # 自定义 Hooks (useSocket)
│   │   └── package.json
│   └── server/           # 后端应用 (Express + Socket.io)
│       ├── src/
│       │   ├── app.ts    # 入口
│       │   ├── socket/   # Socket 事件处理
│       │   └── state/    # 内存状态存储
│       └── package.json
```

### 2.2 技术栈详情

| 模块         | 技术选型         | 版本/说明                                     |
| :----------- | :--------------- | :-------------------------------------------- |
| **前端框架** | React            | **v19** (利用最新 Hooks 特性)                 |
| **构建工具** | Vite             | 极速 HMR，构建产物为纯静态文件                |
| **开发语言** | TypeScript       | 强类型约束，减少运行时错误                    |
| **状态管理** | **Zustand**      | 轻量级全局状态管理 (替代 Redux/Context)       |
| **UI 框架**  | **Tailwind CSS** | 原子化 CSS，处理 iPad 响应式布局的神器        |
| **路由管理** | React Router     | **v7** (处理 `/room/:id` 分享链接)            |
| **后端运行** | Node.js          | 高性能 IO 密集型处理                          |
| **Web 框架** | Express          | 轻量级 HTTP 服务                              |
| **实时通信** | **Socket.io**    | **v4** (工业级 WebSocket 封装，处理重连/心跳) |
| **数据存储** | **In-Memory**    | 纯内存存储 (RAM)，房间销毁即清空数据          |

---

## 3. 核心业务流程与交互设计

### 3.1 房间生命周期与内存管理 (Room Lifecycle)

由于不使用数据库，房间的状态全生命周期都在 Node.js 进程的**堆内存**中。

1.  **创建 (Creation)**:
    - 第一个用户（房主）请求创建房间时，服务端在内存 Map 中实例化一个 `Room` 对象。
    - 包含：`id`, `password`, `users[]`, `messageHistory[]`。
2.  **存活 (Active)**:
    - 只要房间内的 `users` 列表不为空，房间就一直存在。
    - 后加入的用户从内存中拉取完整的 `messageHistory`，实现“历史记录漫游”。
3.  **销毁 (Destruction)**:
    - **触发条件**: 房间内**最后一个用户**断开 Socket 连接（关闭浏览器标签页或网络断开）。
    - **执行动作**:
      - 服务端检测到 `socket.on('disconnect')` 后，将用户从房间移除。
      - 检查 `room.users.length === 0`。
      - 如果为 0，**立即 delete** 该房间对象。
    - **结果**: 此时房间的所有聊天记录、操作日志被永久清除。如果用户想再次聚会，需要重新创建一个新房间。

### 3.2 页面架构设计 (Page Structure)

应用仅包含**两个核心页面路由**，但在交互上有不同的状态视图。

#### 页面 1: 首页 / 登陆页 (Landing Page)

- **路由**: `/`
- **功能**:
  - Logo 展示与 Slogan。
  - **Tab 1: 创建房间**: 输入昵称、房间名、密码、选择视频。
  - **Tab 2: 加入房间**: 输入昵称、房间号、密码、选择视频。

#### 页面 2: 房间页 (Room Page)

- **路由**: `/room/:roomId`
- **Query 参数**: `?pwd=xxx` (可选，用于自动填密码)
- **内部状态视图**:
  - **状态 A: 准备室 (Lobby Mode)**
    - **触发条件**: 用户通过分享链接进入，或者刷新了页面但尚未选择视频文件。
    - **UI**: 一个覆盖在视频区域的模态框/遮罩层。
    - **内容**: "欢迎来到 [房间名]。请选择本地视频文件以开始同步。" + [选择文件按钮] + [昵称输入框(如果未填)]。
  - **状态 B: 影院模式 (Cinema Mode)**
    - **触发条件**: 视频文件已加载 (Blob URL 生成完毕) 且 Socket 已连接。
    - **UI**: 完整的左视频、右聊天布局。

### 3.3 视频同步机制 (The Sync Core)

**原则**: 服务端只转发“控制指令”，不转发“视频流”。

#### 核心事件定义

- `PLAY`: 用户A点击播放 -> 广播 `PLAY` -> 用户B播放。
- `PAUSE`: 用户A点击暂停 -> 广播 `PAUSE` -> 用户B暂停。
- `SEEK`: 用户A跳转到 10:45 -> 广播 `SEEK(timestamp: 645)` -> 用户B跳转至 10:45。

#### 弱校验机制 (Weak Validation)

- **触发时机**: 用户 B 加入房间时。
- **校验逻辑**:
  - Client 发送 `{ duration: 7200, fileSize: 3221225472 }` (时长与字节大小)。
  - Server 对比房主的数据。
  - **判定**:
    - 完全一致 -> 绿灯通行。
    - 时长偏差 > 5秒 -> **前端显示黄色警告条**: “检测到视频版本可能不一致，同步可能会有偏差”，但**不阻止**用户操作。

### 3.4 聊天与系统日志

- **布局**:
  - **PC**: 右侧固定宽度的侧边栏。
  - **iPad**: 响应式调整（详见 4.2）。
- **消息类型**:
  - **用户消息**: "哈哈这个好笑"。
  - **系统日志**: "Haoyan 快进了 15秒", "UserB 暂停了视频"。
- **存储**: 存在服务端内存 `messageList` 数组中。

### 3.5 键盘交互与防冲突

- **快捷键**: `ArrowRight` (快进), `ArrowLeft` (后退), `Space` (暂停/播放)。
- **冲突处理**:
  - 全局监听 `keydown`。
  - **Guard Clause**: 如果 `document.activeElement` 是 `INPUT` 或 `TEXTAREA`，则忽略快捷键，允许正常打字移动光标。

---

## 4. iPad 与移动端兼容性设计 (关键难点)

### 4.1 视频播放器配置

iPad Safari 对 `<video>` 标签有特殊行为，必须进行以下配置以防止“强制全屏”破坏布局：

```tsx
<video
  ref={videoRef}
  playsInline // 关键：允许在网页内联播放，不强制全屏
  webkit-playsinline="true" // 兼容旧版 iOS
  controls={true} // 使用原生控件（iPad上原生控件体验最好，支持拖拽进度条）
  className="h-full w-full bg-black object-contain"
/>
```

### 4.2 音量控制限制 (Risk)

- **限制**: iOS/iPadOS **禁止**通过 JavaScript (`video.volume = 0.5`) 修改音量。
- **表现**: 网页上的音量滑块在 iPad 上通常无效或不可见。
- **解决方案**: iPad 端 UI 隐藏音量滑块，提示用户使用**物理音量按键**调节。

### 4.3 响应式布局策略 (Tailwind)

- **PC (默认)**: Flex Row (左视频，右聊天)。
- **iPad 横屏 (Landscape)**: 保持 Flex Row，但聊天栏宽度适当缩小。
- **iPad 竖屏 (Portrait)**: 切换为 Flex Column (上视频，下聊天)。

---

## 5. 接口定义 (Shared Types)

这是前后端通信的契约，存放在 `packages/shared/types.ts`。

```typescript
// 消息实体
export interface ChatMessage {
  id: string
  type: 'text' | 'system' // 普通消息 或 系统操作日志
  userId: string
  username: string
  content: string // "你好" 或 "快进了 5秒"
  timestamp: number
}

// 视频元数据 (用于校验)
export interface VideoMeta {
  duration: number // 秒
  fileSize: number // 字节
}

// 核心同步指令
export interface SyncAction {
  type: 'play' | 'pause' | 'seek'
  timestamp: number // 当前视频时间戳
  reqId?: string // 用于去重或调试
}

// Socket 服务端事件 (Server -> Client)
export interface ServerToClientEvents {
  room_joined: (data: {
    roomId: string
    history: ChatMessage[]
    users: User[]
  }) => void
  user_joined: (user: User) => void
  user_left: (userId: string) => void
  receive_message: (msg: ChatMessage) => void
  receive_sync: (action: SyncAction, user: string) => void // user是操作者的名字
  video_warning: (msg: string) => void // 视频不匹配警告
  error: (msg: string) => void
}

// Socket 客户端事件 (Client -> Server)
export interface ClientToServerEvents {
  join_room: (data: {
    roomId: string
    username: string
    password?: string
    videoMeta: VideoMeta
  }) => void
  create_room: (data: {
    roomName: string
    username: string
    password?: string
    videoMeta: VideoMeta
  }) => void
  send_message: (content: string) => void
  send_sync: (action: SyncAction) => void
}
```

---

## 6. 旧项目代码参考与复用 (Legacy Reference)

虽然我们使用 React 重写，但原开源项目 (`local-party/render.js`) 中有部分逻辑非常值得借鉴：

1.  **时间格式化函数 (`time`)**:
    - 原项目逻辑：将秒数转换为 `MM:SS` 或 `HH:MM:SS`，并根据上下文（play/pause）生成日志文本。
    - **复用计划**: 将此逻辑提取为 `packages/client/src/utils/format.ts` 中的纯函数 `formatDuration(seconds: number): string`。

2.  **随机字符串生成 (`randomString`)**:
    - 原项目逻辑：生成随机房间号。
    - **复用计划**: 在后端 `packages/server/src/utils/idGenerator.ts` 中实现类似的逻辑，用于生成短小易读的 Room ID。

3.  **Socket 逻辑流程**:
    - 原项目的 `socket.on('playerControlUpdate')` 逻辑清晰地展示了如何处理远端传来的 `currentTime` 和播放状态，这部分业务逻辑将直接映射到 Zustand 的 action 中。

---

## 7. 部署与安全设计

### 7.1 为什么必须 HTTPS？

1.  **WebSocket 稳定性**: 许多移动网络运营商会干扰 80 端口的 WebSocket 流量，但不会干扰 443 (WSS) 流量。
2.  **浏览器 API 限制**:
    - `navigator.clipboard` (复制房间链接) 仅在 HTTPS 下可用。
    - iOS 媒体策略限制。

### 7.2 Nginx 反向代理配置 (参考)

```nginx
server {
    listen 443 ssl http2;
    server_name local-party.yourdomain.com;
    # SSL 配置...

    location / {
        root /var/www/local-party/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 8. 开发注意事项总结

1.  **大文件内存保护**: 必须使用 `URL.createObjectURL(file)`，组件卸载时调用 `URL.revokeObjectURL()`。
2.  **无限循环防止 (Sync Loop)**: 收到 Socket `SEEK` 事件更新播放器时，必须标记 `isRemoteUpdate = true`，防止触发本地 `onSeek` 再次发送 Socket 消息。
3.  **防抖策略**: 对密集 `SEEK` 操作建议在 Socket 发送层做 50ms 节流。

---

**文档结束**
本设计文档旨在作为 Local Party Next 项目实施的唯一真理来源。
