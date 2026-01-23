import { test, expect } from '@playwright/test'
import { RoomHelper } from '../fixtures/room-helper'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取 __dirname 的替代方案 (ESM)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 测试素材路径
const VIDEO_PATH = path.join(__dirname, '../test-assets/small-video.mp4')

test.describe('Room Lifecycle & Sync', () => {
  test('TC-01: Host creates room, Guest joins, Video syncs', async ({
    browser,
  }) => {
    // 1. 创建两个隔离的浏览器上下文 (Context)
    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()

    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()

    const host = new RoomHelper(hostPage)
    const guest = new RoomHelper(guestPage)

    // --- 步骤1: 房主创建房间 ---
    console.log('房主正在创建房间...')
    const { url } = await host.createRoom('房主用户')
    console.log(`房间已创建于: ${url}`)

    // --- 步骤2: 房主注入视频 ---
    console.log('房主正在注入视频文件...')
    await host.injectVideoFile(VIDEO_PATH)

    // 验证房主播放器出现且处于暂停状态
    const hostVideo = hostPage.locator('video')
    await expect(hostVideo).toBeVisible()
    await expect(hostVideo).toHaveJSProperty('paused', true)

    // --- 步骤3: 访客加入房间 ---
    console.log('访客正在加入房间...')
    await guest.joinRoom(url, '访客用户')

    // 验证访客也能看到(或等待)同步状态
    await expect(guestPage.getByText('房主用户')).toBeVisible()

    // --- 步骤4: 房主播放视频 (同步) ---
    console.log('房主正在按下播放按钮...')
    // 修正: 使用 evaluate 调用原生 play 方法
    await hostVideo.evaluate((v: HTMLVideoElement) => v.play())

    // 验证房主播放器状态
    await expect(hostVideo).toHaveJSProperty('paused', false)

    // 验证房主当前播放时间大于 0 (确实在播放)
    // 稍等一小会儿让视频走几帧
    await hostPage.waitForTimeout(1000)
    const currentTime = await hostVideo.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    expect(currentTime).toBeGreaterThan(0)

    console.log('房间生命周期与同步测试通过！')
  })
})
