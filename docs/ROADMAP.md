# Local Party Next - 功能演进路线图 (Roadmap)

本文档记录了项目未来的功能规划、优先级排序及技术实现蓝图。开发团队（包括 AI 代理）应参考此文档进行后续迭代。

## 优先级总览


1. **[P1] 字幕同步 (Subtitle)**: 核心体验补全，解决“看不懂”的硬伤。
2. **[P2] 踢人权限 (Kick/Ban)**: 基础管理功能，防止恶意破坏。
3. **[P3] 多人 P2P 架构 (Multi-User P2P)**: 难度最高，涉及核心架构重写，建议放在最后攻坚。

---


## 2. [P1] 外挂字幕同步 (Subtitle Sync)

> **优先级**: ⭐⭐⭐⭐ (高)
> **理由**: 很多本地视频没有内嵌字幕。此功能实现成本中等，但对用户体验提升巨大。

### 技术蓝图

- **文件解析 (Frontend)**:
  - 房主上传 `.srt` 或 `.vtt` 文件。
  - 前端使用库 (如 `srt-parser-2`) 解析内容，或者简单地将其转换为 WebVTT 格式字符串。
- **信令传输 (Socket)**:
  - **Client 发送**: `socket.emit('sync_subtitle', { content: string, fileName: string })`
  - **Server 广播**: 直接转发给房间所有人（因为文本通常 <100KB，无需走复杂 P2P，WebSocket 足够承载）。
- **挂载显示 (Receiver)**:
  1.  接收端收到字符串内容。
  2.  创建 Blob 对象: `const blob = new Blob([content], { type: 'text/vtt' })`。
  3.  生成 URL: `const blobUrl = URL.createObjectURL(blob)`。
  4.  动态创建 `<track default kind="subtitles" src={blobUrl} />` 并插入到 `<video>` 标签中。
- **难点**:
  - 不同浏览器的文本编码兼容性（如 GBK 乱码处理）。
  - 字幕时间轴的手动微调功能（Offset）。

---

## 3. [P2] 踢人与权限控制 (Kick & Ban)

> **优先级**: ⭐⭐⭐ (中)
> **理由**: 属于“防御性功能”。在熟人局中用不到，但在公开房中是必须的。

### 技术蓝图

- **后端 (Server)**:
  - 文件: `authHandler.ts`
  - 新增事件: `kick_user`
  - 逻辑:
    1.  验证发起者是否为当前房间的 `hostId`。
    2.  在 `io.sockets` 中找到目标用户的 Socket 连接。
    3.  执行 `targetSocket.disconnect(true)` 强制断开。
    4.  更新房间用户列表并广播 `user_left`。
- **前端 (Client)**:
  - 文件: `UserItem.tsx`
  - UI: 仅当 `isHost === true` 且目标不是自己时，显示“移除”图标（垃圾桶或踢出脚印）。
  - 交互: 点击后需二次确认。
  - 反馈: 监听 `disconnect` 原因，如果是被踢，显示“您已被移出房间”的 Toast，并禁止该 Session 立即重连。
- **难点**:
  - 区分“网络波动掉线”和“被踢出”的 UX 提示。

---

## 4. [P3] 多人 P2P 传输与同步 (Multi-User P2P Mesh)

> **优先级**: ⭐⭐ (低 - 长期目标)
> **理由**: 这是一个复杂的分布式系统问题。实现它需要重写 `useP2PManager`，从“一对一”变为“一对多”。工作量最大。

### 技术蓝图

- **拓扑结构**:
  - 初期采用 **星型广播 (Star Topology)**。
  - 房主维持一个 Peer 数组 `peers: SimplePeer[]`，对应每一个 Guest。
- **分发逻辑 (Distribution)**:
  - 房主循环遍历 `peers`，将文件流 (Stream) 或分块 (Chunks) 并发发送给所有连接状态为 `connected` 的 Peer。
- **同步仪表盘 (Dashboard)**:
  - 后端维护一个状态表 `transferStatus: { [userId]: number }` (0-100%)。
  - 每个客户端定期（如每秒）汇报下载进度。
  - 前端 `P2POverlay` 改造为列表形式，显示全员进度。
- **强制等待锁 (Barrier Lock)**:
  - **原则**: “木桶效应”——全员必须等待最慢的人。
  - 逻辑: 播放器增加一个强制遮罩层。
  - 条件: `if (users.some(u => u.progress < 100)) return <LockScreen />`。
  - 只有当服务器广播 `all_users_ready` 时，房主才能解锁播放控制权。
- **难点**:
  - 房主上行带宽压力倍增。
  - 异常处理复杂（如传输过程中某人掉线，是否中断其他人？）。
