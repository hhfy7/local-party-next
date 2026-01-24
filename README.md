# Local Party Next

Local Party Next 是一个全栈 Monorepo Web 应用，支持**异地同屏观看本地视频**。

- **核心理念**：零上传隐私保护，视频文件仅本地处理。
- **架构**：Client (React) + Server (Node.js) + Shared (Types)。

## 1. 技术栈

- **包管理器**: `pnpm` (Workspace)
- **前端**: React 19, Vite, Tailwind CSS 4.0, Zustand, Socket.io-client
- **后端**: Node.js, Express, Socket.io
- **存储**: IndexedDB (idb-keyval)
- **传输**: WebTorrent (P2P)

## 2. 快速开始 (Quick Start)

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

同时启动前端 (Client) 和后端 (Server)：

```bash
pnpm dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

## 3. 自动化测试 (E2E)

本项目使用 [Playwright](https://playwright.dev/) 进行端到端测试。

### 首次运行前准备

Playwright 需要下载专用的浏览器内核才能运行测试，请执行以下命令一键安装：

```bash
pnpm test:install
```

### 运行测试

| 命令               | 描述                         | 适用场景                    |
| ------------------ | ---------------------------- | --------------------------- |
| `pnpm test`        | 运行所有测试 (Headless 模式) | CI/CD，常规回归测试         |
| `pnpm test:ui`     | 打开测试 UI 界面 (带浏览器)  | 调试测试，查看步骤截图      |
| `pnpm test:no-p2p` | **排除 P2P 测试**            | **VPN/网络受限环境** (推荐) |

> **⚠️ 注意**: P2P 传输功能基于 WebRTC，对网络环境非常敏感。如果你开启了 VPN 或处于复杂网络环境下，P2P 测试可能会因为打洞失败而报错。此时请使用 `pnpm test:no-p2p` 跳过相关测试。

### 测试用例概览

- **Lifecycle**: 建房、进房、基础播放同步
- **Kick & Ban**: 踢人与封禁机制
- **Mobile**: 移动端布局适配与响应式检查
- **P2P**: 视频文件点对点传输
