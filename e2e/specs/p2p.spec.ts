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

    // --- 步骤1: 房间准备 ---
    console.log('设置：正在创建房间...')
    const { url } = await host.createRoom('房主用户')
    await host.injectVideoFile(VIDEO_PATH)

    console.log('设置：访客正在加入房间...')
    await guest.joinRoom(url, '访客用户')

    // --- 步骤2: 触发分享 ---
    console.log('操作：房主正在分享视频...')
    await host.shareVideo()

    // --- 步骤3: 访客接受传输 ---
    console.log('操作：访客正在接收传输...')
    await guest.acceptTransfer()

    // [新增] 验证进度条出现，证明握手成功
    // 这一步能帮我们区分是 "无法建立连接" 还是 "传输慢"
    // 验证 UI 上有传输相关文本（进度百分比或传输状态）
    try {
      // 尝试查找包含百分号的文本（如 "50%"）
      await expect(guestPage.getByText(/\d+%/)).toBeVisible({ timeout: 5000 })
      console.log('进度：传输已开始，检测到进度百分比...')
    } catch {
      // 如果找不到百分比，尝试查找传输状态文本
      await expect(
        guestPage.getByText(/传输|transfer|接收|receiving/i),
      ).toBeVisible({ timeout: 5000 })
      console.log('进度：传输已开始，检测到传输状态...')
    }

    // --- 步骤4: 验证传输完成 ---
    console.log('验证：正在等待播放...')

    // 验证访客视频元素 src 变成 blob:
    // 增加超时时间到 60s，以防文件稍大
    const guestVideo = guestPage.locator('video')
    await expect(guestVideo).toHaveAttribute('src', /^blob:/, {
      timeout: 60000,
    })
    console.log('进度：传输已完成，blob URL 已就绪。')

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

    console.log('P2P 文件传输测试通过！')
  })
})
