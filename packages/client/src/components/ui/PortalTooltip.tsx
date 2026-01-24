import { createPortal } from 'react-dom'

interface PortalTooltipProps {
  content: React.ReactNode
  targetRect: DOMRect | null
  isVisible: boolean
}

export const PortalTooltip = ({
  content,
  targetRect,
  isVisible,
}: PortalTooltipProps) => {
  if (!isVisible || !targetRect) return null

  // 计算位置：默认在下方，居中对齐
  const style: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.bottom + 8, // 下方 8px
    left: targetRect.left + targetRect.width / 2,
    transform: 'translateX(-50%)',
    zIndex: 9999, // 确保最顶层
  }

  return createPortal(
    <div
      style={style}
      className="animate-fade-in pointer-events-none rounded-lg bg-gray-900 px-3 py-1.5 text-[10px] text-white shadow-xl"
    >
      {content}
      {/* 小三角 (朝上) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
    </div>,
    document.body,
  )
}
