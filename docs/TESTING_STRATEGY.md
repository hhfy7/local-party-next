# Local Party Next - 自动化测试实施指南 (Testing Strategy)

> **文档状态**: Draft (待执行)
> **目标读者**: AI Agent / 开发人员
> **更新日期**: 2026-01-20

本文档旨在为 **Local Party Next** 项目构建一套稳健的 **端到端 (E2E) 自动化测试框架**。由于项目涉及复杂的 **多用户实时同步** 和 **P2P 文件传输**，传统的单元测试无法覆盖核心链路，因此我们采用 **Playwright** 进行全链路仿真测试。

---

## 1. 目标与工具 (Objective & Tools)

### 1.1 核心目标

- **防退化 (Regression Prevention)**: 确保核心功能（建房、同步、传输）在后续迭代（如添加弹幕、字幕）中不被破坏。
- **多角色仿真 (Multi-User Simulation)**: 自动化模拟 "房主 (Host)" 和 "访客 (Guest)" 在不同浏览器窗口中的实时交互。
- **视觉保障 (Visual Assurance)**: 确保移动端布局在重构中保持稳定。

### 1.2 工具选型

- **框架**: [Playwright](https://playwright.dev/) (因其原生支持多 Context 隔离和网络拦截)
- **语言**: TypeScript (与项目技术栈保持一致)
- **运行环境**: 本地开发环境 (Localhost) + CI (未来规划)

---

## 2. 目录结构规范 (Directory Structure)

我们将测试相关代码集中管理在项目根目录的 `e2e` 文件夹中，避免污染 `packages/` 源码。

```text
local-party-next/
├── e2e/
│   ├── fixtures/           # 测试夹具 (封装通用逻辑)
│   │   └── room-helper.ts  # 封装 "建房"、"加入"、"Mock文件" 等复用逻辑
│   ├── specs/              # 测试用例 (Test Specs)
│   │   ├── lifecycle.spec.ts     # TC-01: 核心生命周期
│   │   ├── p2p.spec.ts           # TC-02: P2P 传输
│   │   └── mobile-layout.spec.ts # TC-03: 移动端视觉回归
│   └── test-assets/        # 测试素材
│       └── small-video.mp4 # 一个真实的微型 MP4 文件 (<1MB)
├── playwright.config.ts    # 配置文件
└── package.json            # 脚本定义
```

---

## 3. 核心难点与解决方案 (Technical Solutions)

### 3.1 难点 A: 绕过原生文件选择框

**问题**: `window.showOpenFilePicker` 和 `<input type="file">` 点击后会弹出操作系统窗口，Playwright 无法控制。
**解决方案**:

- 利用项目现有的 **Fallback Input** (`<input id="hidden-file-input">`)。
- 使用 Playwright 的 `setInputFiles` API 直接注入文件路径。
- **代码示例**:
  ```typescript
  // 机器人直接操作隐藏的 input，绕过点击和弹窗
  await page
    .locator('#hidden-file-input')
    .setInputFiles('e2e/test-assets/small-video.mp4')
  ```

### 3.2 难点 B: 本地 HTTPS 证书信任

**问题**: 开发环境使用自签名证书，Playwright 默认会拦截不安全的 HTTPS 请求。
**解决方案**:

- 在 `playwright.config.ts` 中全局配置 `ignoreHTTPSErrors: true`。

### 3.3 难点 C: 异地多用户模拟

**问题**: 需要同时控制两个用户，且不能共享 Cookie/LocalStorage。
**解决方案**:

- 使用 `browser.newContext()` 创建完全隔离的“浏览器实例”。
  ```typescript
  const hostContext = await browser.newContext() // 房主浏览器
  const guestContext = await browser.newContext() // 访客浏览器
  const hostPage = await hostContext.newPage()
  const guestPage = await guestContext.newPage()
  ```

---

## 4. 核心测试案例设计 (Test Cases Design)

这是本阶段必须优先实现的 **关键路径 (Critical Path)**。

### ✅ TC-01: 房间生命周期与基础同步 (The Smoke Test)

**优先级**: P0 (最高)
**目的**: 验证最基础的“能不能用”。

1.  **准备**: 启动 `pnpm dev`。
2.  **Host 动作**:
    - 打开首页 -> 输入昵称 "HostUser"。
    - 点击 "新建房间"。
    - **验证**: URL 变为 `/room/xxxx`，页面显示 "Room xxxx"。
    - **文件注入**: Host 注入 `small-video.mp4`。
    - **验证**: 视频播放器出现，Video 状态为 `paused`。
3.  **Guest 动作**:
    - 打开 Host 的 URL -> 输入昵称 "GuestUser"。
    - 点击 "加入"。
    - **验证**: 成功进入房间，不显示错误弹窗。
4.  **同步动作**:
    - Host 点击 "播放" 按钮。
    - **关键验证**: Guest 页面中的 `<video>` 元素属性 `paused` 变为 `false`，且 `currentTime` > 0。

### ✅ TC-02: P2P 视频传输 (The Complex Feature)

**优先级**: P0 (最高)
**目的**: 验证核心卖点 P2P 功能是否正常。

1.  **前置**: 完成 TC-01 的建房与加入步骤，且 Host 已选好视频。
2.  **Host 动作**:
    - 点击 "Info" 面板 (或侧边栏) -> 点击 "分享视频给成员"。
    - **验证**: UI 显示 "等待对方接受"。
3.  **Guest 动作**:
    - **验证**: 屏幕出现 `TransferConfirmModal` 弹窗，显示文件名。
    - 点击 "接受"。
    - **验证**: 出现进度条 `TransferProgress`。
4.  **传输完成验证**:
    - 等待进度条消失。
    - **关键验证**: Guest 的 `<video>` 标签 `src` 属性变为一个 `blob:` URL。
    - **关键验证**: Guest 视频自动开始播放。

### ✅ TC-03: 移动端视觉回归 (Mobile Visual)

**优先级**: P1 (中)
**目的**: 防止 CSS 修改导致手机端布局崩坏。

1.  **配置**: 使用 `iPhone 13` Viewport 启动测试。
2.  **动作**:
    - 进入房间。
    - 分别点击底部 Tab: "Chat", "Users", "Info"。
3.  **验证**:
    - `expect(page).toHaveScreenshot('mobile-chat-tab.png')`
    - 确保关键按钮（如发送按钮）在视口内可见。

---

## 5. 执行计划 (Execution Plan)

请按照以下顺序逐步执行实施：

### 第一步：环境基建 (Infrastructure)

1.  [ ] **安装依赖**:
    ```bash
    pnpm add -D -w @playwright/test
    pnpm exec playwright install chromium webkit --with-deps
    ```
2.  [ ] **创建配置文件**: `playwright.config.ts` (配置 HTTPS 忽略、WebServer 自动启动)。
3.  [ ] **创建素材**: 生成或下载一个 1MB 以内的 `e2e/test-assets/small-video.mp4`。

### 第二步：编写测试夹具 (Fixtures)

1.  [ ] **创建 `e2e/fixtures/room-helper.ts`**:
    - 封装 `createRoom(page, username)` 函数。
    - 封装 `joinRoom(page, url, username)` 函数。
    - 封装 `injectVideoFile(page, filePath)` 函数。

### 第三步：实现核心案例 (Implementation)

1.  [ ] **编写 `e2e/specs/lifecycle.spec.ts`**: 实现 TC-01。
2.  [ ] **运行验证**: `npx playwright test`，确保全绿通过。

### 第四步：CI 集成 (可选)

1.  [ ] 在 `package.json` 添加 `"test:e2e": "playwright test"`。

---

## 6. 给 AI 的操作指令 (Prompt for AI)

如果你是后续接手的 AI，请直接读取本文档，并执行以下 Prompt：

> "请读取 `docs/TESTING_STRATEGY.md`，目前我们处于 '执行计划' 的第一步。请帮我安装 Playwright 依赖，创建配置文件，并生成一个测试用的 dummy video 文件。不要急着写测试代码，先搭建环境。"
