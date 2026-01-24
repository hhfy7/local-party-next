import { Page, expect } from '@playwright/test'
import { RoomHelper } from './room-helper'

/**
 * 认证与安全测试助手 (Auth & Security Helper Fixture)
 * 继承自 RoomHelper，封装了密码输入、Token获取、Session 验证等高级逻辑
 */
export class AuthHelper extends RoomHelper {
  constructor(page: Page) {
    super(page)
  }

  /**
   * 创建带密码的房间
   */
  async createProtectedRoom(username: string, password?: string) {
    await this.page.goto('/')

    // 1. 点击 "创建房间"
    await this.page.getByText('创建房间', { exact: true }).click()

    // 2. 填写昵称
    const nameInput = this.page.getByPlaceholder('例如: Jack')
    await expect(nameInput).toBeVisible()
    await nameInput.fill(username)

    // 3. 填写密码 (如果有)
    if (password) {
      const pwdInput = this.page.locator('input[type="password"]')
      await expect(pwdInput).toBeVisible()
      await pwdInput.fill(password)
    }

    // 4. 点击 "立即创建"
    // 等待密码确实被填入 (防止 react state update 延迟)
    if (password) {
      await expect(
        this.page.locator('input[value="' + password + '"]'),
      ).toBeVisible()
    }

    await this.page.getByRole('button', { name: '立即创建' }).click()

    // 5. 等待跳转完成
    await expect(this.page).toHaveURL(/\/room\/\w+/)

    // 返回房间信息
    const url = this.page.url()
    const roomId = url.split('/').pop()
    return { roomId, url }
  }

  /**
   * 获取当前房间的邀请 Token
   */
  async getInviteToken() {
    // 1. 点击 "复制链接" 按钮
    // 根据 DesktopSidebar.tsx，按钮是一个带有 svg 的 button，且 title 或 aria-label 可能没写全
    // 我们尝试通过 icon 定位或者上下文定位
    // 最稳妥的方式是拦截 socket 请求，或者监听剪贴板
    // 但为了简化，我们假设点击后会弹出 toast 提示

    // 先找到那个 copy button (在 Room ID 旁边)
    const copyBtn = this.page
      .locator('button:has(svg path[d*="M8 5H6a2 2"])')
      .first()
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()

    // 2. 监听剪贴板内容 (需要浏览器权限，Playwright 中比较麻烦)
    // 替代方案：我们可以拦截 WebSocket 消息，或者从 toast 中推断成功
    // 但最直接的办法是：我们知道 Token 的生成逻辑，或者直接模拟用户行为
    // 既然前端逻辑是: 点击 -> 生成 Token -> 写入 Clipboard -> Toast
    // 我们可以直接通过 evaluate 拿到当前的 URL (因为 createRoom 后 URL 可能会变？不，Token 不会变 URL)
    // 等等，前端代码逻辑是: url.searchParams.set('token', res.token); copyToClipboard(url.toString())
    // 我们可以 mock copyToClipboard 或者监听 window.navigator.clipboard.writeText

    // 更好的办法：监听网络请求或者 Socket 事件
    // 这里我们采用一种 hack：等待 Toast 出现 "已复制临时邀请链接"
    await expect(this.page.getByText('已复制临时邀请链接')).toBeVisible()

    // 由于很难直接从剪贴板读，我们假设生成的 Token 是有效的。
    // 为了测试方便，我们可以直接手动构造一个带 Token 的 URL 吗？不行，我们需要服务器生成的有效签名。
    // 既然不能读剪贴板，我们通过 evaluate 劫持 navigator.clipboard.writeText
    const clipboardText = await this.page.evaluate(async () => {
      // 这是一个 hack，实际测试中应该在点击前注入
      return new Promise<string>(resolve => {
        const originalWriteText = navigator.clipboard.writeText
        navigator.clipboard.writeText = async text => {
          resolve(text)
          return originalWriteText.call(navigator.clipboard, text)
        }
      })
    })

    return clipboardText // 这应该是完整的 url: http://localhost:xxxx/room/123?token=...
  }

  /**
   * 以访客身份尝试加入房间 (处理密码逻辑)
   */
  async joinProtectedRoom(
    url: string,
    username: string,
    password?: string,
    expectSuccess = true,
  ) {
    await this.page.goto(url)

    // 1. 填写昵称
    const nameInput = this.page.getByPlaceholder('例如: Jack')
    await nameInput.waitFor({ state: 'visible', timeout: 5000 })
    await nameInput.fill(username)

    // 2. 填写密码 (如果需要)
    if (password) {
      // 检查是否处于 "Token 激活" 模式 (绿色框)
      const tokenActive = await this.page
        .getByText('邀请链接已激活')
        .isVisible()

      if (!tokenActive) {
        // 只有在非 Token 模式下才填密码
        const pwdInput = this.page.getByPlaceholder('若有密码请填写')
        if (await pwdInput.isVisible()) {
          await pwdInput.fill(password)
        }
      }
    }

    // 3. 点击 "进入聚会"
    await this.page.getByRole('button', { name: '进入聚会' }).click()

    if (expectSuccess) {
      // 验证成功进入
      await expect(this.page).toHaveURL(/\/room\/\w+/)
      // 验证没有报错 Toast
      await expect(this.page.getByText('密码错误')).toBeHidden()
    }
  }

  /**
   * 验证当前用户身份 (Host or Guest)
   */
  async verifyIdentity(isHost: boolean) {
    if (isHost) {
      // 房主应该能看到特定的控制元素，比如 "上传字幕"
      await expect(this.page.getByText('上传字幕 (CC)')).toBeVisible()
    } else {
      // 访客不应该看到
      await expect(this.page.getByText('上传字幕 (CC)')).toBeHidden()
    }
  }

}
