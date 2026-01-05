import { createPortal } from 'react-dom'

interface PortalTooltipProps {
  content: React.ReactNode
  targetRect: DOMRect | null
  isVisible: boolean
}

export const PortalTooltip = ({ content, targetRect, isVisible }: PortalTooltipProps) => {
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
      className="bg-gray-900 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-xl animate-fade-in pointer-events-none"
    >
      {content}
      {/* 小三角 (朝上) */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
    </div>,
    document.body
  )
}
