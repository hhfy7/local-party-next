# Local Party Next 核心业务规则与实现细节 (CRITICAL)

> **⚠️ 警告**: 本文档记录了项目中**不可随意修改**的关键业务逻辑与防御性代码。

---

## 1. 前端：视频播放与同步引擎

### 1.1 同步死循环防护 (Sync Loop Protection)

**位置**: `hooks/useVideoSync.ts`

- **远程锁 (`isRemoteAction`)**: 收到远端指令后，必须设置锁，并延迟 **1200ms** 释放。
- **跳转锁 (`isSeekingRef`)**:
  - 当触发 `seeking` 事件时开启锁，禁止发送 `play/pause` 指令。
  - `seeked` 事件触发后，先发送 `seek` 指令，再延迟 **500ms** 释放锁（防止浏览器自动补发 `play`）。
- _原因_: 解决原生事件触发顺序不一致导致的广播风暴。

### 1.2 拖拽进度条防抖 (Seek Debounce)

**位置**: `hooks/useVideoSync.ts`

- **规则**: 只有停止拖拽（松手）**600ms** 后才发送 `seek` 指令。

### 1.3 初始状态自动同步

- **规则**: 新用户加入后，必须等待 `onLoadedMetadata` 事件触发，再根据 `lastAction` 跳转进度。

### 1.4 iPad/移动端交互兼容性

**位置**: `components/VideoPlayer.tsx`

- **透明遮罩**: 视频上方必须有 `85%` 高度的透明遮罩，用于拦截原生点击。
- **手动控制**: 点击遮罩时，必须手动调用 `video.play()/pause()` 并触发 UI 反馈（Ping 动画）。

---

## 2. 数据生命周期与持久化

### 2.1 智能会话恢复 (Session Recovery)

**位置**: `hooks/useFileHandler.ts`, `utils/storage.ts`

- **视频句柄**: 存储在 IndexedDB。恢复时必须再次调用 `requestPermission()`。
- **最近房间**:
  - 成功加入/创建房间时，记录 ID 到 `localStorage.last_visited_room`。
  - 首页检测到记录时，展示“回到上次房间”入口。
  - 显式退出或点击“忘记”时，清除该记录。

### 2.2 房间重生机制 (Room Rebirth)

**位置**: `pages/RoomPage.tsx`, `hooks/useRoomLogic.ts`

- **场景**: 用户尝试进入已过期的房间。
- **处理**:
  - 展示 **橙色失效页 (RoomNotFoundScreen)**。
  - 提供 **“一键新建”** 按钮，复用当前昵称自动创建新房间并跳转。

---

## 3. 后端：生命周期 (核心变更)

**位置**: `server/state/roomStore.ts`

### 3.1 房间缓刑期 (Grace Period)

- **规则**: 当房间最后一人离开时，**不立即销毁**。
- **时长**: 保留 **5 分钟**。
- **机制**:
  - 离人时启动计时器 `scheduleCleanup`。
  - 5分钟内有人重连 -> `cancelCleanup`，房间无感存活。
  - 5分钟后 -> 彻底销毁，内存释放。
- _原因_: 解决页面刷新/误触后退导致房间意外丢失的痛点。

---

## 4. UI/UX 规范

### 4.1 视频一致性校验 (Video Integrity)

**位置**: `pages/RoomPage.tsx` (User List)

- **基准**: 以房主（列表第一人）的视频时长为准。
- **规则**:
  - 时长差 < 2秒 -> 🟢 已就绪
  - 时长差 > 2秒 -> 🟡 时长不符 (Tooltip 提示)
  - 无时长 -> ⚪️ 等待选择

### 4.2 沉浸式主题切换

**位置**: `pages/RoomPage.tsx`

- **规则**:
  - `videoUrl` 为空 -> `bg-gray-50` (浅色)。
  - `videoUrl` 有值 -> `bg-gray-900` (深色)。
  - 切换必须有 `transition-colors duration-700`。

### 4.3 交互反馈

- **视频点击**: 屏幕中心显示播放/暂停图标的 **Ping 动画**。
- **系统消息**: 格式为 `[时间] [用户名(胶囊)] [动作]`。

---

> **维护者注**: 修改上述任何逻辑前，请先在本地进行完整场景的回归测试。
