import { test, expect } from '@playwright/test'
import { AuthHelper } from '../fixtures/auth-helper'

test.describe('Authentication & Security', () => {
  // 每个测试都使用全新的 Context，确保 Session 隔离

  test('TC-01: 强制 4 位数字密码', async ({ page }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const auth = new AuthHelper(page)
    await page.goto('/')
    await page.getByText('创建房间').click()

    const pwdInput = page.locator('input[type="password"]')

    // 1. 输入非数字
    await pwdInput.fill('abcd')
    await expect(pwdInput).toHaveValue('')

    // 2. 输入超过4位
    await pwdInput.fill('12345')
    await expect(pwdInput).toHaveValue('1234')

    // 3. 输入有效密码
    await pwdInput.fill('8888')
    await expect(pwdInput).toHaveValue('8888')
  })

  test('TC-02: 密码可见性切换', async ({ page }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // const auth = new AuthHelper(page)
    await page.goto('/')
    await page.getByText('创建房间').click()

    // 修正选择器：使用 label 关联或者直接找 password input
    const pwdInput = page.locator('input[type="password"]')
    await expect(pwdInput).toBeVisible()

    // 找到输入框容器内的按钮 (Toggle)
    // 结构：div.relative > input + button
    const toggleBtn = page
      .locator('.relative button')
      .filter({ has: page.locator('svg') })
      .last()

    await pwdInput.fill('1234')

    // 初始状态: password
    await expect(pwdInput).toHaveAttribute('type', 'password')

    // 点击切换
    await toggleBtn.click()

    // 变成 text
    // 注意：React 可能会重新渲染 Input，导致引用丢失，所以重新定位
    await expect(page.locator('input[value="1234"]')).toHaveAttribute(
      'type',
      'text',
    )

    // 再次点击
    await toggleBtn.click()
    await expect(page.locator('input[value="1234"]')).toHaveAttribute(
      'type',
      'password',
    )
  })

  test('TC-03: 有密码房间的加入流程', async ({ browser }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()

    const host = new AuthHelper(await hostContext.newPage())
    const guest = new AuthHelper(await guestContext.newPage())

    // 1. 房主创建房间 (密码 8888)
    const { url } = await host.createProtectedRoom('Host', '8888')

    // 2. 访客加入 (密码错误)
    await guest.page.goto(url)
    const guestInput = guest.page.getByPlaceholder('例如: Jack')
    await guestInput.fill('Guest')

    const pwdInput = guest.page.getByPlaceholder('若有密码请填写')
    await expect(pwdInput).toBeVisible()

    await pwdInput.fill('0000') // 错误密码
    await guest.page.getByRole('button', { name: '进入聚会' }).click()

    // 验证报错
    await expect(guest.page.getByText('密码错误')).toBeVisible()

    // 确保还在当前页面 (通过检查 URL 是否还在 Landing 也就是 /room/id 但没有进入房间状态?)
    // 实际上加入失败 URL 也是 /room/id，区别是 UI 状态
    // 我们检查 JoinModal 是否还存在
    await expect(
      guest.page.getByRole('button', { name: '进入聚会' }),
    ).toBeVisible()

    // 3. 访客加入 (密码正确)
    await pwdInput.fill('8888')
    await guest.page.getByRole('button', { name: '进入聚会' }).click()

    // 验证成功
    await expect(guest.page).toHaveURL(/\/room\/\w+/)
    // 使用更精确的选择器
    await expect(guest.page.getByText('Host').first()).toBeVisible()
  })

  test('TC-04: Token 免密加入', async ({ browser }) => {
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()

    const host = new AuthHelper(await hostContext.newPage())
    const guest = new AuthHelper(await guestContext.newPage())

    // 1. 房主创建房间 (密码 8888)
    await host.createProtectedRoom('Host', '8888')

    // 2. 注入 clipboard mock 并获取 Token 链接
    await host.page.evaluate(() => {
      // @ts-expect-error adding custom property to window
      window._clipboardData = ''
      navigator.clipboard.writeText = async text => {
        // @ts-expect-error adding custom property to window
        window._clipboardData = text
      }
    })

    // 点击复制链接
    await host.page
      .locator('button:has(svg path[d*="M8 5H6a2 2"])')
      .first()
      .click()
    await expect(host.page.getByText('已复制临时邀请链接')).toBeVisible()

    // 获取链接
    const tokenUrl = await host.page.evaluate(
      // @ts-expect-error accessing custom property on window
      () => window._clipboardData as string,
    )
    expect(tokenUrl).toContain('?token=')

    // 3. 访客使用 Token 链接加入
    await guest.page.goto(tokenUrl)

    // 验证 UI 显示 "邀请链接已激活"
    await expect(guest.page.getByText('邀请链接已激活')).toBeVisible()
    await expect(guest.page.locator('input[type="password"]')).toBeHidden()

    // 输入昵称直接加入
    await guest.page.getByPlaceholder('例如: Jack').fill('GuestToken')
    await guest.page.getByRole('button', { name: '进入聚会' }).click()

    // 验证成功
    await expect(guest.page).toHaveURL(/\/room\/\w+/)
    await expect(guest.page.getByText('Host').first()).toBeVisible()
  })

  test('TC-06: 房主无感重连 (Session Persistence)', async ({ page }) => {
    const host = new AuthHelper(page)

    // 1. 创建有密码房间
    const { roomId } = await host.createProtectedRoom('HostMaster', '9999')

    // 2. 刷新页面
    await page.reload()

    // 3. 验证自动重连/免密
    // 这里的行为取决于实现：是直接进房间？还是停在 Landing 但可以免密进？
    // 根据 useRoomLogic，如果 roomId 匹配 lastRoom，且有 cachedName，会尝试自动加入
    // 我们的 Session ID 机制应该让它直接通过

    // 预期：不需要输密码
    // 如果有 JoinModal，它应该自动填好或者跳过
    // 实际上目前的逻辑是：LandingPage -> autoJoin -> join_room(with clientId) -> Success

    // 等待进入房间
    await expect(page).toHaveURL(new RegExp(`/room/${roomId}`))

    // 在验证身份前，先注入一个文件，以确保 VideoStage 渲染，从而触发 Sidebar 上的某些状态？
    // 不，上传字幕按钮是在 Sidebar 里的，只要 Sidebar 渲染了就行。
    // 但是 DesktopSidebar 有 hidden 属性 (md:flex)。
    // Playwright 默认视口是 1280x720，应该是 md。

    // 问题可能是：房间刚加载时，currentUser 可能还没同步过来？
    // 或者需要等 socket 连接完全建立。
    await page.waitForTimeout(1000)

    // 验证依然是房主 (有上传字幕按钮)
    // 上传字幕按钮只有在有 videoUrl 时才显示！
    // 我们的 createProtectedRoom 没有注入视频。
    // 所以我们需要先注入视频，或者用其他方式验证房主。
    // 比如：看名字旁边有没有 HOST 标签。
    await host.injectVideoFile('e2e/test-assets/small-video.mp4')
    await host.verifyIdentity(true)
  })

  test('TC-08: 自动顶号机制 (Session Replacement)', async ({ browser }) => {
    // 使用同一个 Context 模拟同一个浏览器
    const context = await browser.newContext()

    const page1 = await context.newPage()
    const host1 = new AuthHelper(page1)

    // 1. Tab 1 创建房间
    const { url } = await host1.createProtectedRoom('MultiTabUser')

    // 2. Tab 2 打开同一链接
    const page2 = await context.newPage()
    const host2 = new AuthHelper(page2)

    await host2.page.goto(url)

    // Tab 2 应该自动加入 (因为是同一个 Context -> 同一个 localStorage -> 同一个 ClientID)
    // 且因为是房主(User 1)回自己的房间，应该直接恢复身份
    await expect(host2.page).toHaveURL(url)
    await expect(host2.page.getByText('MultiTabUser').first()).toBeVisible()

    // 3. 验证 Tab 1 被顶号
    // 页面应该显示断开连接，或者被踢出的提示
    // 根据 authHandler.ts: oldSocket.emit('kicked', ...)
    // 前端收到 kicked 会跳转回首页 (/)
    await expect(host1.page).toHaveURL(/\/$/)
    // 并且会有 Toast 提示 (Playwright 捕获 Toast 有点难，但 URL 变化足够证明被踢了)
  })
})
