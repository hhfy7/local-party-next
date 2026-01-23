import { test, expect } from '@playwright/test'
import { RoomHelper } from '../fixtures/room-helper'
import path from 'path'
import { fileURLToPath } from 'url'

// 获取路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VIDEO_PATH = path.join(__dirname, '../test-assets/small-video.mp4')

test.describe('P2P File Transfer', () => {
  test('TC-02: Host shares file, Guest accepts and plays', async ({
    browser,
  }) => {
    // 1. 设置超时时间，因为 P2P 传输可能较慢
    // 增加到 2 分钟，确保有足够时间完成握手和传输
    test.setTimeout(60000)

    const hostContext = await browser.newContext()
    const guestContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const guestPage = await guestContext.newPage()
    const host = new RoomHelper(hostPage)
    const guest = new RoomHelper(guestPage)

    // --- Step 1: 房间准备 ---
    console.log('Setup: Creating room...')
    const { url } = await host.createRoom('HostUser')
    await host.injectVideoFile(VIDEO_PATH)

    console.log('Setup: Guest joining...')
    await guest.joinRoom(url, 'GuestUser')

    // --- Step 2: 触发分享 ---
    console.log('Action: Host sharing video...')
    await host.shareVideo()

    // --- Step 3: Guest 接受 ---
    console.log('Action: Guest accepting transfer...')
    await guest.acceptTransfer()

    // [新增] 验证进度条出现，证明握手成功
    // 这一步能帮我们区分是 "无法建立连接" 还是 "传输慢"
    // 验证 UI 上有 "%"
    await expect(guestPage.getByText('%')).toBeVisible({ timeout: 10000 })
    console.log('Progress: Transfer started...')

    // --- Step 4: 验证传输完成 ---
    console.log('Verification: Waiting for playback...')

    // 验证 Guest 视频元素 src 变成 blob:
    // 增加超时时间到 60s，以防文件稍大
    const guestVideo = guestPage.locator('video')
    await expect(guestVideo).toHaveAttribute('src', /^blob:/, {
      timeout: 60000,
    })
    console.log('Progress: Transfer finished, blob URL ready.')

    // 验证 Guest 自动开始播放 (Host 默认可能是暂停的，但传输完通常会同步状态)
    // 如果 Host 是暂停的，Guest 也会暂停。
    // 我们让 Host 播放一下，确保 Guest 能跟上
    await hostPage.locator('video').evaluate((v: HTMLVideoElement) => v.play())

    await expect(guestVideo).toHaveJSProperty('paused', false)

    // 稍微等待播放几帧
    await guestPage.waitForTimeout(2000)
    const currentTime = await guestVideo.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    expect(currentTime).toBeGreaterThan(0)

    console.log('P2P Test Passed!')
  })
})
