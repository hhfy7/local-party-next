/**
 * P2P 传输相关时间常量
 */

// 状态清除延迟
export const STATUS_CLEAR_DELAY = 3000 as const // ms

// 传输清理延迟
export const TRANSITION_CLEANUP_DELAY = 4000 as const // ms

// 视频同步相关
export const HEARTBEAT_INTERVAL = 5000 as const // ms，心跳发送间隔
export const PAUSE_DEBOUNCE_DELAY = 200 as const // ms，暂停防抖
export const SEEK_DEBOUNCE_DELAY = 600 as const // ms，跳转防抖
export const REMOTE_ACTION_LOCK_DURATION = 1200 as const // ms，远程操作锁定

// P2P 连接相关
export const ICE_GATHERING_TIMEOUT = 2000 as const // ms
export const P2P_CONNECTION_TIMEOUT = 15000 as const // ms
export const OFFER_EXPIRY_TIME = 30000 as const // ms

// 同步阈值
export const SYNC_THRESHOLD_SECONDS = 2.0 as const // s
export const TIME_SYNC_TOLERANCE = 0.5 as const // s

// 状态检查与解锁延迟
export const STATUS_CHECK_INTERVAL = 1000 as const // ms，状态检查间隔
export const REMOTE_ACTION_UNLOCK_DELAY = 1000 as const // ms，操作解锁延迟
export const SEEK_UNLOCK_DELAY = 500 as const // ms，跳转后解锁延迟
export const TOAST_DURATION = 2000 as const // ms，Toast显示时长
export const VISIBILITY_TRANSITION_DELAY = 300 as const // ms，UI显示过渡延迟
