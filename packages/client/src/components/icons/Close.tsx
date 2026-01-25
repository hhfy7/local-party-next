/**
 * Close/X icon
 */
interface CloseIconProps {
  className?: string
}

export const CloseIcon = ({ className = 'h-4 w-4' }: CloseIconProps) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
)
