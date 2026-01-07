# Local Party Next 核心业务规则与实现细节 (CRITICAL)

> **⚠️ 警告**: 本文档记录了项目中**不可随意修改**的关键业务逻辑与防御性代码。

---

## 1. 前端：视频播放与同步引擎

### 1.1 同步死循环防护 (Sync Loop Protection)

**位置**: `hooks/useVideoSync.ts`

- **规则**: 收到远端指令后，必须设置 `isRemoteAction = true` 锁，并延迟 **1200ms** 释放。
- _原因_: 原生 `seeked` 事件触发有延迟，锁太短会导致回环。

### 1.2 拖拽进度条防抖 (Seek Debounce)

**位置**: `hooks/useVideoSync.ts`

- **规则**: 只有停止拖拽 **600ms** 后才发送 `seek` 指令。

### 1.3 初始状态自动同步

- **规则**: 新用户加入后，必须等待 `onLoadedMetadata` 事件触发，再根据 `lastAction` 跳转进度。

### 1.4 iPad/移动端交互兼容性

**位置**: `components/VideoPlayer.tsx`

- **透明遮罩**: 视频上方必须有 `85%` 高度的透明遮罩，用于拦截原生点击。
- **手动控制**: 点击遮罩时，必须手动调用 `video.play()/pause()` 并触发 UI 反馈（Ping 动画）。

### 1.5 智能会话恢复

**位置**: `hooks/useFileHandler.ts`

- **IndexedDB**: 存储文件句柄。恢复时必须再次调用 `requestPermission()`。

### 1.6 视频一致性校验 (Video Integrity)

**位置**: `pages/RoomPage.tsx` (User List 渲染逻辑)

- **基准**: 以房主（列表第一人）的视频时长为准。
- **规则**:
  - 时长差 < 2秒 -> 🟢 已就绪
  - 时长差 > 2秒 -> 🟡 时长不符 (Tooltip 提示)
  - 无时长 -> ⚪️ 等待选择

---

## 2. 前端：架构与状态管理

### 2.1 Hooks 拆分原则

- `useRoomLogic`: 登录/加入/错误。
- `useFileHandler`: 文件/缓存。
- `useVideoSync`: Socket/同步。
- **禁止**: 在 `RoomPage` 直接写 `useEffect` 处理业务。

### 2.2 自动登录保护

- **规则**: `useEffect` 中必须检查 `socket.connected === true` 才能发起 `join_room`。

---

## 3. 后端：生命周期

- **零持久化**: 房间人走即毁。

---

## 4. UI/UX 规范

### 4.1 沉浸式主题切换

**位置**: `pages/RoomPage.tsx`

- **规则**:
  - `videoUrl` 为空 -> `bg-gray-50` (浅色)。
  - `videoUrl` 有值 -> `bg-gray-900` (深色)。
  - 切换必须有 `transition-colors duration-700`。

### 4.2 交互反馈

- **视频点击**: 屏幕中心显示播放/暂停图标的 **Ping 动画**。
- **侧边栏**:
  - 点击视频**不再**自动收起侧边栏（避免与暂停冲突）。
  - 提供边缘唤出 (Edge Trigger) 和悬浮按钮。

### 4.3 系统消息样式

**位置**: `components/ChatPanel.tsx`

- **格式**: `[时间] [用户名(胶囊)] [动作]`。
- **胶囊**: 用户名必须包裹在 `bg-indigo-50` 圆角标签中。

---

> **维护者注**: 修改上述任何逻辑前，请先在本地进行完整场景的回归测试。
