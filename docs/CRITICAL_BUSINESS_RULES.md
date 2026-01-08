# Local Party Next 核心业务规则与实现细节 (CRITICAL)

> **⚠️ 警告**: 本文档记录了项目中不可随意修改的关键业务逻辑。**当前架构：Host-Authoritative (房主权威模式)。**

---

## 1. 视频同步引擎 (Sync Engine)

### 1.1 权限与控制

**位置**: `hooks/useVideoSync.ts`

- **房主 (Host)**: 拥有唯一控制权。只有 `isHost === true` 时才允许发送 `socket.emit('send_sync')`。
- **成员 (Guest)**:
  - **本地自由**: 允许自由暂停、拖拽进度条。
  - **静默操作**: 成员的操作**绝不**发送 Socket 指令，不影响他人。
  - **防环锁 (`isRemoteAction`)**: 即使是房主，在处理初始加载 (`handleVideoLoaded`) 触发的 DOM 事件时，也必须加锁，防止误发 `seek`。

### 1.2 心跳与自动纠偏 (Heartbeat & Auto-Correction)

**位置**: `hooks/useVideoSync.ts`

- **发送端 (Host)**: 只要视频在播放，每 **5秒** 发送一次心跳 `{ timestamp, paused: false }`。
- **接收端 (Guest)**:
  - **规则 A (主动掉队)**: 如果本地处于 `paused` 状态，**忽略** 心跳纠正。显示橙色按钮“点击追赶”。
  - **规则 B (被动掉队)**: 如果本地在播放，但与心跳误差 `> 2秒`，**强制跳转** 至心跳时间，并显示绿色提示。

### 1.3 初始状态同步 (Initial Sync)

**位置**: `hooks/useVideoSync.ts` / `handleVideoLoaded`

- **时间补偿**:
  - 必须计算：`TargetTime = lastAction.timestamp + (Date.now() - lastActionAt) / 1000`。
  - **原因**: `lastAction` 可能是很久以前的指令，必须加上流逝的时间才能算出房主当前的真实进度。

---

## 2. 移动端与交互适配

### 2.1 移动端原生兼容 (Plan C)

- **策略**: 使用原生 `<video controls>`。
- **兼容性**: 允许 iOS/Android 使用原生全屏。因为采用了“房主权威”模式，成员在原生播放器里的误触不会破坏房间同步，只会导致自己掉队（随后会被心跳拉回）。

### 2.2 掉队提示 UI

**位置**: `pages/RoomPage.tsx`

- **橙色按钮**: 仅在 `isManualPaused` (房主播、我停) 时显示。点击后触发 `triggerResync`。

---

## 3. 基础设施与安全

### 3.1 HTTPS 开发环境

- **强制要求**: 为了支持 `File System Access API` 和移动端调试，开发环境必须运行在 HTTPS 下。
- **证书**: 使用 `keys/key.pem` 和 `keys/cert.pem` (自签名)。
- **信任**: 首次运行时，需在手机/电脑浏览器中手动访问后端端口 (e.g. `:4000`) 并信任证书。

### 3.2 房间生命周期

- **缓刑期 (Grace Period)**: 房间空置后保留 5 分钟。
- **房主移交**: 房主掉线后，服务器自动移交权限给下一位在线用户。

---

## 4. UI/UX 规范

### 4.1 视频一致性校验

- **红绿灯**: 依然保留。对比 `user.videoDuration` 与房主的时长。误差 < 2秒为绿色。

### 4.2 沉浸式体验

- **主题**: 播放时自动切换深色模式 (`bg-gray-900`)。

---

_文档更新时间: 2026-01-08_