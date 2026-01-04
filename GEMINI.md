# Local Party Next - Gemini Context & Project Guide

**Local Party Next** 是对原 `local-party` 项目的现代化重构。它是一个支持 macOS (Host) 与 iPad (Guest) 异地同步观看本地视频的 Web 应用。

## 🤖 给 Gemini Agent 的重要上下文 (必读)

当你在此目录下启动时，请务必参考以下文档以维持上下文一致性：

1.  **`PROJECT_DESIGN.md`**: 核心设计方案。包含了详细的业务逻辑、同步机制、iPad 兼容性处理和安全设计。这是**开发的第一参考指南**。
2.  **`DEVELOPMENT_PLAN.md`**: 实时开发进度表。
3.  **核心技术栈**:
    *   **Frontend**: React 19 (使用最新 Hooks), Zustand (状态管理), Tailwind CSS (响应式布局), React Router v7.
    *   **Backend**: Node.js, Express, Socket.io v4.
    *   **Package Manager**: **必须使用 pnpm** (Monorepo 模式)。

## 📂 项目结构 (Monorepo)

*   `packages/client`: 前端单页应用 (Vite)。
*   `packages/server`: 后端信令服务器。
*   `packages/shared`: 存放前后端公用的 TypeScript 类型定义 (如 `SocketEvents`)。

## 🧪 验证与清理规范 (Verification & Cleanup Policy)

为了确保代码质量，Gemini 在完成每一步开发后必须遵循以下流程：

1.  **代码检查**: 运行 `pnpm run lint` 确保没有语法和规范错误。
2.  **启动验证**: 
    *   **后端**: 运行启动命令，捕捉到 `Server 正在运行` 日志为准。
    *   **前端**: 运行启动命令，捕捉到 `Vite` 启动成功的日志为准。
3.  **必须清理**: 验证通过后，**必须立即杀死**该进程（使用 `kill` 或相关工具），严禁让开发服务器在后台无意义运行。
4.  **记录日志**: 在对话中展示验证成功的日志片段。

## 🛠 开发与启动命令 (Cheat Sheet)

### 1. 全局启动 (推荐)
一次性启动前端和后端，适合联调。
```bash
# 在根目录执行
pnpm dev
```
*   **前端**: `http://localhost:5173`
*   **后端**: `http://localhost:4000`

### 2. 单独启动
如果你只想调试某一部分。

*   **只启动后端**:
    ```bash
    pnpm --filter @local-party/server run dev
    ```
    *   **测试方法**: 启动后，终端应显示 `Server 正在运行在 http://localhost:4000`。浏览器访问该地址显示 `Cannot GET /` 是正常的，因为它是 API 服务器。

*   **只启动前端**:
    ```bash
    pnpm --filter @local-party/client run dev
    ```

### 3. 代码检查 (Lint)
在提交代码前务必运行。
```bash
pnpm run lint
```
*   **预期结果**: 应该显示 "Done" 或没有错误输出。如果有 Error，必须修复。

## 🧪 阶段性测试指南

*   **Phase 1 (基础架构)**:
    1.  运行 `pnpm --filter @local-party/server run dev`。
    2.  观察终端无报错，显示 `Server 正在运行...`。
    3.  (可选) 使用 Postman 或 Socket.io 调试工具连接 `ws://localhost:4000`。

*   **Phase 2 (房间逻辑)**:
    1.  TBD (待开发完成后补充)

---
*此文档由 Gemini Agent 更新，用于确保跨会话的上下文延续。*
