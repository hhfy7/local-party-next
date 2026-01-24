import { Page, expect } from '@playwright/test'

/**
 * 房间操作助手 (Room Helper Fixture)
 * 封装建房、加入、文件注入等通用逻辑
 */
export class RoomHelper {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * 创建房间
   */
  async createRoom(username: string) {
    await this.page.goto('/')

    // 1. 在首页菜单点击 "创建房间" 卡片
    // 使用 text 匹配比较稳健
    await this.page.getByText('创建房间', { exact: true }).click()

    // 2. 填写表单
    // 昵称输入框 (根据 placeholder)
    const nameInput = this.page.getByPlaceholder('例如: Jack')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(username)

    // 3. 点击 "立即创建" 按钮
    await this.page.getByRole('button', { name: '立即创建' }).click()

    // 4. 等待跳转完成
    await expect(this.page).toHaveURL(/\/room\/\w+/)

    // 返回房间 ID
    const url = this.page.url()
    const roomId = url.split('/').pop()
    return { roomId, url }
  }

  /**
   * 加入房间
   */
  async joinRoom(url: string, username: string, skipValidation = false) {
    await this.page.goto(url)

    // 处理 JoinModal (如果 Guest 之前没存过昵称)
    // 根据 JoinModal.tsx 的代码:
    // Input placeholder: "例如: Jack"
    // Button text: "进入聚会"

    const nameInput = this.page.getByPlaceholder('例如: Jack')

    // 如果出现了输入框，就填它
    // 等待一小会儿，因为 React 渲染可能需要几毫秒
    try {
      await nameInput.waitFor({ state: 'visible', timeout: 3000 })
      await nameInput.fill(username)
      await this.page.getByRole('button', { name: '进入聚会' }).click()
    } catch (e) {
      console.log(
        'JoinModal did not appear or timed out, assuming guest is already joined.',
      )
    }

    // 确认已进入房间 (验证侧边栏看到房主用户 - 支持中英文用户名)
    // Mobile 端由于布局不同，可能看不到 Sidebar，所以允许跳过验证
    if (!skipValidation) {
      await expect(this.page.getByText(/房主用户|HostUser/)).toBeVisible({
        timeout: 10000,
      })
    }
  }

  /**
   * [Host] 分享视频
   */
  async shareVideo() {
    // 1. 点击 "分享当前视频给成员" 按钮
    // 根据错误截图，按钮文字是 "分享当前视频给成员"
    const shareBtn = this.page.getByRole('button', {
      name: /分享当前视频给成员/i,
    })
    await expect(shareBtn).toBeVisible()
    await shareBtn.click()

    // 2. 在弹出的确认对话框中点击 "确认分享"
    // 根据错误截图，确认对话框中有 "确认分享" 按钮
    const confirmBtn = this.page.getByRole('button', { name: '确认分享' })
    await expect(confirmBtn).toBeVisible({ timeout: 5000 })
    await confirmBtn.click()

    console.log('Host: Share invitation sent.')
  }

  /**
   * [Guest] 接受传输
   */
  async acceptTransfer() {
    // 1. 等待状态从 "准备中..." 变为可操作状态
    // 根据错误截图，Guest 会显示状态指示器和 "正在等待对方接受..."
    // 我们需要等待直到出现接收按钮或状态变化

    // 首先等待 "正在等待对方接受..." 文本消失，表示状态已更新
    await this.page
      .getByText('正在等待对方接受...')
      .waitFor({ state: 'hidden', timeout: 15000 })

    // 2. 现在查找 "接收" 按钮
    // 按钮通常叫 "接收" 或 "接受"
    const acceptBtn = this.page.getByRole('button', {
      name: /接收|接受|Accept/i,
    })
    await expect(acceptBtn).toBeVisible({ timeout: 10000 })
    await acceptBtn.click()

    // 3. 验证进入传输状态 (可选检查)
    // P2P 连接建立可能需要时间，我们不一味等待进度条
    // 直接等待 blob URL 出现会更可靠
    console.log('Guest: Waiting for P2P connection to establish...')
  }

  /**
   * 注入视频文件 (绕过系统弹窗)
   */
  async injectVideoFile(filePath: string) {
    // 确保隐藏的 input 存在
    // RoomPage/VideoEmptyState.tsx 里应该有一个 hidden input
    const fileInput = this.page.locator('#hidden-file-input')
    // 注意：Playwright 注入文件不需要 input 可见
    await fileInput.setInputFiles(filePath)
  }
}
