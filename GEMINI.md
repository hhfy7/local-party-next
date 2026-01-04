# Local Party Next - Gemini Context & Project Guide

**Local Party Next** 是对原 `local-party` 项目的现代化重构。它是一个支持 macOS (Host) 与 iPad (Guest) 异地同步观看本地视频的 Web 应用。

## 🤖 给 Gemini Agent 的重要上下文 (必读)

当你在此目录下启动时，请务必参考以下文档以维持上下文一致性：

1.  **`PROJECT_DESIGN.md`**: 核心设计方案。包含了详细的业务逻辑、同步机制、iPad 兼容性处理和安全设计。这是**开发的第一参考指南**。
2.  **`data/` 文件夹**: 存放了原始的开源代码。
    *   **为什么参考？**: 原项目的 `render.js` 和 `app.js` 包含了成熟的视频同步状态机和时间格式化逻辑。重构时应参考其业务流程，但使用新的技术栈实现。
3.  **核心技术栈**:
    *   **Frontend**: React 19 (使用最新 Hooks), Zustand (状态管理), Tailwind CSS (响应式布局), React Router v7.
    *   **Backend**: Node.js, Express, Socket.io v4.
    *   **Package Manager**: **必须使用 pnpm** (Monorepo 模式)。

## 📂 项目结构 (Monorepo)

*   `packages/client`: 前端单页应用 (Vite)。
*   `packages/server`: 后端信令服务器。
*   `packages/shared`: 存放前后端公用的 TypeScript 类型定义 (如 `SocketEvents`)。
*   `data/`: 原始代码仓库 (仅供参考)。

## 💡 开发关键点记录

*   **房间销毁机制**: 房间信息仅存储在服务端内存中。当房间内最后一个用户断开连接时，房间及其聊天记录必须立即销毁。
*   **iPad 兼容性**: 
    *   必须使用 `playsinline` 属性防止强制全屏。
    *   iPad 音量无法通过 JS 控制，UI 应引导用户使用物理按键。
*   **同步逻辑**: 区分“用户操作”和“远端同步”，防止 Socket 消息死循环 (Sync Loop)。
*   **大文件处理**: 使用 `URL.createObjectURL`，严禁将大视频文件读入内存。

## 🚀 快速启动

1.  **安装依赖**: `pnpm install` (在根目录执行)。
2.  **启动开发环境**: `pnpm dev` (同时启动前后端)。
3.  **iPad 测试**: 确保设备在同一 Wi-Fi，访问 `http://<MAC_IP>:5173`。

## 🛠 开发流程建议

1.  先在 `packages/shared/src/types.ts` 定义 Socket 事件和数据结构。
2.  在 `packages/server` 实现基础的房间逻辑。
3.  在 `packages/client` 实现视频播放器组件和 Zustand 状态同步。

---
*此文档由 Gemini Agent 生成，用于确保跨会话的上下文延续。*