/**
 * P2P 网络配置常量
 */


// WebRTC 配置
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.miwifi.com:3478' }, // 小米 (国内)
    { urls: 'stun:stun.qq.com:3478' }, // 腾讯 (国内)
    { urls: 'stun:stun1.l.google.com:19302' }, // Google
    { urls: 'stun:stun2.l.google.com:19302' },
    // 如果有 TURN 服务器，添加以下配置
    // { urls: TURN_SERVER_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL }
  ],
}

// 数据通道配置
export const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
  ordered: true,
  maxRetransmits: 0, // 不重传，保证实时性
}
