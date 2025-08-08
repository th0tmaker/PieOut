//src/hooks/useAppSubscriberCtx.ts
import { useContext } from 'react'
import { AppSubscriberCtx } from '../contexts/AppSubscriber'

export const useAppSubscriberCtx = () => {
  const ctx = useContext(AppSubscriberCtx)
  if (!ctx) {
    throw new Error('useAppSubscriberCtx must be used within an AppSubscriberProvider')
  }
  return ctx
}
