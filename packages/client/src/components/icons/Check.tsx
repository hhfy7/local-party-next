/**
 * Checkmark icon
 */
interface CheckIconProps {
  className?: string
}

export const CheckIcon = ({ className = 'h-4 w-4' }: CheckIconProps) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      d="M5 13l4 4L19 7"
    />
  </svg>
)
