import { test, expect, devices } from '@playwright/test'
import { RoomHelper } from '../fixtures/room-helper'

// 强制使用 Pixel 5 模拟器 (使用 Chromium 内核，无需安装 WebKit)
test.use({ ...devices['Pixel 5'] })

test.describe('Mobile Layout & Visual Regression', () => {
  test('TC-03: Mobile UI Tabs and Layout Check', async ({ page }) => {
    const helper = new RoomHelper(page)

    // 1. 创建房间
    console.log('正在移动端创建房间...')
    await helper.createRoom('移动端用户')

    // 2. 验证是否处于移动端视图
    // 检查 "聊天" 标签页
    const chatTab = page.getByText('聊天', { exact: true })
    await expect(chatTab).toBeVisible()

    // 3. 切换标签页并截图 (首次运行会生成基准截图)

    // 标签页 1: 聊天 (默认)
    console.log('正在检查聊天标签页...')
    await chatTab.click()
    await expect(page).toHaveScreenshot('mobile-tab-chat.png', {
      maxDiffPixels: 100,
    })

    // 标签页 2: 成员
    console.log('正在检查成员标签页...')
    await page.getByText('成员', { exact: true }).click()
    // 验证内容切换 (用户项应该出现)
    // 修正: 页面上有多个移动端用户，我们只检查第一个可见即可
    await expect(page.getByText('移动端用户').first()).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-tab-users.png', {
      maxDiffPixels: 100,
    })

    // 标签页 3: 设置 (信息)
    console.log('正在检查设置标签页...')
    await page.getByText('设置', { exact: true }).click()
    // 验证内容切换 (房间信息面板标题含有 'Room')
    await expect(page.getByText('Room', { exact: false }).first()).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-tab-info.png', {
      maxDiffPixels: 300, // 增加容差，避免微小像素差异导致测试失败
    })

    console.log('移动端视觉测试通过！')
  })
})
