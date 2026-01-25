import { useState, useCallback, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { FileReceiver } from '@/utils/p2p/FileReceiver'
import { RTC_CONFIG } from '@/utils/p2pConstants'
import { ICE_GATHERING_TIMEOUT } from '@/utils/timingConstants'
import type {
  User,
  FileTransferMetadata,
  RTCSessionDescriptionInit,
  FileTransferProgress,
} from '@local-party/shared/src/types'
import toast from 'react-hot-toast'

// ============= 类型定义 =============
/**
 * 负责接收端所有逻辑（创建连接、接受传输、接收文件）
 */
interface UseP2PReceiverProps {
  socket: Socket | null
}

interface ReceiverState {
  transferId: string | null
  isConnected: boolean
  isReceiving: boolean
  progress: FileTransferProgress | null
  isTransferComplete: boolean
}

// ============= 主 Hook =============

export const useP2PReceiver = ({ socket }: UseP2PReceiverProps) => {
  // 状态
  const [state, setState] = useState<ReceiverState>({
    transferId: null,
    isConnected: false,
    isReceiving: false,
    progress: null,
    isTransferComplete: false,
  })

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const receiverRef = useRef<FileReceiver | null>(null)
  const receivedFileRef = useRef<File | null>(null)
  const onTransferCompleteRef = useRef<(() => void) | null>(null)

  // ============= Cleanup (放在前面) =============

  const cleanup = useCallback(
    (targetTransferId?: string) => {
      if (
        targetTransferId &&
        state.transferId &&
        targetTransferId !== state.transferId
      ) {
        return
      }

      console.log(`[P2P Receiver] Cleanup ${state.transferId || ''}`)

      if (receiverRef.current) {
        receiverRef.current = null
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }

      setState({
        transferId: null,
        isConnected: false,
        isReceiving: false,
        progress: null,
        isTransferComplete: false,
      })
    },
    [state.transferId],
  )

  // ============= 内部工具函数 =============

  const createPeerConnection = useCallback(
    (transferId: string) => {
      console.log(
        '[P2P Receiver] createPeerConnection, transferId:',
        transferId,
      )
      const pc = new RTCPeerConnection(RTC_CONFIG)
      peerConnectionRef.current = pc

      // ICE Candidate 处理 - 直接通过 socket 发送
      pc.onicecandidate = event => {
        if (event.candidate && socket) {
          const candidate = event.candidate.toJSON()
          const safeCandidate = {
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid ?? undefined,
            sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
          }
          console.log(
            '[P2P Receiver] onIceCandidate, emit, transferId:',
            transferId,
          )
          socket.emit('send_ice_candidate', safeCandidate, transferId)
        }
      }

      pc.onconnectionstatechange = () => {
        console.log('[P2P Receiver] connectionStateChange:', pc.connectionState)
        if (pc.connectionState === 'failed') {
          toast.error('P2P连接失败')
          cleanup(transferId)
        }
      }

      // DataChannel 接收
      pc.ondatachannel = event => {
        console.log('[P2P Receiver] ondatachannel received')
        const dc = event.channel

        dc.onopen = () => {
          console.log('[P2P Receiver] DataChannel onopen')
          setState(prev => ({
            ...prev,
            isConnected: true,
            isReceiving: true,
            transferId,
          }))
          toast.success('P2P连接已建立')
        }

        dc.onmessage = e => {
          if (receiverRef.current) {
            receiverRef.current.handleData(e.data)
          }
        }

        dc.onclose = () => {
          console.log('[P2P Receiver] DataChannel onclose')
          cleanup(transferId)
        }

        dc.onerror = () => {
          console.log('[P2P Receiver] DataChannel onerror')
          cleanup(transferId)
        }
      }

      // Initialize FileReceiver
      receiverRef.current = new FileReceiver(transferId, {
        onProgress: progress => {
          const fullProgress: FileTransferProgress = {
            transferId,
            bytesTransferred: 0,
            totalBytes: 0,
            percentage: progress.percentage,
          }
          setState(prev => ({ ...prev, progress: fullProgress }))
        },
        onComplete: file => {
          console.log('[P2P Receiver] FileReceiver onComplete')
          receivedFileRef.current = file
          setState(prev => ({ ...prev, isTransferComplete: true }))
          if (onTransferCompleteRef.current) {
            onTransferCompleteRef.current()
          }
          if (socket && transferId) {
            socket.emit('transfer_completed', transferId)
          }
        },
        onError: err => {
          console.error('[P2P Receiver] FileReceiver onError:', err)
          toast.error('文件接收出错')
          if (socket && transferId) {
            socket.emit('transfer_failed', transferId, err.message)
          }
          cleanup(transferId)
        },
      })

      return pc
    },
    [socket, cleanup],
  )

  const waitForIceGathering = useCallback(async (pc: RTCPeerConnection) => {
    await Promise.race([
      new Promise<void>(resolve => {
        const check = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', check)
            resolve()
          }
        }
        if (pc.iceGatheringState === 'complete') resolve()
        else pc.addEventListener('icegatheringstatechange', check)
      }),
      new Promise<void>(resolve => setTimeout(resolve, ICE_GATHERING_TIMEOUT)),
    ])
  }, [])

  const setRemoteDescription = useCallback(
    async (pc: RTCPeerConnection, offer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
    },
    [],
  )

  const createAnswer = useCallback(
    async (pc: RTCPeerConnection) => {
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      await waitForIceGathering(pc)

      return {
        type: answer.type as 'answer',
        sdp: answer.sdp || '',
      } as RTCSessionDescriptionInit
    },
    [waitForIceGathering],
  )

  const handleDataMessage = useCallback((data: ArrayBuffer | string) => {
    if (receiverRef.current) {
      receiverRef.current.handleData(data)
    }
  }, [])

  // ============= 公开 API =============

  /**
   * 接受传输
   */
  const acceptTransfer = useCallback(
    async (
      transferId: string,
      _fileMeta: FileTransferMetadata,
      _fromUser: User,
      offer: RTCSessionDescriptionInit,
    ) => {
      console.log(
        '[P2P Receiver] acceptTransfer start, transferId:',
        transferId,
      )
      if (!socket) {
        console.log('[P2P Receiver] acceptTransfer: socket is null, return')
        return
      }

      console.log('[P2P Receiver] acceptTransfer: before cleanup')
      cleanup(transferId)
      console.log('[P2P Receiver] acceptTransfer: after cleanup')

      try {
        console.log('[P2P Receiver] acceptTransfer: createReceiverPc')
        const pc = createPeerConnection(transferId)
        console.log('[P2P Receiver] acceptTransfer: after createReceiverPc')

        console.log('[P2P Receiver] acceptTransfer: setRemoteDescription')
        await setRemoteDescription(pc, offer)
        console.log('[P2P Receiver] acceptTransfer: after setRemoteDescription')

        console.log('[P2P Receiver] acceptTransfer: createAnswer')
        const answerPayload = await createAnswer(pc)
        console.log(
          '[P2P Receiver] acceptTransfer: after createAnswer, emit answer',
        )

        socket.emit('accept_transfer', transferId, answerPayload)

        console.log('[P2P Receiver] acceptTransfer: setState')
        setState(prev => ({
          ...prev,
          transferId,
          isConnected: false,
        }))
        console.log('[P2P Receiver] acceptTransfer: done')
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('[P2P Receiver] acceptTransfer failed:', error)
        toast.error('接受失败')
        cleanup(transferId)
      }
    },
    [socket, cleanup, createPeerConnection, setRemoteDescription, createAnswer],
  )

  /**
   * 处理 ICE Candidate (接收方模式)
   */
  const handleIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => {
      console.error('[P2P Receiver] addIceCandidate failed:', err)
    })
  }, [])

  /**
   * 获取接收的文件
   */
  const getReceivedFile = useCallback(() => {
    return receivedFileRef.current
  }, [])

  /**
   * 设置传输完成回调
   */
  const onTransferComplete = useCallback((cb: () => void) => {
    onTransferCompleteRef.current = cb
  }, [])

  // ============= 返回值 =============

  return {
    // 状态
    transferId: state.transferId,
    isConnected: state.isConnected,
    isReceiving: state.isReceiving,
    progress: state.progress,
    isTransferComplete: state.isTransferComplete,
    // API
    acceptTransfer,
    handleIceCandidate,
    handleDataMessage,
    cleanup,
    getReceivedFile,
    onTransferComplete,
  }
}
