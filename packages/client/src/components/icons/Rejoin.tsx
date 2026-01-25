/**
 * Rejoin/Continue icon
 */
interface RejoinIconProps {
  className?: string
}

export const RejoinIcon = ({ className = 'h-8 w-8' }: RejoinIconProps) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
    />
  </svg>
)
