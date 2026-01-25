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

## 🧪 单元测试指南

### 什么时候必须写单元测试？

**必须写**（不写不行）：

- 修改了核心算法（时间同步、P2P状态机）
- 新增复杂业务逻辑（权限控制、状态管理）
- 修复了边界条件bug（需要防止回归）

**推荐写**（写了更好）：

- 新增工具函数、Hook、状态管理
- 涉及网络异常、错误处理
- 有复杂判断逻辑（if/else、循环、定时器）

**可以不写**（简单功能）：

- 纯UI组件（只是渲染）
- 简单的props传递
- 样式调整、文案修改

### 怎么写单元测试？

**第一步：找到测试文件位置**

```bash
# 测试文件和源码同目录，在__tests__文件夹里
ls src/hooks/__tests__/        # Hook测试
ls src/utils/__tests__/        # 工具函数测试
ls src/components/*/ __tests__/ # 组件测试
```

**第二步：复制模板**

```typescript
// src/hooks/__tests__/useNewFeature.test.ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNewFeature } from '../useNewFeature'

describe('useNewFeature', () => {
  it('应该做XXX', () => {
    const { result } = renderHook(() => useNewFeature())

    act(() => {
      // 触发Hook行为
      result.current.doSomething()
    })

    // 验证结果
    expect(result.current.value).toBe('expected')
  })
})
```

**第三步：写核心测试用例**

```typescript
// 工具函数测试
describe('formatTime', () => {
  it('应该正确格式化时间', () => {
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(3661)).toBe('01:01:01')
  })
})

// Hook测试
describe('useP2PTransfer', () => {
  it('应该在连接失败时重试', () => {
    // Mock WebRTC连接失败
    // 验证重试逻辑
  })
})

// 组件测试
describe('VideoPlayer', () => {
  it('应该在点击播放按钮时播放视频', () => {
    // Mock视频元素
    // 模拟点击播放
    // 验证play()被调用
  })
})
```

### 写完后怎么办？

**每次修改后必须运行：**

```bash
pnpm test:unit           # 运行所有单元测试
pnpm test:unit:client    # 仅客户端测试
pnpm test:unit:server    # 仅服务端测试
```

**测试失败时的处理原则：**

1. **功能行为改变** → **更新测试**（测试跟着功能走）

   ```typescript
   // 原来是：暂停时立即发送
   // 现在是：暂停时延迟200ms发送
   // 测试也要相应修改
   expect(mockSocket.emit).toHaveBeenCalledWith('send_sync', {
     type: 'pause',
     timestamp: expect.any(Number),
   })
   ```

2. **测试逻辑错误** → **修复测试**（测试写错了）

   ```typescript
   // 原来是：expect(result.current.value).toBe(0)
   // 应该是：expect(result.current.value).toBe(mockData.length)
   ```

3. **功能和测试无关** → **不动测试**（各管各的）
   - UI样式修改 ≠ 修改业务逻辑测试
   - 文案调整 ≠ 修改算法测试
   - 新增功能 ≠ 修改旧功能测试

4. **功能被删除** → **删除对应测试**（不要留垃圾测试）
   ```bash
   # 删除无用测试文件
   rm src/hooks/__tests__/useOldFeature.test.ts
   ```

### 一键测试命令

```bash
# 开发时随时运行
pnpm test:unit           # 运行所有单元测试

# 代码质量检查
pnpm lint                # 检查代码规范
pnpm build              # 确保能编译通过
```

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

**最后检查**: 修改前运行 `pnpm lint` 和 `pnpm build` 确保代码质量。并且使用中文回复
