import { useState, useCallback, useRef } from 'react'
import { FileSender } from '@/utils/p2p/FileSender'
import { Socket } from 'socket.io-client'
import { RTC_CONFIG, DATA_CHANNEL_CONFIG } from '@/utils/p2pConstants'
import {
  ICE_GATHERING_TIMEOUT,
  P2P_CONNECTION_TIMEOUT,
  TRANSITION_CLEANUP_DELAY,
} from '@/utils/timingConstants'
import type {
  User,
  RTCSessionDescriptionInit,
  FileTransferMetadata,
  RTCIceCandidateInit,
  FileTransferProgress,
} from '@local-party/shared/src/types'
import toast from 'react-hot-toast'

// ============= 类型定义 =============
/**
 * 负责发送端所有逻辑（创建连接、发起传输、发送文件、处理 Answer）
 */
interface UseP2PSenderProps {
  socket: Socket | null
  currentUser: User | null
}

interface SenderState {
  transferId: string | null
  isConnected: boolean
  progress: FileTransferProgress | null
  isTransferComplete: boolean
}

// ============= 子 Hook: 超时管理 =============

function useConnectionTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((onTimeout: () => void) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(onTimeout, P2P_CONNECTION_TIMEOUT)
  }, [])

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return { start, clear, timeoutRef }
}

// ============= 主 Hook =============

