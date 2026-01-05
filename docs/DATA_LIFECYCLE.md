# Local Party Next 数据生命周期与内存管理报告

本文档详细说明了应用中的数据流向、存储机制及内存回收策略，以确保系统长期运行的稳定性。

## 1. 服务端数据架构 (Server-Side)

本应用采用 **无数据库 (Database-less)** 架构，所有运行时数据均存储在 **服务器主内存 (RAM)** 中。

### 1.1 存储结构

```typescript
const roomStore = new Map<string, RoomState>()
// Key: RoomID (例如 "PFB1X")
// Value: RoomState 对象
```

### 1.2 房间生命周期 (Room Lifecycle)

- **创建 (Birth)**: 第一个用户发起 `create_room` 时，房间对象在内存中生成。
- **存活 (Life)**: 只要 `room.users.length > 0`，房间就一直存在。
- **销毁 (Death)**:
  - **触发条件**: Socket 收到 `disconnect` 事件。
  - **判定**: 移除用户后，检查 `room.users.length === 0`。
  - **执行**: `roomStore.delete(roomId)`。
  - **结果**: 内存立即释放。若此时有人试图加入该 ID，会收到“房间不存在”错误。

> **注意**: 如果服务器进程重启（如部署更新或 Crash），所有房间数据瞬间丢失。

---

## 2. 客户端持久化架构 (Client-Side Persistence)

为了提升用户体验（如自动登录、视频恢复），我们在浏览器端存储了少量元数据。

### 2.1 存储技术选型

- **LocalStorage**: 存储简单的文本数据（昵称）。
- **IndexedDB (via idb-keyval)**: 存储复杂的对象数据（文件句柄 `FileSystemFileHandle`）。

### 2.2 数据项与过期策略 (TTL)

| 数据类型     | 存储位置     | Key 格式             | 有效期 (TTL) | 清理时机           | 占用空间 |
| :----------- | :----------- | :------------------- | :----------- | :----------------- | :------- |
| **用户昵称** | LocalStorage | `lp_username`        | 7 天         | 每次读取时检查     | < 1 KB   |
| **视频句柄** | IndexedDB    | `lp_video_${roomId}` | 24 小时      | 每次进入房间时检查 | ~ 1 KB   |

### 2.3 垃圾回收机制 (Client GC)

我们采用了 **惰性删除 (Lazy Expiration)** 策略：

1.  **写入时**: 附带 `expiresAt` 时间戳。
2.  **读取时**: `getVideoHandle(roomId)` 会检查当前时间是否超过 `expiresAt`。
    - 若过期 -> **立即删除**该条记录，并返回 null。
    - 若未过期 -> 返回数据。
3.  **长期堆积问题**:
    - 如果用户创建了 100 个房间且**再也不访问**，这 100 条记录会残留在 IndexedDB 中。
    - **影响评估**: 由于我们只存储“文件句柄”（引用）而非文件本身，每条记录极小（KB级）。即使残留 1万条，总大小也不过 10MB 左右，对现代浏览器几乎无影响，因此暂未引入后台自动清理任务。

---

## 3. 前端大文件内存保护 (Runtime Memory)

### 3.1 Blob URL 机制

前端播放本地视频使用了 `URL.createObjectURL(file)`。这个 API 会在浏览器内存中创建一个指向文件的引用。如果不释放，即使页面跳转，这块内存（可能高达数 GB）也可能不被回收。

### 3.2 严格释放策略

在 `useFileHandler.ts` 中，我们实现了严格的生命周期管理：

```typescript
const loadVideo = (file: File) => {
  // 1. 检查旧引用，如果有，必须释放！
  if (videoUrl) URL.revokeObjectURL(videoUrl)
  // 2. 创建新引用
  setVideoUrl(URL.createObjectURL(file))
}
```

这确保了任意时刻，浏览器内存中**最多只存在一个**视频文件的引用，防止内存泄漏导致的页面崩溃。

---

## 4. 总结

- **隐私性**: 视频文件**物理隔离**，仅在用户本地磁盘和浏览器内存中流转，绝不上传服务器。
- **服务器**: 零持久化，人走房空，自动 GC。
- **客户端**: 惰性缓存清理，兼顾体验与存储空间。
