import { useContext } from 'react'
import { MethodLoadingCtx } from '../contexts/MethodLoading'

// Create a hook that uses the Method Loading Context
export const useMethodLoadingCtx = () => {
  const context = useContext(MethodLoadingCtx)
  if (context === undefined) {
    throw new Error('useMethodLoading must be used within a MethodLoadingProvider')
  }
  return context
}
