// src/context/AppClientContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { PieoutClient } from '../contracts/Pieout'
import { PieOutMethods } from '../methods'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

interface AppClientContextType {
  appClient: PieoutClient | null
  appCreator: string | null
  getAppClient: () => Promise<void>
}

const AppClientContext = createContext<AppClientContextType | undefined>(undefined)

export const AppClientProvider: React.FC<{
  children: React.ReactNode
  activeAddress: string | undefined
  appMethods: PieOutMethods | undefined
}> = ({ children, activeAddress, appMethods }) => {
  const [appClient, setAppClient] = useState<PieoutClient | null>(null)
  const [appCreator, setAppCreator] = useState<string | null>(null)

  const getAppClient = useCallback(async () => {
    if (!activeAddress || !appMethods || appClient) return // already generated

    try {
      const client = await appMethods.genContract(activeAddress, 'note: create app', 'note: fund mbr')
      setAppClient(client)

      const info = await client.algorand.app.getById(client.appId)
      setAppCreator(info.creator.toString())

      consoleLogger.info('✅ App ID:', client.appId)
      alert(`App created! ID: ${client.appId}`)
    } catch (err) {
      consoleLogger.error('❌ App creation failed:', err)
      alert('Failed to create app')
    }
  }, [activeAddress, appMethods, appClient])

  return <AppClientContext.Provider value={{ appClient, appCreator, getAppClient }}>{children}</AppClientContext.Provider>
}

export const useAppClient = (): AppClientContextType => {
  const context = useContext(AppClientContext)
  if (!context) throw new Error('useAppClient must be used within AppClientProvider')
  return context
}
