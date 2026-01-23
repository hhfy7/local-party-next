import { test, expect } from '@playwright/test'
import { RoomHelper } from '../fixtures/room-helper'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const VIDEO_PATH = path.join(__dirname, '../test-assets/small-video.mp4')

test.describe('Video Playback Controls', () => {
  test.beforeEach(async ({ page }) => {
    const helper = new RoomHelper(page)
    await helper.createRoom('TestUser')
    await helper.injectVideoFile(VIDEO_PATH)

    const video = page.locator('video')
    const isPaused = await video.evaluate((v: HTMLVideoElement) => v.paused)
    if (isPaused) {
      const playBtn = page.getByRole('button', { name: /播放|play/i })
      if ((await playBtn.count()) > 0) {
        await playBtn.click()
      } else {
        await video.evaluate((v: HTMLVideoElement) => v.play())
      }
    }

    await expect(video).toHaveJSProperty('paused', false)
    await page.waitForTimeout(2000)
  })

  test('TC-04A: Click seek while playing - no pause flash', async ({
    page,
  }) => {
    const video = page.locator('video')
    const beforePaused = await video.evaluate((v: HTMLVideoElement) => v.paused)
    const beforeTime = await video.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    expect(beforePaused).toBe(false)

    // 方法：先点击视频底部唤出控制栏，再点击进度条
    const videoBox = await video.boundingBox()
    if (videoBox) {
      await video.click({
        position: { x: videoBox.width / 2, y: videoBox.height - 20 },
      })
      await page.waitForTimeout(500)

      const progressBar = page.locator('input[type="range"]')
      if ((await progressBar.count()) > 0) {
        const box = await progressBar.boundingBox()
        if (box)
          await progressBar.click({
            position: { x: box.width / 2, y: box.height / 2 },
          })
      } else {
        await video.click({
          position: { x: videoBox.width / 2, y: videoBox.height - 10 },
        })
      }
    }

    const afterPaused = await video.evaluate((v: HTMLVideoElement) => v.paused)
    const afterTime = await video.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    expect(afterPaused).toBe(false)
    expect(afterTime).toBeGreaterThan(beforeTime + 1)

    await page.waitForTimeout(1000)
    const finalPaused = await video.evaluate((v: HTMLVideoElement) => v.paused)
    expect(finalPaused).toBe(false)

    console.log('✅ 点击跳转测试通过 - 未检测到暂停闪烁')
  })

  test('TC-04B: Keyboard arrow keys seek while playing - REAL verification', async ({
    page,
  }) => {
    const video = page.locator('video')
    await expect(video).toHaveJSProperty('paused', false)

    // === 真实验证：确保方向键触发实际跳转 ===

    // 1. 记录稳定基准时间
    const beforeTime = await video.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    console.log(`[测试] 基准时间: ${beforeTime.toFixed(2)}秒`)

    // 2. 按右箭头（预期跳转 +5 秒）
    console.log('[测试] 按下右箭头...')
    await page.keyboard.press('ArrowRight')

    // 3. 等待跳转完成
    await page.waitForTimeout(800) // 给足跳转时间

    // 4. 验证实际跳转（必须 ≥ +4 秒）
    const afterTime = await video.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    const actualSeek = afterTime - beforeTime
    console.log(`[测试] 实际跳转: ${actualSeek.toFixed(2)}秒`)

    // 严格验证：必须明显大于自然播放（1 秒容错）
    expect(actualSeek).toBeGreaterThanOrEqual(4) // 至少 4 秒跳转
    expect(actualSeek).toBeLessThanOrEqual(8) // 不超过 8 秒

    // 5. 验证聊天反馈（关键：应该有系统消息）
    const seekMessages = await page
      .getByText(/跳转|seek|[0-9][0-9]:[0-9][0-9]/i)
      .allTextContents()
    const hasSeekFeedback = seekMessages.some(
      msg =>
        msg.includes('跳转') ||
        msg.includes('seek') ||
        !!msg.match(/[0-9][0-9]:[0-9][0-9]/),
    )

    console.log(`[测试] 跳转反馈消息: ${seekMessages.join(' | ')}`)
    expect(hasSeekFeedback).toBe(true) // 必须有跳转反馈

    // 6. 验证播放状态连续
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false)

    // 7. 测试左箭头（后退）
    const beforeLeft = await video.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    console.log('[测试] 按下左箭头...')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(800)

    const afterLeft = await video.evaluate(
      (v: HTMLVideoElement) => v.currentTime,
    )
    const actualBackSeek = beforeLeft - afterLeft
    console.log(`[测试] 后退跳转: ${actualBackSeek.toFixed(2)}秒`)

    expect(actualBackSeek).toBeGreaterThanOrEqual(4) // 至少后退 4 秒
    expect(actualBackSeek).toBeLessThanOrEqual(8) // 不超过 8 秒

    console.log(
      `✅ 键盘跳转测试通过 - 前进: ${actualSeek.toFixed(1)}秒, 后退: ${actualBackSeek.toFixed(1)}秒`,
    )
    console.log(`✅ 跳转反馈: ${seekMessages.join(' | ')}`)
  })
})
