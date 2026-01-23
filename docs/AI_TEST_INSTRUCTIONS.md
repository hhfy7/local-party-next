# Local Party Next - AI 测试执行手册 (AI Test Runbook)

> **用途**: 本文档专为 AI Agent 设计。如果你是被召唤来进行测试的 AI，请严格遵循以下指引。
> **最后更新**: 2026-01-20

## 1. 快速开始 (Quick Start)

**不要安装任何东西！** 环境已经配置好了。直接运行以下命令：

```bash
# 运行所有测试 (Headless 模式)
npx playwright test

# 运行特定测试文件
npx playwright test e2e/specs/lifecycle.spec.ts
npx playwright test e2e/specs/mobile-layout.spec.ts
npx playwright test e2e/specs/p2p.spec.ts

# 调试模式 (带浏览器界面)
npx playwright test --ui
```

## 2. 现有测试资产 (Test Assets)

### 2.1 目录结构

- **配置**: `playwright.config.ts` (已配置 HTTPS 和 localhost:5173)
- **夹具**: `e2e/fixtures/room-helper.ts` (封装了建房、加入、文件注入逻辑)
- **素材**: `e2e/test-assets/small-video.mp4` (测试用视频文件)

### 2.2 已实现的测试案例 (Test Cases)

| ID        | 描述                                                                                    | 文件                              | 状态               |
| --------- | --------------------------------------------------------------------------------------- | --------------------------------- | ------------------ |
| **TC-01** | **房间生命周期 (Smoke Test)**<br>验证建房、进房、视频注入、播放同步。                   | `e2e/specs/lifecycle.spec.ts`     | ✅ 通过            |
| **TC-02** | **P2P 传输**<br>验证 Host 分享文件，Guest 接收并播放。<br>_(注：WebRTC 对网络环境敏感)_ | `e2e/specs/p2p.spec.ts`           | ✅ 已实现 (需验证) |
| **TC-03** | **移动端视觉回归**<br>验证 Pixel 5 视口下 UI 不崩坏。<br>_(注：首次运行会生成基准截图)_ | `e2e/specs/mobile-layout.spec.ts` | ✅ 通过            |

## 3. 常见问题 (Troubleshooting)

- **HTTPS 错误**: 如果遇到 SSL 报错，请检查 `playwright.config.ts` 中的 `ignoreHTTPSErrors: true`。
- **超时 (Timeout)**:
  - 建房/进房如果超时，通常是因为 DOM 选择器变了。
  - 请检查 `e2e/fixtures/room-helper.ts` 中的 `getByText` 或 `getByRole` 是否与代码匹配。
- **文件注入失败**: 确保 `e2e/test-assets/small-video.mp4` 存在。
- **P2P 失败**: 如果 `p2p.spec.ts` 失败，首先检查是否开启了 VPN (会导致 ICE 连接失败)。

## 4. 编写新测试指南 (Guide for AI)

如果你需要编写新测试，请：

1. **复用 Fixture**: 始终使用 `RoomHelper` 类来处理建房和进房。
2. **移动端测试**: 在 `test.use()` 中指定 `...devices['Pixel 5']` (避免下载 WebKit)。
3. **保持清理**: 测试结束后不需要手动删除房间，Server 重启会自动清理。

---

**致 AI**: 读取完本文档后，你应当知道如何运行 `npx playwright test` 并根据结果反馈给用户。
