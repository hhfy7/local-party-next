# Local Party Next - AI操作指南

> **项目定位**: 异地同屏观看本地视频，**零上传隐私保护**
>
> **一句话理解**: 像"一起看电影"的P2P视频同步工具 - 视频文件只在本地处理，通过WebRTC点对点传输

## 🎯 项目核心概念

### 这是干什么的？

- **异地同屏**: 多人在不同地点同步观看同一个本地视频文件
- **零上传**: 视频文件永远不会上传到服务器，只在本地处理
- **P2P传输**: 通过WebRTC在浏览器之间直接传输视频文件
- **实时同步**: 播放、暂停、进度跳转完全同步

### 技术亮点

- **隐私保护**: 本地文件处理，无需上传到云端
- **P2P传输**: WebRTC + WebTorrent技术组合
- **跨平台**: 支持桌面端和移动端
- **零配置**: 打开浏览器就能用

## 📍 项目结构速览

### 前端 (`packages/client/src/`)

```
├── components/          # React组件 - 按功能域分类
│   ├── chat/           # 💬 聊天和用户列表
│   ├── modals/         # 🪟 各种弹窗
│   ├── room/           # 🏠 房间核心功能
│   ├── transfer/       # 📁 P2P文件传输
│   ├── ui/             # 🎨 通用UI组件
│   └── video/          # 📺 视频播放相关
├── hooks/              # 🪝 业务逻辑Hook
├── utils/              # 🛠️ 工具函数
└── stores/             # 🏪 全局状态管理
```

### 后端 (`packages/server/src/`)

```
├── socket/handlers/    # 🔌 Socket事件处理
│   ├── authHandler.ts  # 房间管理
│   ├── syncHandler.ts  # 视频同步
│   └── p2pHandler.ts   # P2P信令转发
└── state/              # 💾 内存状态管理
```

## 🚀 AI操作手册

### 情况1: 我要新增功能

**第一步: 确定功能类型**

- 聊天功能 → `components/chat/`
- 传输功能 → `components/transfer/`
- 房间功能 → `components/room/`
- 通用UI → `components/ui/`

**第二步: 创建文件**

```bash
# 示例: 新增白板功能
cd packages/client/src/components/
mkdir whiteboard
touch whiteboard/WhiteboardMain.tsx whiteboard/WhiteboardToolbar.tsx

# 需要后端支持
cd ../../../../server/src/socket/handlers/
touch whiteboardHandler.ts
```

**第三步: 遵循模板**

```typescript
// components/whiteboard/WhiteboardMain.tsx
import React from 'react'
import { useWhiteboard } from '@/hooks/useWhiteboard'

export const WhiteboardMain = () => {
  const { canvas, tools } = useWhiteboard()

  return <div>{/* 白板UI */}</div>
}
```

### 情况2: 我要修复Bug

**第一步: 定位问题**

```bash
# 根据错误信息查找
grep -r "错误关键词" packages/client/src/

# 或者根据功能定位
# 视频问题 → components/video/
# 传输问题 → components/transfer/
# 聊天问题 → components/chat/
```

**第二步: 分析调用链**

```typescript
// 检查相关Hook
import { useVideoSync } from '@/hooks/useVideoSync'
import { useAppStore } from '@/stores/useAppStore'
```

**第三步: 最小化修复**

- 只改必要的代码
- 保持API兼容
- 添加错误处理

### 情况3: 我要优化性能

**第一步: 找到瓶颈**

- 检查是否频繁re-render → 加React.memo
- 检查是否重复计算 → 加useMemo/useCallback
- 检查是否网络频繁 → 调整同步频率

**第二步: 具体优化**

```typescript
// 组件优化
const MyComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => processData(data), [data])
  return <div>{processedData}</div>
})

// 网络优化
const SYNC_INTERVAL = 5000 // 5秒心跳，不要更频繁
const SYNC_THRESHOLD = 2000 // 2秒误差容忍
```

## 🎯 核心功能速查

| 功能     | 前端文件                                   | 后端文件                         | 关键Hook            |
| -------- | ------------------------------------------ | -------------------------------- | ------------------- |
| 视频播放 | `components/video/VideoPlayer.tsx`         | -                                | `useVideoSync.ts`   |
| 文件传输 | `components/transfer/TransferProgress.tsx` | `socket/handlers/p2pHandler.ts`  | `useP2PTransfer.ts` |
| 聊天消息 | `components/chat/ChatPanel.tsx`            | `socket/handlers/syncHandler.ts` | -                   |
| 房间管理 | `components/room/DesktopSidebar.tsx`       | `socket/handlers/authHandler.ts` | `useRoomLogic.ts`   |
| 状态管理 | `stores/useAppStore.ts`                    | `state/roomStore.ts`             | -                   |

## ⚡ 快速决策

**AI遇到问题时的思考路径**:

1. **这是什么功能？** → 看目录结构就知道
2. **需要修改哪里？** → 查上面的功能速查表
3. **是否涉及业务规则？** → 检查是否修改了同步/权限/心跳逻辑
4. **如何验证？** → 运行 `pnpm lint && pnpm build`

## 💡 架构理解

### 为什么这么设计？

- **目录按功能分**: 相关组件放一起，减少跨目录引用
- **Hooks集中管理**: 业务逻辑与UI分离，便于测试
- **状态分层**: 全局用Zustand，局部用useState，复杂用自定义Hook

### 核心业务流程

1. **加入房间**: `JoinModal` → `authHandler` → `RoomPage`
2. **视频同步**: `VideoPlayer` → `useVideoSync` → `syncHandler` → 广播给所有人
3. **文件传输**: `TransferProgress` → `useP2PTransfer` → `p2pHandler` → WebRTC直连

---

**最后检查**: 修改前运行 `pnpm lint` 和 `pnpm build` 确保代码质量。
