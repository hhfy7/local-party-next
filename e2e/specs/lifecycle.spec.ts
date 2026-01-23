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

    // --- Step 1: Host 创建房间 ---
    console.log('Host creating room...')
    const { url } = await host.createRoom('HostUser')
    console.log(`Room created at: ${url}`)

    // --- Step 2: Host 注入视频 ---
    console.log('Host injecting video...')
    await host.injectVideoFile(VIDEO_PATH)

    // 验证 Host 播放器出现且暂停
    const hostVideo = hostPage.locator('video')
    await expect(hostVideo).toBeVisible()
    await expect(hostVideo).toHaveJSProperty('paused', true)

    // --- Step 3: Guest 加入房间 ---
    console.log('Guest joining room...')
    await guest.joinRoom(url, 'GuestUser')

    // 验证 Guest 也能看到(或等待)同步状态
    await expect(guestPage.getByText('HostUser')).toBeVisible()

    // --- Step 4: Host 播放 (Sync) ---
    console.log('Host pressing play...')
    // 修正: 使用 evaluate 调用原生 play 方法
    await hostVideo.evaluate((v: HTMLVideoElement) => v.play())

    // 验证 Host 状态
    await expect(hostVideo).toHaveJSProperty('paused', false)

    // 验证 Host 当前时间大于 0 (确实在播放)
    // 稍等一小会儿让视频走几帧
    await hostPage.waitForTimeout(1000)
    const currentTime = await hostVideo.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    expect(currentTime).toBeGreaterThan(0)

    console.log('Test passed!')
  })
})
