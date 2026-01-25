import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/useAppStore'
import { useP2PTransfer } from './useP2PTransfer'
import toast from 'react-hot-toast'
import { STATUS_CLEAR_DELAY } from '@/utils/timingConstants'
import type {
  User,
  FileTransferMetadata,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
  FileTransferProgress,
} from '@local-party/shared/src/types'
import type {
  TransferStep,
  TransferStatus,
} from '@/components/transfer/TransferProgress'

export const useP2PManager = (
  setVideoFile: (file: File) => void,
  setIsP2PVideo: (isP2P: boolean) => void,
) => {
  const { socket, currentUser, hostId } = useAppStore()
  const isHost = currentUser?.id === hostId

  // --- P2P Core Hook ---
  const {
    initiateTransfer,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer: coreCancelTransfer,
    sendFile,
    getReceivedFile,
    handleIceCandidate,
    handleRemoteAnswer,
    isConnected: isP2PConnected,
    isReceiving,
    progress: p2pProgress,
    onTransferComplete,
    cleanup: cleanupP2P,
  } = useP2PTransfer()

  // --- UI State ---
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [p2pStatusText, setP2PStatusText] = useState('')
  const [p2pStep, setP2PStep] = useState<TransferStep>(1)
  const [p2pStepStatus, setP2PStepStatus] = useState<TransferStatus>('pending')

  const [confirmModalData, setConfirmModalData] = useState<{
    fromUser: User
    fileMeta: FileTransferMetadata
    offer: RTCSessionDescriptionInit
  } | null>(null)

  const [shareFileMeta, setShareFileMeta] = useState<{
    fileName: string
    fileSize: number
  }>({ fileName: '', fileSize: 0 })

  // 待发送文件（连接建立后自动发送）
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // 临时存储 cachedHandle 以便在确认分享时读取
  const cachedHandleRef = useRef<FileSystemFileHandle | null>(null)
  // 新增：临时存储 File 对象（用于 iPad/Fallback 场景）
  const cachedFileRef = useRef<File | null>(null)

  // --- Effects: Transfer Logic ---

  // 1. 设置接收完成回调（自动播放 + 导出提示）
  useEffect(() => {
    onTransferComplete(() => {
      console.log('[P2P Manager] 传输完成，准备播放')
      const file = getReceivedFile()
      if (file) {
        // A. 自动播放 (内存模式)
        setVideoFile(file)
        setIsP2PVideo(true) // 标记为 P2P 视频
        setP2PStatusText('传输完成')
        setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)

        // B. 显示导出提示
        toast.success('视频接收完成，已自动播放')
      }
    })
  }, [getReceivedFile, onTransferComplete, setVideoFile, setIsP2PVideo])

  // 2. 监听本地传输进度，驱动步骤条流转
  useEffect(() => {
    if (p2pProgress && p2pProgress.percentage >= 0) {
      // 使用 setTimeout 避免在渲染期间直接 setState
      const timer = setTimeout(() => {
        setP2PStep(prev => (prev !== 3 ? 3 : prev))
        setP2PStepStatus(
          p2pProgress.percentage === 100 ? 'completed' : 'processing',
        )

        if (p2pProgress.percentage === 100) {
          setP2PStatusText('传输完成')
          setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)
        } else {
          setP2PStatusText(
            isReceiving
              ? `正在接收... ${p2pProgress.percentage}%`
              : `正在发送... ${p2pProgress.percentage}%`,
          )
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [p2pProgress, isReceiving])

  // 3. 监听连接建立，自动发送文件 (Host)
  useEffect(() => {
    if (isP2PConnected && pendingFile && isHost) {
      console.log('[P2P Manager] 连接已建立，开始发送文件')
      sendFile(pendingFile)
      // 使用 setTimeout 避免在 Effect 中同步设置状态导致级联更新
      setTimeout(() => setPendingFile(null), 0)
    }
  }, [isP2PConnected, isHost, sendFile, pendingFile])

  // 4. Socket 信令监听
  useEffect(() => {
    if (!socket) return

    const onReceiveOffer = (data: {
      fromUser: User
      fileMeta: FileTransferMetadata
      offer: RTCSessionDescriptionInit
    }) => {
      console.log('[P2P Manager] 收到分享请求:', data)
      setConfirmModalData(data)
    }

    const onTransferCancelled = (transferId: string) => {
      console.log('[P2P Manager] 房主取消了传输:', transferId)
      setConfirmModalData(null)
      setP2PStatusText('房主已取消')
      cleanupP2P(transferId)
      setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)
      toast('房主取消了分享', { icon: 'ℹ️' })
    }

    const onTransferAccepted = (
      _: string,
      answer: RTCSessionDescriptionInit,
    ) => {
      console.log('[P2P Manager] 对方接受了请求，开始传输')
      setP2PStatusText('正在建立 P2P 连接...')
      setP2PStep(2) // 进阶到第二步
      setP2PStepStatus('processing')
      handleRemoteAnswer(answer)
    }

    const onTransferRejected = (transferId: string) => {
      toast.error('对方拒绝了分享请求')
      setP2PStatusText('对方已拒绝')
      setP2PStepStatus('error')
      setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)
      cleanupP2P(transferId)
    }

    const onTransferFailed = (transferId: string, reason: string) => {
      console.error('[P2P Manager] 传输失败:', reason)
      setP2PStatusText(`传输失败: ${reason}`)
      setP2PStepStatus('error')
      setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)
      cleanupP2P(transferId)
    }

    const onProgressUpdate = (progress: FileTransferProgress) => {
      if (progress.percentage < 100) {
        if (p2pStep !== 3) {
          setP2PStep(3)
          setP2PStepStatus('processing')
        }
        setP2PStatusText(current =>
          current.includes('发送') || current.includes('接收')
            ? current
            : '正在传输...',
        )
      } else {
        setP2PStatusText('传输完成')
        setP2PStep(3)
        setP2PStepStatus('completed')
        setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)
      }
    }

    const onIceCandidate = (candidate: RTCIceCandidateInit) => {
      handleIceCandidate(candidate)
    }

    socket.on('receive_transfer_offer', onReceiveOffer)
    socket.on('transfer_offer_cancelled', onTransferCancelled)
    socket.on('transfer_accepted', onTransferAccepted)
    socket.on('transfer_rejected', onTransferRejected)
    socket.on('transfer_progress', onProgressUpdate)
    socket.on('transfer_failed', onTransferFailed)
    socket.on('ice_candidate', onIceCandidate)

    return () => {
      socket.off('receive_transfer_offer', onReceiveOffer)
      socket.off('transfer_offer_cancelled', onTransferCancelled)
      socket.off('transfer_accepted', onTransferAccepted)
      socket.off('transfer_rejected', onTransferRejected)
      socket.off('transfer_progress', onProgressUpdate)
      socket.off('transfer_failed', onTransferFailed)
      socket.off('ice_candidate', onIceCandidate)
    }
  }, [
    socket,
    confirmModalData,
    handleRemoteAnswer,
    handleIceCandidate,
    cleanupP2P,
    p2pStep,
  ])

  // --- Actions ---

  const openShareDialog = async (
    cachedFileHandle: FileSystemFileHandle | null,
    fileObject: File | null,
    videoUrl: string | null,
  ) => {
    if (!videoUrl || (!cachedFileHandle && !fileObject)) {
      toast.error('请先选择本地视频文件')
      return
    }

    try {
      let file: File
      if (cachedFileHandle) {
        file = await cachedFileHandle.getFile()
        cachedHandleRef.current = cachedFileHandle
        // 清除 fileObject ref 防止混淆
        cachedFileRef.current = null
      } else {
        // 如果没有 handle，说明是 Fallback 模式 (iPad/Input)，一定有 fileObject
        file = fileObject!
        cachedFileRef.current = file
        // 清除 handle ref
        cachedHandleRef.current = null
      }

      setShareFileMeta({
        fileName: file.name,
        fileSize: file.size,
      })
      setIsShareDialogOpen(true)
    } catch (e) {
      console.error('[P2P Manager] 获取文件信息失败:', e)
      toast.error('无法读取文件信息')
    }
  }

  const closeShareDialog = () => {
    setIsShareDialogOpen(false)
    cachedHandleRef.current = null
    cachedFileRef.current = null
  }

  const confirmShare = async () => {
    setIsShareDialogOpen(false)
    const handle = cachedHandleRef.current
    const fileObj = cachedFileRef.current

    if (!handle && !fileObj) return

    setP2PStatusText('正在等待对方接受...')
    setP2PStep(1)
    setP2PStepStatus('processing')

    let fileToSend: File | null = null
    try {
      if (handle) {
        fileToSend = await handle.getFile()
      } else {
        fileToSend = fileObj
      }
    } catch (e) {
      console.error('[P2P Manager] 获取文件失败:', e)
      toast.error('无法读取文件')
      setP2PStatusText('')
      return
    }

    if (fileToSend) {
      const transferId = await initiateTransfer({
        name: fileToSend.name,
        size: fileToSend.size,
        type: fileToSend.type,
      })
      if (transferId) {
        setPendingFile(fileToSend)
      } else {
        setP2PStatusText('请求发送失败')
        setP2PStepStatus('error')
        setTimeout(() => setP2PStatusText(''), STATUS_CLEAR_DELAY)
      }
    }
  }

  const handleAcceptTransfer = () => {
    if (confirmModalData) {
      setP2PStatusText('正在连接...')
      setP2PStep(2)
      setP2PStepStatus('processing')
      acceptTransfer(
        confirmModalData.fileMeta.transferId,
        confirmModalData.fileMeta,
        confirmModalData.fromUser,
        confirmModalData.offer,
      )
      setConfirmModalData(null)
    }
  }

  const handleRejectTransfer = () => {
    if (confirmModalData) rejectTransfer(confirmModalData.fileMeta.transferId)
    setConfirmModalData(null)
  }

  const handleCancelTransfer = () => {
    coreCancelTransfer()
    setP2PStatusText('')
    setConfirmModalData(null)
  }

  return {
    ui: {
      isShareDialogOpen,
      confirmModalData,
      p2pStep,
      p2pStepStatus,
      statusText: p2pStatusText,
      shareFileMeta,
    },
    actions: {
      openShareDialog,
      closeShareDialog,
      confirmShare,
      acceptTransfer: handleAcceptTransfer,
      rejectTransfer: handleRejectTransfer,
      cancelTransfer: handleCancelTransfer,
      getReceivedFile,
    },
    data: {
      progress: p2pProgress,
      isReceiving,
      isConnected: isP2PConnected,
      isHost,
    },
  }
}
