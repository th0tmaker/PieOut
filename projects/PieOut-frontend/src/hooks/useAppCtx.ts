//src/hooks/useAppCtx.ts
import { useContext } from 'react'
import { AppCtx } from '../contexts/App'
import { AppCtxProps } from '../types/AppCtxProps'

// Create a hook that uses the App Context
export const useAppCtx = (): AppCtxProps => {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useAppCtx must be used within AppProvider')
  return ctx
}
