//src/buttons/TableBtn.tsx
import { Tooltip } from '../components/Tooltip'

// A reusable button component used inside the game table
export const TableBtn = ({
  onClick, // Function to call on click
  disabled = false, // Whether the button is disabled (e.g. inactive or loading)
  children, // Button label or content (can be text or an icon)
  className = '', // Additional optional styling
  tooltipMessage, // Optional tooltip shown when the button is disabled
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
  tooltipMessage?: string
}) => {
  // If the button is disabled and there's a tooltip message,
  // wrap the content in a tooltip and render it as a non-clickable span
  if (disabled && tooltipMessage) {
    return (
      <Tooltip message={tooltipMessage}>
        <span className="text-gray-400">{children}</span>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        font-bold focus:outline-none ${className}
        ${
          // Conditional styling:
          disabled
            ? 'text-lime-400' // When disabled but loading
            : 'text-lime-400 hover:underline hover:decoration-2 hover:underline-offset-2' // When enabled
        }
      `}
    >
      {disabled ? (
        // Show a spinner in place of content when button is disabled (loading state)
        <div className="inline-flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-t-transparent border-lime-400 rounded-full animate-spin"></div>
        </div>
      ) : (
        // Show regular button content
        children
      )}
    </button>
  )
}
