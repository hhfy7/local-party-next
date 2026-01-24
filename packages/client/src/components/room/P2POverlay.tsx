import { ShareDialog } from '@/components/modals/ShareDialog'
import { TransferConfirmModal } from '@/components/modals/TransferConfirmModal'
import { TransferProgress } from '@/components/transfer/TransferProgress'
import type { useP2PManager } from '@/hooks/useP2PManager'
import type { User, FileTransferMetadata } from '@local-party/shared/src/types'

interface P2POverlayProps {
  p2p: ReturnType<typeof useP2PManager>
  recipientCount: number
}

export const P2POverlay = ({ p2p, recipientCount }: P2POverlayProps) => {
  return (
    <>
      <TransferConfirmModal
        isOpen={!!p2p.ui.confirmModalData}
        fromUser={p2p.ui.confirmModalData?.fromUser || ({} as User)}
        fileMeta={
          p2p.ui.confirmModalData?.fileMeta || ({} as FileTransferMetadata)
        }
        onReject={p2p.actions.rejectTransfer}
        onAccept={p2p.actions.acceptTransfer}
      />

      <ShareDialog
        isOpen={p2p.ui.isShareDialogOpen}
        fileMeta={p2p.ui.shareFileMeta}
        recipientCount={recipientCount}
        onConfirm={p2p.actions.confirmShare}
        onCancel={p2p.actions.closeShareDialog}
      />

      <TransferProgress
        progress={p2p.data.progress}
        isReceiving={p2p.data.isReceiving}
        statusText={p2p.ui.statusText}
        currentStep={p2p.ui.p2pStep}
        stepStatus={p2p.ui.p2pStepStatus}
        onCancel={() => {
          p2p.actions.cancelTransfer()
        }}
      />
    </>
  )
}
