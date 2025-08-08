//src/buttons/CopyAddressBtn.tsx
import React from 'react'

// Props expected by the CopyAddressBtn component
type CopyAddressBtnProps = {
  value: string // The string (typically an address) to be copied
  title?: string // Optional tooltip title shown on hover (default='Copy to clipboard')
  className?: string // Optional additional Tailwind CSS classes
}

// Create a function that writes text to clipboard, export it if need be
function copyToClipboard(value: string) {
  navigator.clipboard.writeText(value).catch(() => {})
}

// A small button that copies the given value to clipboard when clicked
export const CopyAddressBtn: React.FC<CopyAddressBtnProps> = ({
  value, // Address or text to copy
  title = 'Copy to clipboard', // Tooltip shown on hover
  className = '', // Custom styling classes from parent
}) => (
  <button
    onClick={() => copyToClipboard(value)} // Click handler that triggers the copy function
    title={title} // Tooltip text
    className={`text-pink-400 hover:text-lime-400 ml-2 text-lg ${className}`} // Default and additional styles
  >
    🗐 {/* Unicode clipboard icon (can be replaced with an SVG or icon component) */}
  </button>
)
