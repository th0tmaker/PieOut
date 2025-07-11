import React, { useState, useCallback, useEffect, useRef } from 'react'
import { PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'
import { AppClient } from '@algorandfoundation/algokit-utils/types/app-client'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Arc56Contract } from '@algorandfoundation/algokit-utils/types/app-arc56'
import { AppClientContext } from '../contexts/AppClient'

export const AppClientProvider: React.FC<{
  children: React.ReactNode
  activeAddress: string | undefined
  appMethods: PieoutMethods | undefined
  algorand: AlgorandClient
}> = ({ children, activeAddress, appMethods, algorand }) => {
  const [appClient, setAppClient] = useState<PieoutClient | null>(null)
  const [appCreator, setAppCreator] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasHydrated = useRef(false)

  // Hydrate from storage only if appClient doesn't exist yet
  useEffect(() => {
    const hydrateFromStorage = async () => {
      if (appClient || hasHydrated.current) {
        setIsLoading(false)
        return
      }

      hasHydrated.current = true
      const storedAppId = localStorage.getItem('appId')
      const storedAppCreator = localStorage.getItem('appCreator')
      const storedAppSpec = localStorage.getItem('appSpec')

      if (storedAppId && storedAppSpec) {
        try {
          const parsedAppSpec: Arc56Contract = JSON.parse(storedAppSpec)
          const newAppClient = new AppClient({
            appId: BigInt(storedAppId),
            appSpec: parsedAppSpec,
            algorand: algorand,
          })
          const client = new PieoutClient(newAppClient)

          // Verify the app still exists before setting it
          const info = await client.algorand.app.getById(client.appId)

          setAppClient(client)
          setAppCreator(info.creator.toString())

          // Update stored creator if missing
          if (!storedAppCreator) {
            localStorage.setItem('appCreator', info.creator.toString())
          }

          consoleLogger.info('[AppClientProvider] Successfully hydrated app from storage:', client.appId)
        } catch (err) {
          consoleLogger.warn('[AppClientProvider] App from storage no longer exists, clearing cache:', err)
          // Clean up invalid storage data
          localStorage.removeItem('appId')
          localStorage.removeItem('appCreator')
          localStorage.removeItem('appSpec')
          // Don't set appClient since the app doesn't exist
        }
      }

      setIsLoading(false)
    }

    hydrateFromStorage()
  }, [algorand, appClient])

  const getAppClient = useCallback(async (): Promise<PieoutClient> => {
    if (appClient) {
      return appClient
    }

    if (!activeAddress || !appMethods) {
      throw new Error('activeAddress and appMethods are required!')
    }

    try {
      const client = await appMethods.generateApp(activeAddress)
      const info = await client.algorand.app.getById(client.appId)
      const creator = info.creator.toString()

      setAppClient(client)
      setAppCreator(creator)

      // Persist to storage
      localStorage.setItem('appId', client.appId.toString())
      localStorage.setItem('appCreator', creator)
      localStorage.setItem('appSpec', JSON.stringify(client.appClient.appSpec))

      return client
    } catch (err) {
      consoleLogger.error('[AppClientProvider] Failed to generate app client:', err)
      throw new Error('Failed to create app client')
    }
  }, [activeAddress, appMethods, appClient])

  return <AppClientContext.Provider value={{ appClient, appCreator, getAppClient, isLoading }}>{children}</AppClientContext.Provider>
}
