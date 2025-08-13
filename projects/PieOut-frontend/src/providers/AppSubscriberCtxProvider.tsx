// src/providers/AppSubscriberCtxProvider.tsx
import React from 'react'
import { AppSubscriberCtx } from '../contexts/AppSubscriber'
import { useAppCtx } from '../hooks/useAppCtx'
import { useAppSubscriber } from '../hooks/useAppSubscriber'

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
  // Get appClient from useAppCtx here in the provider
  const { appClient } = useAppCtx()

  // Pass appClient to useAppSubscriber
  const appSubscriber = useAppSubscriber({
    appClient,
    autoRemoveAfterSeconds: 10,
    ...options,
  })

  return <AppSubscriberCtx.Provider value={appSubscriber}>{children}</AppSubscriberCtx.Provider>
}
