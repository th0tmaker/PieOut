// src/providers/AppSubscriberCtxProvider.tsx
import React from 'react'
import { useAppSubscriber } from '../hooks/useAppSubscriber'
import { AppSubscriberCtx } from '../contexts/AppSubscriber'

interface UseAppSubscriberOptions {
  filterName?: string
  mode?: 'single' | 'batch'
  maxRoundsToSync?: number
  pollOneTime?: boolean
}

interface AppSubscriberProviderProps extends UseAppSubscriberOptions {
  children: React.ReactNode
}

export const AppSubscriberCtxProvider = ({ children, ...options }: AppSubscriberProviderProps) => {
  const subscriber = useAppSubscriber(options)

  return <AppSubscriberCtx.Provider value={subscriber}>{children}</AppSubscriberCtx.Provider>
}
