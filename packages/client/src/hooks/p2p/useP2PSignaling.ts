import { useCallback } from 'react'
import { Socket } from 'socket.io-client'
import type {
  User,
  FileTransferMetadata,
  RTCSessionDescriptionInit,
  RTCIceCandidateInit,
} from '@local-party/shared/src/types'

/**
 * 负责 Socket 事件监听和发送
 */
interface UseP2PSignalingProps {
  socket: Socket | null
  onTransferRequest: (data: {
    fromUser: User
    fileMeta: FileTransferMetadata
    offer: RTCSessionDescriptionInit
  }) => void
  onTransferAccepted: (
    transferId: string,
    answer: RTCSessionDescriptionInit,
  ) => void
  onTransferRejected: (transferId: string) => void
  onTransferCancelled: (transferId: string) => void
  onTransferCompleted: (transferId: string) => void
  onTransferFailed: (transferId: string, reason: string) => void
  onTransferProgress: (progress: {
    transferId: string
    percentage: number
  }) => void
  onIceCandidate: (candidate: RTCIceCandidateInit) => void
}

export const useP2PSignaling = ({
  socket,
  onTransferRequest,
  onTransferAccepted,
  onTransferRejected,
  onTransferCancelled,
  onTransferCompleted,
  onTransferFailed,
  onTransferProgress,
  onIceCandidate,
}: UseP2PSignalingProps) => {
  const emitTransferOffer = useCallback(
    (
      transferId: string,
      offer: RTCSessionDescriptionInit,
      fileMeta: Partial<FileTransferMetadata>,
    ) => {
      if (!socket) return
      socket.emit('send_transfer_offer', transferId, offer, fileMeta)
    },
    [socket],
  )

  const emitTransferAccepted = useCallback(
    (transferId: string, answer: RTCSessionDescriptionInit) => {
      if (!socket) return
      socket.emit('accept_transfer', transferId, answer)
    },
    [socket],
  )

  const emitTransferRejected = useCallback(
    (transferId: string) => {
      if (!socket) return
      socket.emit('reject_transfer', transferId)
    },
    [socket],
  )

  const emitTransferCancelled = useCallback(
    (transferId: string) => {
      if (!socket) return
      socket.emit('cancel_transfer_offer', transferId)
    },
    [socket],
  )

  const emitIceCandidate = useCallback(
    (candidate: RTCIceCandidateInit, transferId: string) => {
      if (!socket) return
      socket.emit('send_ice_candidate', candidate, transferId)
    },
    [socket],
  )

  const emitTransferProgress = useCallback(
    (transferId: string, percentage: number) => {
      if (!socket) return
      socket.emit('transfer_progress_update', { transferId, percentage })
    },
    [socket],
  )

  const emitTransferCompleted = useCallback(
    (transferId: string) => {
      if (!socket) return
      socket.emit('transfer_completed', transferId)
    },
    [socket],
  )

  const emitTransferFailed = useCallback(
    (transferId: string, reason: string) => {
      if (!socket) return
      socket.emit('transfer_failed', transferId, reason)
    },
    [socket],
  )

  // Socket event listeners setup
  const setupListeners = useCallback(() => {
    if (!socket) return () => {}

    const handleReceiveOffer = (data: {
      fromUser: User
      fileMeta: FileTransferMetadata
      offer: RTCSessionDescriptionInit
    }) => {
      onTransferRequest(data)
    }

    const handleTransferAccepted = (
      transferId: string,
      answer: RTCSessionDescriptionInit,
    ) => {
      onTransferAccepted(transferId, answer)
    }

    const handleTransferRejected = (transferId: string) => {
      onTransferRejected(transferId)
    }

    const handleTransferCancelled = (transferId: string) => {
      onTransferCancelled(transferId)
    }

    const handleTransferCompleted = (transferId: string) => {
      onTransferCompleted(transferId)
    }

    const handleTransferFailed = (transferId: string, reason: string) => {
      onTransferFailed(transferId, reason)
    }

    const handleProgressUpdate = (progress: {
      transferId: string
      percentage: number
    }) => {
      onTransferProgress(progress)
    }

    const handleIceCandidateEvent = (candidate: RTCIceCandidateInit) => {
      onIceCandidate(candidate)
    }

    socket.on('receive_transfer_offer', handleReceiveOffer)
    socket.on('transfer_accepted', handleTransferAccepted)
    socket.on('transfer_rejected', handleTransferRejected)
    socket.on('transfer_offer_cancelled', handleTransferCancelled)
    socket.on('transfer_completed', handleTransferCompleted)
    socket.on('transfer_failed', handleTransferFailed)
    socket.on('transfer_progress', handleProgressUpdate)
    socket.on('ice_candidate', handleIceCandidateEvent)

    return () => {
      socket.off('receive_transfer_offer', handleReceiveOffer)
      socket.off('transfer_accepted', handleTransferAccepted)
      socket.off('transfer_rejected', handleTransferRejected)
      socket.off('transfer_offer_cancelled', handleTransferCancelled)
      socket.off('transfer_completed', handleTransferCompleted)
      socket.off('transfer_failed', handleTransferFailed)
      socket.off('transfer_progress', handleProgressUpdate)
      socket.off('ice_candidate', handleIceCandidateEvent)
    }
  }, [
    socket,
    onTransferRequest,
    onTransferAccepted,
    onTransferRejected,
    onTransferCancelled,
    onTransferCompleted,
    onTransferFailed,
    onTransferProgress,
    onIceCandidate,
  ])

  return {
    emitTransferOffer,
    emitTransferAccepted,
    emitTransferRejected,
    emitTransferCancelled,
    emitIceCandidate,
    emitTransferProgress,
    emitTransferCompleted,
    emitTransferFailed,
    setupListeners,
  }
}
