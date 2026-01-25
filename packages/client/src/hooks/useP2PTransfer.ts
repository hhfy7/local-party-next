import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useP2PSignaling } from './p2p/useP2PSignaling'
import { useP2PSender } from './p2p/useP2PSender'
import { useP2PReceiver } from './p2p/useP2PReceiver'

/**
 * P2P 文件传输 Hook - 主入口
 *
 * 架构说明:
 * - useP2PTransfer: 状态协调 + API 组合 (本文件，约 150 行)
 * - useP2PSender: 发送端完整逻辑 (p2p/useP2PSender.ts)
 * - useP2PReceiver: 接收端完整逻辑 (p2p/useP2PReceiver.ts)
 * - useP2PSignaling: Socket 信令处理 (p2p/useP2PSignaling.ts)
 */

// ============= 主 Hook =============

export const useP2PTransfer = () => {
  const { socket, currentUser } = useAppStore()

  // 子 Hooks
  const sender = useP2PSender({ socket, currentUser })
  const receiver = useP2PReceiver({ socket })

  // 信令处理
  const signaling = useP2PSignaling({
    socket,
    onTransferRequest: data => {
      console.log('[P2P] 收到传输请求 from userId:', data.fromUser.id)
    },
    onTransferAccepted: (transferId, answer) => {
      console.log('[P2P] 对方接受了传输:', transferId)
      sender.handleRemoteAnswer(answer)
    },
    onTransferRejected: transferId => {
      console.log('[P2P] 对方拒绝了传输:', transferId)
      sender.cleanup(transferId)
    },
    onTransferCancelled: transferId => {
      console.log('[P2P] 对方取消了传输:', transferId)
      sender.cleanup(transferId)
      receiver.cleanup(transferId)
    },
    onTransferCompleted: transferId => {
      console.log('[P2P] 对方完成了传输:', transferId)
    },
    onTransferFailed: (transferId, reason) => {
      console.log('[P2P] 对方传输失败:', transferId, reason)
      sender.cleanup(transferId)
      receiver.cleanup(transferId)
    },
    onTransferProgress: progress => {
      console.log('[P2P] 收到进度更新:', progress.percentage)
    },
    onIceCandidate: candidate => {
      sender.handleIceCandidate(candidate)
      receiver.handleIceCandidate(candidate)
    },
  })

  // 派生状态：组合 sender 和 receiver 的状态
  const state = useMemo(() => {
    // 确定当前角色和 transferId
    const transferId = sender.transferId ?? receiver.transferId ?? null
    const isConnected = sender.isConnected || receiver.isConnected
    const isReceiving = receiver.isReceiving
    const progress = sender.progress ?? receiver.progress ?? null
    const isTransferComplete =
      sender.isTransferComplete || receiver.isTransferComplete

    return {
      transferId,
      isConnected,
      isReceiving,
      progress,
      isTransferComplete,
      error: null as string | null,
    }
  }, [
    sender.transferId,
    sender.isConnected,
    sender.progress,
    sender.isTransferComplete,
    receiver.transferId,
    receiver.isConnected,
    receiver.isReceiving,
    receiver.progress,
    receiver.isTransferComplete,
  ])

  // 防止传输过程中关闭标签页
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.transferId && (state.isReceiving || state.progress)) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.transferId, state.isReceiving, state.progress])

  // 设置信令监听器
  useEffect(() => {
    const cleanup = signaling.setupListeners()
    return cleanup
  }, [signaling])

  // ============= API 导出 =============

  return {
    // 状态
    ...state,

    // 发送端 API
    initiateTransfer: sender.initiateTransfer,
    sendFile: sender.sendFile,
    handleRemoteAnswer: sender.handleRemoteAnswer,
    handleIceCandidate: sender.handleIceCandidate,

    // 接收端 API
    acceptTransfer: receiver.acceptTransfer,
    getReceivedFile: receiver.getReceivedFile,
    onTransferComplete: receiver.onTransferComplete,

    // 共享 API
    rejectTransfer: (id: string) => {
      signaling.emitTransferRejected(id)
    },
    cancelTransfer: () => {
      if (state.transferId) {
        signaling.emitTransferCancelled(state.transferId)
      }
      sender.cleanup()
      receiver.cleanup()
    },
    cleanup: (transferId?: string) => {
      sender.cleanup(transferId)
      receiver.cleanup(transferId)
    },
  }
}
