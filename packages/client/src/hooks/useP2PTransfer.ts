import { useState, useCallback, useRef, useEffect } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import type {
  User,
  RTCSessionDescriptionInit,
  FileTransferMetadata,
  FileTransferProgress,
  RTCIceCandidateInit,
} from '@local-party/shared/src/types'
import toast from 'react-hot-toast'
import { FileSender } from '@/utils/p2p/FileSender'
import { FileReceiver } from '@/utils/p2p/FileReceiver'

// WebRTC 配置
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

interface P2PTransferState {
  transferId: string | null
  isConnected: boolean
  isReceiving: boolean
  progress: FileTransferProgress | null
  error: string | null
  isTransferComplete: boolean
}

export const useP2PTransfer = () => {
  const { socket, currentUser } = useAppStore()
  const [state, setState] = useState<P2PTransferState>({
    transferId: null,
    isConnected: false,
    isReceiving: false,
    progress: null,
    error: null,
    isTransferComplete: false,
  })

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const senderRef = useRef<FileSender | null>(null)
  const receiverRef = useRef<FileReceiver | null>(null)

  // 临时存储接收到的文件，供 getReceivedFile 读取
  const receivedFileRef = useRef<File | null>(null)

  // 接收完成回调
  const onTransferCompleteRef = useRef<(() => void) | null>(null)

  // ICE Candidate 缓冲
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])

  // 连接超时定时器
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  // --- Cleanup ---
  const cleanup = useCallback(
    (targetTransferId?: string) => {
      // 如果指定了 ID 且不匹配当前 ID，则忽略（防止清理了正在进行的新传输）
      if (
        targetTransferId &&
        state.transferId &&
        targetTransferId !== state.transferId
      ) {
        return
      }

      console.log(`[P2P Transfer] Cleanup resources ${state.transferId || ''}`)

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

      // 注意：receiverRef 不需要 abort，只是释放引用
      receiverRef.current = null

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
      }

      setState({
        transferId: null,
        isConnected: false,
        isReceiving: false,
        progress: null,
        error: null,
        isTransferComplete: false,
      })
    },
    [state.transferId],
  )

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

  // --- Handlers ---

  // 处理从 DataChannel 收到的数据 (Delegated to FileReceiver)
  const handleDataMessage = useCallback((data: ArrayBuffer | string) => {
    if (receiverRef.current) {
      receiverRef.current.handleData(data)
    }
  }, [])

  // 发起传输 (Sender)
  const initiateTransfer = useCallback(
    async (fileInfo: { name: string; size: number; type: string }) => {
      if (!socket || !currentUser) {
        toast.error('网络连接异常')
        return null
      }

      const transferId = `transfer_${Date.now()}_${currentUser.id}`
      cleanup() // 清理旧连接

      try {
        console.log('[P2P Transfer] Step 1: Create PeerConnection')
        const pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnectionRef.current = pc

        pc.onicecandidate = event => {
          if (event.candidate && socket) {
            // Fix type mismatch
            const candidate = event.candidate.toJSON()
            const safeCandidate = {
              ...candidate,
              sdpMid: candidate.sdpMid ?? undefined,
            } as unknown as RTCIceCandidateInit
            socket.emit('send_ice_candidate', safeCandidate, transferId)
          }
        }

        pc.onconnectionstatechange = () => {
          console.log('[P2P] Connection State:', pc.connectionState)
          if (pc.connectionState === 'connected') {
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current)
            }
            // Do NOT set isConnected: true here. Wait for DataChannel open.
            // setState(prev => ({ ...prev, isConnected: true }))
          }
          if (pc.connectionState === 'failed') {
            toast.error('P2P连接失败')
            cleanup()
          }
        }

        console.log('[P2P Transfer] Step 2: Create DataChannel')
        const dataChannel = pc.createDataChannel('fileTransfer', {
          ordered: true,
        })
        dataChannelRef.current = dataChannel

        dataChannel.onopen = () => {
          console.log('[P2P] DataChannel Open')
          setState(prev => ({ ...prev, isConnected: true }))
        }
        dataChannel.onclose = () => cleanup()
        dataChannel.onerror = err => {
          console.error('DataChannel Error:', err)
          cleanup()
        }

        // Create Offer
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        // Wait for ICE gathering (max 2s)
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
          new Promise<void>(resolve => setTimeout(resolve, 2000)),
        ])

        // Send to Signal Server
        const offerPayload: RTCSessionDescriptionInit = {
          type: offer.type as 'offer',
          sdp: offer.sdp || '',
        }
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
          isReceiving: false,
        }))

        return transferId
      } catch (e) {
        console.error('Initiate Transfer Failed:', e)
        toast.error('发起传输失败')
        cleanup()
        return null
      }
    },
    [socket, currentUser, cleanup],
  )

  // 接受传输 (Receiver)
  const acceptTransfer = useCallback(
    async (
      transferId: string,
      _fileMeta: FileTransferMetadata,
      _fromUser: User,
      offer: RTCSessionDescriptionInit,
    ) => {
      if (!socket) return

      // Clean up previous transfer if exists
      cleanup()

      try {
        console.log('[P2P Transfer] Accept Transfer:', transferId)
        const pc = new RTCPeerConnection(RTC_CONFIG)
        peerConnectionRef.current = pc

        // 初始化 Receiver 逻辑处理类
        receiverRef.current = new FileReceiver(transferId, {
          onProgress: progress => {
            setState(prev => ({ ...prev, progress }))
          },
          onComplete: file => {
            console.log('[P2P Receiver] Complete')
            receivedFileRef.current = file
            setState(prev => ({ ...prev, isTransferComplete: true }))

            if (onTransferCompleteRef.current) {
              onTransferCompleteRef.current()
            }
            if (socket) socket.emit('transfer_completed', transferId)

            // 延迟清理，给 UI 一点反应时间 (确保 UI 动画结束前数据还在)
            setTimeout(() => cleanup(transferId), 4000)
          },
          onError: err => {
            console.error('[P2P Receiver] Error:', err)
            toast.error('文件接收出错')
            if (socket) socket.emit('transfer_failed', transferId, err.message)
            cleanup(transferId)
          },
        })

        pc.onicecandidate = event => {
          if (event.candidate && socket) {
            const candidate = event.candidate.toJSON()
            const safeCandidate = {
              ...candidate,
              sdpMid: candidate.sdpMid ?? undefined,
            } as unknown as RTCIceCandidateInit
            socket.emit('send_ice_candidate', safeCandidate, transferId)
          }
        }

        pc.onconnectionstatechange = () => {
          console.log('[P2P] Connection State:', pc.connectionState)
          // Do NOT set isConnected: true here. Wait for DataChannel open.
          /* if (pc.connectionState === 'connected') {
            setState(prev => ({ ...prev, isConnected: true }))
          } */
          if (pc.connectionState === 'failed') {
            toast.error('P2P连接失败')
            cleanup(transferId)
          }
        }

        pc.ondatachannel = event => {
          console.log('[P2P] Received DataChannel')
          const dc = event.channel
          dataChannelRef.current = dc

          dc.onopen = () => {
            console.log('[P2P] DataChannel Open')
            setState(prev => ({
              ...prev,
              isConnected: true,
              isReceiving: true,
              transferId,
            }))
            toast.success('P2P连接已建立')
          }

          dc.onmessage = e => handleDataMessage(e.data)
          dc.onclose = () => cleanup(transferId)
          dc.onerror = () => cleanup(transferId)
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        // Wait for ICE
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
          new Promise<void>(resolve => setTimeout(resolve, 2000)),
        ])

        const answerPayload: RTCSessionDescriptionInit = {
          type: answer.type as 'answer',
          sdp: answer.sdp || '',
        }

        socket.emit('accept_transfer', transferId, answerPayload)

        setState(prev => ({
          ...prev,
          transferId,
          isConnected: false, // Wait for real connection
        }))
      } catch (e) {
        console.error('Accept Transfer Failed:', e)
        toast.error('接受失败')
        cleanup(transferId)
      }
    },
    [socket, cleanup, handleDataMessage],
  )

  // 发送文件 (Sender)
  const sendFile = useCallback(
    (file: File) => {
      const dc = dataChannelRef.current
      const transferId = state.transferId

      if (!dc || dc.readyState !== 'open' || !transferId) {
        toast.error('连接未就绪')
        return
      }

      senderRef.current = new FileSender(file, dc, transferId, {
        onProgress: progress => {
          // 本地进度更新
          setState(prev => ({ ...prev, progress }))
          // 发送给接收端/房间（可选，目前 1v1 发送者自己知道进度）
          if (socket) socket.emit('transfer_progress_update', progress)
        },
        onComplete: () => {
          console.log('[P2P Sender] Complete')
          toast.success('文件发送完成')
          // Sender 不需要发送 completion 事件，避免服务器重复广播消息
          // if (socket) socket.emit('transfer_completed', transferId)
          setTimeout(() => cleanup(transferId), 4000)
        },
        onError: err => {
          console.error('[P2P Sender] Error:', err)
          toast.error('发送出错')
          if (socket) socket.emit('transfer_failed', transferId, err.message)
          cleanup(transferId)
        },
      })

      senderRef.current.start()
    },
    [socket, state.transferId, cleanup],
  )

  // 处理 ICE Candidate
  const handleIceCandidate = useCallback((candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current
    if (!pc) return

    if (!pc.remoteDescription && pc.signalingState !== 'stable') {
      pendingCandidates.current.push(candidate)
    } else {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
    }
  }, [])

  // 处理 Remote Answer
  const handleRemoteAnswer = useCallback(
    async (answer: RTCSessionDescriptionInit) => {
      const pc = peerConnectionRef.current
      if (!pc) return

      // 启动 15s 连接超时
      if (connectionTimeoutRef.current)
        clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = setTimeout(() => {
        if (pc.connectionState !== 'connected') {
          toast.error('P2P 连接超时')
          if (socket && state.transferId)
            socket.emit('transfer_failed', state.transferId, 'Timeout')
          cleanup()
        }
      }, 15000)

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))

        // Flush buffered candidates
        for (const candidate of pendingCandidates.current) {
          await pc
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(console.error)
        }
        pendingCandidates.current = []
      } catch (e) {
        console.error('Set Remote Answer Failed:', e)
      }
    },
    [socket, state.transferId, cleanup],
  )

  return {
    ...state,
    initiateTransfer,
    acceptTransfer,
    rejectTransfer: (id: string) => {
      socket?.emit('reject_transfer', id)
      cleanup(id)
    },
    cancelTransfer: () => {
      if (state.transferId && socket) {
        socket.emit('cancel_transfer_offer', state.transferId)
      }
      cleanup()
    },
    sendFile,
    getReceivedFile: () => receivedFileRef.current,
    cleanup,
    handleIceCandidate,
    handleRemoteAnswer,
    onTransferComplete: (cb: () => void) => {
      onTransferCompleteRef.current = cb
    },
  }
}
