//src/components/CopyAddressBtn.tsx
import React from 'react'
import { copyToClipboard } from '../utils/copyToClipboard'

type CopyAddressBtnProps = {
  value: string
  title?: string
  className?: string
}

export const CopyAddressBtn: React.FC<CopyAddressBtnProps> = ({ value, title = 'Copy to clipboard', className = '' }) => (
  <button onClick={() => copyToClipboard(value)} title={title} className={`text-pink-400 hover:text-lime-400 ml-2 text-lg ${className}`}>
    🗐
  </button>
)
