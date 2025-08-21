// src/buttons/AppBaseBtn.tsx
import React from 'react'
import { ButtonSize, TextSize, AppBaseBtnProps } from '../types/AppBaseBtnProps'
import { useAppCtx } from '../hooks/useAppCtx'

// Base classes applied to all buttons regardless of variant or size
const BASE_CLASSES = 'transition-colors duration-200 font-semibold rounded'

// Size-specific padding classes based on the ButtonSize type
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2 py-0.5',
  md: 'px-3 py-1',
  lg: 'px-4 py-2',
}

// Text size utility classes mapped to the TextSize type
const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  xl2: 'text-2xl',
  xl3: 'text-3xl',
}

// Button style variants: "text" and "regular" (solid background/button)
const VARIANT_CLASSES = {
  text: {
    enabled: 'font-serif tracking-wide cursor-pointer font-bold text-pink-400 underline hover:text-lime-300',
    disabled: 'font-serif tracking-wide font-bold text-gray-400 underline',
  },
  regular: {
    enabled: 'bg-slate-800 text-pink-300 border-pink-400 border-2 hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200',
    disabled: 'bg-gray-700 text-gray-300 border-gray-500 border-2',
  },
} as const

// Reusable base button component with props for customization
export const AppBaseBtn = React.memo(
  ({
    onClick, // Function to call when the button is clicked
    disabled = false, // Disable state
    children, // Inner content (e.g. button label)
    className = '', // Optional extra classes
    variant = 'regular', // Button style variant ('regular' or 'text'), default='regular'
    size = 'md', // Button size ('sm', 'md', 'lg'), default='md'
    textSize = 'base', // Text size for the label, default='base'
  }: AppBaseBtnProps) => {
    // Hooks
    const { appClient } = useAppCtx()

    // Boolean flag that indicates when the button should be disabled
    const isDisabled = disabled || !appClient

    // Choose the correct style variant based on state
    const variantClass = VARIANT_CLASSES[variant][isDisabled ? 'disabled' : 'enabled']

    // Size is only applied to 'regular' variants, not 'text'
    const sizeClass = variant === 'regular' ? SIZE_CLASSES[size] : ''

    // Apply text sizing
    const textSizeClass = TEXT_SIZE_CLASSES[textSize]

    // Return JSX
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className={`${BASE_CLASSES} ${variantClass} ${sizeClass} ${textSizeClass} ${className}`}
      >
        {children}
      </button>
    )
  },
)