export const useP2PSender = ({ socket, currentUser }: UseP2PSenderProps) => {
  // 状态
  const [state, setState] = useState<SenderState>({
    transferId: null,
    isConnected: false,
    progress: null,
    isTransferComplete: false,
  })

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const senderRef = useRef<FileSender | null>(null)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const timeout = useConnectionTimeout()

  // ============= Cleanup (放在前面，因为其他函数依赖它) =============

  const cleanup = useCallback(
    (targetTransferId?: string) => {
      if (
        targetTransferId &&
        state.transferId &&
        targetTransferId !== state.transferId
      ) {
        return
      }

      console.log(`[P2P Sender] Cleanup ${state.transferId || ''}`)

      timeout.clear()

      if (senderRef.current) {
        senderRef.current.abort()
        senderRef.current = null
      }

      if (dataChannelRef.current) {
        dataChannelRef.current.close()
        dataChannelRef.current = null
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }

      pendingCandidates.current = []

      setState({
        transferId: null,
        isConnected: false,
        progress: null,
        isTransferComplete: false,
      })
    },
    [state.transferId, timeout],
  )

  // 组件卸载时清理
  useState(() => {
    return () => {
      if (timeout.timeoutRef.current) {
        clearTimeout(timeout.timeoutRef.current)
      }
    }
  })

  // ============= 内部工具函数 =============

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG)
    peerConnectionRef.current = pc

    pc.onicecandidate = event => {
      if (event.candidate && socket && state.transferId) {
        const candidate = event.candidate.toJSON()
        const safeCandidate: RTCIceCandidateInit = {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid ?? undefined,
          sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
        }
        socket.emit('send_ice_candidate', safeCandidate, state.transferId)
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('[P2P Sender] Connection State:', pc.connectionState)
      if (pc.connectionState === 'failed') {
        timeout.clear()
        toast.error('P2P连接失败')
        cleanup()
      }
    }

    return pc
  }, [socket, state.transferId, timeout, cleanup])

  const createDataChannel = useCallback(
    (pc: RTCPeerConnection) => {
      console.log('[P2P Sender] createDataChannel')
      dataChannelRef.current = pc.createDataChannel(
        'fileTransfer',
        DATA_CHANNEL_CONFIG,
      )

      console.log(
        '[P2P Sender] DataChannel created, readyState:',
        dataChannelRef.current.readyState,
      )

      dataChannelRef.current.onopen = () => {
        console.log('[P2P Sender] DataChannel onopen fired!')
        timeout.clear()
        setState(prev => ({ ...prev, isConnected: true }))
      }

      dataChannelRef.current.onclose = () => {
        console.log('[P2P Sender] DataChannel onclose fired')
        cleanup()
      }

      dataChannelRef.current.onerror = err => {
        console.error('[P2P Sender] DataChannel onerror:', err)
        cleanup()
      }
    },
    [timeout, cleanup],
  )

  const waitForIceGathering = useCallback(async (pc: RTCPeerConnection) => {
    await Promise.race([
      new Promise<void>(resolve => {
        if (pc.iceGatheringState === 'complete') resolve()
        else {
          const check = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', check)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', check)
        }
      }),
      new Promise<void>(resolve => setTimeout(resolve, ICE_GATHERING_TIMEOUT)),
    ])
  }, [])

  const createOffer = useCallback(
    async (pc: RTCPeerConnection) => {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await waitForIceGathering(pc)

      return {
        type: offer.type as 'offer',
        sdp: offer.sdp || '',
      } as RTCSessionDescriptionInit
    },
    [waitForIceGathering],
  )

  const startFileSenderCallback = useCallback(
    (file: File, transferId: string) => {
      const dc = dataChannelRef.current
      if (!dc || dc.readyState !== 'open') {
        toast.error('DataChannel 未就绪')
        return
      }

      senderRef.current = new FileSender(file, dc, transferId, {
        onProgress: progress => {
          const fullProgress: FileTransferProgress = {
            transferId,
            bytesTransferred: 0,
            totalBytes: 0,
            percentage: progress.percentage,
          }
          setState(prev => ({ ...prev, progress: fullProgress }))
          if (socket) {
            socket.emit('transfer_progress_update', {
              transferId,
              percentage: progress.percentage,
            })
          }
        },
        onComplete: () => {
          console.log('[P2P Sender] FileSender complete')
          toast.success('文件发送完成')
          if (socket && transferId) {
            socket.emit('transfer_completed', transferId)
          }
          setState(prev => ({ ...prev, isTransferComplete: true }))
          setTimeout(() => cleanup(transferId), TRANSITION_CLEANUP_DELAY)
        },
        onError: err => {
          console.error('[P2P Sender] FileSender error:', err)
          toast.error('发送出错')
          if (socket && transferId) {
            socket.emit('transfer_failed', transferId, err.message)
          }
          cleanup(transferId)
        },
      })

      senderRef.current.start()
    },
    [socket, cleanup],
  )

  // ============= 公开 API =============

  /**
   * 发起传输
   */
  const initiateTransfer = useCallback(
    async (fileInfo: { name: string; size: number; type: string }) => {
      if (!socket || !currentUser) {
        toast.error('网络连接异常')
        return null
      }

      const transferId = `transfer_${Date.now()}_${currentUser.id}`
      cleanup()

      try {
        console.log('[P2P Sender] Step 1: Create PeerConnection')
        const pc = createPeerConnection()

        console.log('[P2P Sender] Step 2: Create DataChannel')
        createDataChannel(pc)

        console.log('[P2P Sender] Step 3: Create Offer')
        const offerPayload = await createOffer(pc)

        console.log('[P2P Sender] Step 4: Emit offer')
        const fileMeta: Partial<FileTransferMetadata> = {
          fileName: fileInfo.name,
          fileSize: fileInfo.size,
          fileType: fileInfo.type,
        }
        socket.emit('send_transfer_offer', transferId, offerPayload, fileMeta)

        setState(prev => ({
          ...prev,
          transferId,
          isConnected: false,
        }))

        return transferId
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('[P2P Sender] initiateTransfer failed:', error)
        toast.error('发起传输失败')
        cleanup()
        return null
      }
    },
    [
      socket,
      currentUser,
      createPeerConnection,
      createDataChannel,
      createOffer,
      cleanup,
    ],
  )

  /**
   * 处理远程 Answer (发送方模式)
   */
  const handleRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      console.log('[P2P Sender] handleRemoteAnswer start')
      const pc = peerConnectionRef.current
      if (!pc) {
        console.log('[P2P Sender] handleRemoteAnswer: pc is null')
        return
      }

      console.log('[P2P Sender] handleRemoteAnswer: start timeout')
      timeout.start(() => {
        console.log('[P2P Sender] TIMEOUT!')
        toast.error('P2P 连接超时')
        if (socket && state.transferId) {
          socket.emit('transfer_failed', state.transferId, 'Timeout')
        }
        cleanup(state.transferId ?? undefined)
      })

      try {
        console.log('[P2P Sender] handleRemoteAnswer: setRemoteDescription')
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log(
          '[P2P Sender] handleRemoteAnswer: after setRemoteDescription',
        )

        // 处理 pending candidates
        console.log(
          '[P2P Sender] handleRemoteAnswer: process pending candidates:',
          pendingCandidates.current.length,
        )
        for (const candidate of pendingCandidates.current) {
          await pc
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(console.error)
        }
        pendingCandidates.current = []
        console.log('[P2P Sender] handleRemoteAnswer: done')
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('[P2P Sender] Set Remote Answer Failed:', error)
      }
    },
    [socket, state.transferId, timeout, cleanup],
  )

  /**
   * 处理 ICE Candidate (发送方模式)
   */
  const handleIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (!pc.remoteDescription && pc.signalingState !== 'stable') {
      pendingCandidates.current.push(candidate)
    } else {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
    }
  }, [])

  /**
   * 发送文件
   */
  const sendFile = useCallback(
    (file: File) => {
      if (!state.transferId) {
        toast.error('连接未就绪')
        return
      }
      startFileSenderCallback(file, state.transferId)
    },
    [state.transferId, startFileSenderCallback],
  )

  // ============= 返回值 =============

  return {
    // 状态
    transferId: state.transferId,
    isConnected: state.isConnected,
    progress: state.progress,
    isTransferComplete: state.isTransferComplete,
    // API
    initiateTransfer,
    sendFile,
    handleRemoteAnswer,
    handleIceCandidate,
    cleanup,
  }
}
