# Local Party Next Agent Guide

此文档包含 AI 代理（如 Cursor、Claude Code 等）在该存储库中工作所需的关键信息。并且回答的时候请使用简体中文

## 1. 项目概览

Local Party Next 是一个全栈 Monorepo Web 应用，支持**异地同屏观看本地视频**。

- **核心理念**：零上传隐私保护，视频文件仅本地处理。
- **架构**：Client (React) + Server (Node.js) + Shared (Types)。

## 2. 技术栈

- **包管理器**: `pnpm` (Workspace)
- **前端**: React 19, Vite, Tailwind CSS 4.0, Zustand, Socket.io-client
- **后端**: Node.js, Express, Socket.io
- **存储**: IndexedDB (idb-keyval)
- **传输**: WebTorrent (P2P)

## 3. 开发命令 (Build/Lint/Test)

**注意**: 本项目目前**没有配置自动化测试** (Jest/Vitest)。如果任务要求添加测试，请推荐使用 `vitest` 并配置相关脚本。

### 核心命令 (Root)

- **安装依赖**: `pnpm install`
- **启动开发**: `pnpm dev` (同时启动前后端)
- **构建项目**: `pnpm build` (构建 client, server, shared)
- **代码检查**: `pnpm lint` (ESLint)
- **格式化**: `pnpm run format` (Prettier - **提交前必须运行**)
- **清理**: `pnpm clean`

### 子包命令

- **Client**: `cd packages/client`
  - `pnpm dev` (Port 5173)
  - `pnpm build`
  - `pnpm preview`
- **Server**: `cd packages/server`
  - `pnpm dev` (Port 4000)
  - `pnpm build`
  - `pnpm start` (生产模式)

## 4. 代码规范 (Code Style)

### 4.1 导入规范 (Imports)

- **路径别名**: 前端代码必须使用 `@/` 指向 `packages/client/src`。
- **共享类型**: 引用共享类型时使用完整路径或 Workspace 引用：
  ```typescript
  import type { User } from '@local-party/shared/src/types'
  ```
- **顺序**:
  1. React / 第三方库
  2. Store / Hooks
  3. Types
  4. Components
  5. Utils / Assets

### 4.2 TypeScript

- **严格模式**: 必须启用 strict mode。
- **类型定义**: 优先使用 `interface` 定义对象结构，`type` 定义联合类型。
- **显式类型**: 导出函数和关键逻辑必须有显式返回类型。
- **不要使用 `any`**: 尽量使用 `unknown` 或具体的泛型。

### 4.3 React & Hooks

- **函数式组件**: 必须使用 `const Component = () => {}` 形式。
- **Hooks 分离**: 复杂逻辑（如 Socket 通信、文件处理）必须提取到 `packages/client/src/hooks/` 下的自定义 Hook 中。
- **Store**: 全局状态使用 Zustand (`useAppStore`)，避免 Context Hell。

### 4.4 样式 (Tailwind CSS)

- 使用 Tailwind Utility Classes 直接写在 `className` 中。
- 复杂条件样式使用 `clsx` 或 `tailwind-merge`。
- 保持移动端优先 (Mobile-First) 的响应式设计。

### 4.5 命名约定

- **文件**: `PascalCase.tsx` (组件), `camelCase.ts` (Hooks/Utils).
- **变量/函数**: `camelCase`.
- **常量**: `UPPER_SNAKE_CASE`.
- **布尔值**: 使用 `is`, `has`, `can` 前缀 (e.g., `isHost`, `hasFile`).

## 5. 核心业务规则 (Business Rules)

在修改核心逻辑时，**必须**遵守以下规则：

1.  **房主权威模式 (Host Authority)**:
    - 只有 `isHost === true` 的用户可以发送 `send_sync` 指令。
    - 普通成员 (Guest) 的操作（暂停/播放）仅影响本地，不广播。

2.  **同步防抖 (Loop Prevention)**:
    - 必须使用 `isRemoteAction` ref 锁来区分“用户操作”和“Socket 同步事件”。
    - 收到 Socket 指令更新 Video 时，设置 `isRemoteAction.current = true`，防止触发 `onPlay/onPause` 回调导致死循环。

3.  **心跳机制 (Heartbeat)**:
    - 房主每 5 秒广播一次 `send_heartbeat`。
    - 客户端检测到误差 > 2秒时，强制跳转同步。

4.  **文件处理**:
    - 视频文件通过 File System Access API 获取。
    - 必须处理文件句柄丢失或权限不足的情况。

## 6. 错误处理

- **UI 反馈**: 使用 `react-hot-toast` 显示用户友好的错误信息。
- **控制台**: 开发环境保留关键 Debug 日志 (如 `[RoomPage Debug]`)，生产环境应静默。
- **异步操作**: 所有 Promise 必须有 `.catch()` 或 `try/catch` 块。

## 7. 代理工作流程

1.  **阅读理解**: 在修改前，先阅读 `CLAUDE.md` 和相关文件的上下文。
2.  **计划**: 提出修改计划，确认是否涉及核心业务规则。
3.  **执行**: 修改代码，确保遵循上述代码风格。
4.  **验证**:
    - 运行 `pnpm lint` 检查静态错误。
    - 运行 `pnpm run format` 格式化代码。
    - 能够编译通过 (`pnpm build`)。
