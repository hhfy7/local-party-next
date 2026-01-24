import { test, expect } from '@playwright/test'
import { RoomHelper } from '../fixtures/room-helper'
// import path from 'path' // Remove unused

test.describe('Subtitle Sync', () => {
  test('Host should be able to upload subtitle and sync to Guest', async ({
    browser,
  }) => {
    // 1. Host Setup
    const hostContext = await browser.newContext()
    const hostPage = await hostContext.newPage()
    const hostRoom = new RoomHelper(hostPage)

    const { url } = await hostRoom.createRoom('HostUser')

    // 2. Inject Video & Subtitle
    const videoPath = 'e2e/test-assets/small-video.mp4'
    await hostRoom.injectVideoFile(videoPath)

    // 模拟上传字幕操作
    // 因为 input 是 hidden 的，我们需要通过 Label 触发或者直接 setInputFiles
    const srtPath = 'e2e/test-assets/test.srt'

    // 定位上传 input (在 DesktopSidebar 中)
    // 注意：input[type="file"] 是 hidden 的，通常通过 label 点击，但 playwright 可以直接操作 input
    // 我们的 input 接受 .srt, .vtt
    const fileInput = hostPage.locator('input[accept=".srt,.vtt"]')
    await fileInput.setInputFiles(srtPath)

    // 验证 Host 端 Toast
    await expect(hostPage.getByText('字幕已同步给所有成员')).toBeVisible()

    // 验证 Host 端 Video 标签是否挂载了 track
    const hostTrack = hostPage.locator('video track')
    await expect(hostTrack).toHaveAttribute('kind', 'subtitles')
    await expect(hostTrack).toHaveAttribute('src', /^blob:/)
    await expect(hostTrack).toHaveAttribute('label', '中文')

    // 3. Guest Join
    const guestContext = await browser.newContext()
    const guestPage = await guestContext.newPage()
    const guestRoom = new RoomHelper(guestPage)

    await guestRoom.joinRoom(url, 'GuestUser', true)

    // Guest 也必须注入视频才能看到播放器
    await guestRoom.injectVideoFile(videoPath)

    // 验证 Guest 是否自动收到了字幕 (Toast + Track)
    await expect(guestPage.getByText('已加载字幕: test.srt')).toBeVisible()

    const guestTrack = guestPage.locator('video track')
    await expect(guestTrack).toHaveAttribute('kind', 'subtitles')
    await expect(guestTrack).toHaveAttribute('src', /^blob:/)

    // 验证 Guest 端的字幕内容是否正确同步
    await expect(async () => {
      const guestCues = await guestPage.evaluate(() => {
        const video = document.querySelector('video')
        const track = video?.textTracks[0]
        // 必须设置 mode 才能读取 cues
        if (track) track.mode = 'showing'

        if (!track?.cues || track.cues.length === 0) return null

        // 返回第一条字幕的文本
        return {
          text: (track.cues[0] as VTTCue).text,
          startTime: (track.cues[0] as VTTCue).startTime,
          endTime: (track.cues[0] as VTTCue).endTime,
        }
      })

      // 我们的 test.srt 第一条是:
      // 00:00:01,000 --> 00:00:03,000
      // Hello World\n你好，世界

      expect(guestCues).not.toBeNull()
      expect(guestCues?.startTime).toBe(1)
      expect(guestCues?.endTime).toBe(3)
      // WebVTT 解析后换行符可能不同，主要验证包含核心文本
      expect(guestCues?.text).toContain('Hello World')
      expect(guestCues?.text).toContain('你好，世界')
    }).toPass()

    // 4. Verify Subtitle Content (Advanced)
    // 验证字幕内容确实被解析了
    await expect(async () => {
      const cueCount = await hostPage.evaluate(() => {
        const video = document.querySelector('video')
        const track = video?.textTracks[0]
        return track?.cues ? track.cues.length : 0
      })
      expect(cueCount).toBeGreaterThan(0)
    }).toPass()

    // 5. Verify Sync Logic (Optional but requested)
    // 验证跳转后字幕时间轴是否匹配 (逻辑上 video.currentTime 变了，native player 就会显示对应字幕)
    // 这里我们只验证“跳转”动作本身没有报错，且字幕 track 依然存在
    await hostPage.keyboard.press('ArrowRight') // Seek +5s
    await expect(hostTrack).toBeAttached()
  })
})
