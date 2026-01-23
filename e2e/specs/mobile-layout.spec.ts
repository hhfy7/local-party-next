import { test, expect, devices } from '@playwright/test'
import { RoomHelper } from '../fixtures/room-helper'

// 强制使用 Pixel 5 模拟器 (使用 Chromium 内核，无需安装 WebKit)
test.use({ ...devices['Pixel 5'] })

test.describe('Mobile Layout & Visual Regression', () => {
  test('TC-03: Mobile UI Tabs and Layout Check', async ({ page }) => {
    const helper = new RoomHelper(page)

    // 1. 创建房间
    console.log('Creating room on Mobile...')
    await helper.createRoom('MobileUser')

    // 2. 验证是否处于移动端视图
    // 检查 "聊天" Tab
    const chatTab = page.getByText('聊天', { exact: true })
    await expect(chatTab).toBeVisible()

    // 3. 切换 Tabs 并截图 (首次运行会生成 snapshots)

    // Tab 1: 聊天 (Default)
    console.log('Checking Chat Tab...')
    await chatTab.click()
    await expect(page).toHaveScreenshot('mobile-tab-chat.png', {
      maxDiffPixels: 100,
    })

    // Tab 2: 成员
    console.log('Checking Users Tab...')
    await page.getByText('成员', { exact: true }).click()
    // 验证内容切换 (UserItem 应该出现)
    // 修正: 页面上有多个 MobileUser，我们只检查第一个可见即可
    await expect(page.getByText('MobileUser').first()).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-tab-users.png', {
      maxDiffPixels: 100,
    })

    // Tab 3: 设置 (Info)
    console.log('Checking Info Tab...')
    await page.getByText('设置', { exact: true }).click()
    // 验证内容切换 (RoomInfoPanel 标题含有 'Room')
    await expect(page.getByText('Room', { exact: false }).first()).toBeVisible()
    await expect(page).toHaveScreenshot('mobile-tab-info.png', {
      maxDiffPixels: 100,
    })

    console.log('Mobile Visual Test Passed!')
  })
})
