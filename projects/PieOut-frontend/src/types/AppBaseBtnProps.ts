import React from 'react'

// Define the style props
export type ButtonSize = 'sm' | 'md' | 'lg'
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | 'xl2' | 'xl3'

// Define the App Base Button Props type
export type AppBaseBtnProps = {
  onClick: () => void
  children: React.ReactNode
  variant?: 'regular' | 'text'
  className?: string
  disabled?: boolean
  size?: ButtonSize
  textSize?: TextSize
  title?: string
}
