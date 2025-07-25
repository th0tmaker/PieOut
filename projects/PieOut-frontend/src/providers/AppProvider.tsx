//src/providers/AppProvider.tsx
import React, { useState, useCallback, useEffect, useRef, FC } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { PieoutClient } from '../contracts/Pieout'
import { AppClient } from '@algorandfoundation/algokit-utils/types/app-client'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { algorand } from '../utils/network/getAlgorandClient'
import { PieoutMethods } from '../methods'
import { createMethodHandler } from '../methodHandler'
import { AppCtx } from '../contexts/App'

export const AppProvider: FC<React.PropsWithChildren> = ({ children }) => {
  // --- States ---
  const [appCreator, setAppCreator] = useState<string | undefined>(undefined)
  const [appClient, setAppClient] = useState<PieoutClient | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [initError, setInitError] = useState<string | undefined>(undefined)

  // --- Wallet ---
  const { activeAddress, transactionSigner } = useWallet()

  // --- Refs for persistent instances ---
  const appMethodsRef = useRef<PieoutMethods | undefined>()
  const appMethodHandlerRef = useRef<ReturnType<typeof createMethodHandler> | undefined>()
  const isInitializingRef = useRef(false)
  const hasHydratedRef = useRef(false)
  const lastActiveAddressRef = useRef<string | null>(null)

  // --- Clear all instances when activeAddress changes ---
  const clearInstances = useCallback(() => {
    appMethodsRef.current = undefined
    appMethodHandlerRef.current = undefined
    hasHydratedRef.current = false
  }, [])

  // --- Initialize app methods (only once per activeAddress) ---
  const initializeAppMethods = useCallback(() => {
    if (!activeAddress || appMethodsRef.current) return

    try {
      algorand.setDefaultSigner(transactionSigner)
      appMethodsRef.current = new PieoutMethods(algorand, activeAddress)
      consoleLogger.info('[AppProvider] Initialized app methods for:', activeAddress)
    } catch (error) {
      consoleLogger.error('[AppProvider] Failed to initialize app methods:', error)
      setInitError('Failed to initialize app methods')
    }
  }, [activeAddress, transactionSigner])

  // --- Initialize method handler (only once per appClient) ---
  const initializeMethodHandler = useCallback(() => {
    if (!activeAddress || !appMethodsRef.current || !appClient || appMethodHandlerRef.current) {
      return
    }

    try {
      appMethodHandlerRef.current = createMethodHandler({
        activeAddress,
        appMethods: appMethodsRef.current,
        appClient,
      })
      consoleLogger.info('[AppProvider] Initialized method handler')
    } catch (error) {
      consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
      setInitError('Failed to initialize method handler')
    }
  }, [activeAddress, appClient])

  // --- Hydrate from localStorage ---
  const hydrateFromStorage = useCallback(async () => {
    if (!activeAddress || hasHydratedRef.current || isInitializingRef.current) {
      return
    }

    hasHydratedRef.current = true
    setIsLoading(true)
    setInitError(undefined)

    try {
      const storedAppId = localStorage.getItem('appId')
      const storedAppCreator = localStorage.getItem('appCreator')
      const storedAppSpec = localStorage.getItem('appSpec')

      if (storedAppId && storedAppSpec) {
        consoleLogger.info('[AppProvider] Attempting to hydrate from storage...')

        // Create new app client from stored data
        const newAppClient = new AppClient({
          appId: BigInt(storedAppId),
          appSpec: storedAppSpec,
          algorand,
        })
        const client = new PieoutClient(newAppClient)

        // Get creator address
        const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

        // Set states
        setAppClient(client)
        setAppCreator(creator)

        // Initialize method handler immediately after hydration
        if (appMethodsRef.current && !appMethodHandlerRef.current) {
          try {
            appMethodHandlerRef.current = createMethodHandler({
              activeAddress,
              appMethods: appMethodsRef.current,
              appClient: client, // Use the client directly, not from state
            })
            consoleLogger.info('[AppProvider] Initialized method handler after hydration')
          } catch (error) {
            consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
          }
        }

        // Store creator if not already stored
        if (!storedAppCreator) {
          localStorage.setItem('appCreator', creator)
        }

        consoleLogger.info('[AppProvider] Successfully hydrated app from storage:', client.appId)
        return true
      }

      consoleLogger.info('[AppProvider] No stored app data found')
      return false
    } catch (error) {
      consoleLogger.warn('[AppProvider] Hydration failed, clearing storage:', error)
      localStorage.removeItem('appId')
      localStorage.removeItem('appCreator')
      localStorage.removeItem('appSpec')
      setInitError('Failed to hydrate from storage')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [activeAddress])

  // --- Generate new app client ---
  const getAppClient = useCallback(async (): Promise<PieoutClient> => {
    // Return existing client if available
    if (appClient) {
      return appClient
    }

    if (!activeAddress) {
      throw new Error('No active wallet address')
    }

    // Prevent concurrent initialization
    if (isInitializingRef.current) {
      return new Promise((resolve, reject) => {
        const checkInit = () => {
          if (!isInitializingRef.current) {
            if (appClient) {
              resolve(appClient)
            } else {
              reject(new Error('Initialization failed'))
            }
          } else {
            setTimeout(checkInit, 100)
          }
        }
        checkInit()
      })
    }

    isInitializingRef.current = true
    setIsLoading(true)
    setInitError(undefined)

    try {
      // Ensure app methods are initialized
      if (!appMethodsRef.current) {
        algorand.setDefaultSigner(transactionSigner)
        appMethodsRef.current = new PieoutMethods(algorand, activeAddress)
      }

      // Generate new app
      consoleLogger.info('[AppProvider] Generating new app...')
      const client = await appMethodsRef.current.generate(activeAddress)

      // Get creator address
      const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

      // Update states
      setAppClient(client)
      setAppCreator(creator)

      // Initialize method handler immediately after setting client
      if (appMethodsRef.current && !appMethodHandlerRef.current) {
        try {
          appMethodHandlerRef.current = createMethodHandler({
            activeAddress,
            appMethods: appMethodsRef.current,
            appClient: client, // Use the client directly, not from state
          })
          consoleLogger.info('[AppProvider] Initialized method handler after generation')
        } catch (error) {
          consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
        }
      }

      // Store in localStorage
      localStorage.setItem('appId', client.appId.toString())
      localStorage.setItem('appCreator', creator)
      localStorage.setItem('appSpec', JSON.stringify(client.appClient.appSpec))

      consoleLogger.info('[AppProvider] Successfully generated new app:', client.appId)
      return client
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      consoleLogger.error('[AppProvider] Failed to generate app client:', error)
      setInitError(`Failed to generate app: ${errorMessage}`)
      throw error
    } finally {
      setIsLoading(false)
      isInitializingRef.current = false
    }
  }, [activeAddress, appClient, transactionSigner])

  // --- Effect: Handle activeAddress changes ---
  useEffect(() => {
    // If activeAddress changed, clear everything
    if (lastActiveAddressRef.current !== activeAddress) {
      if (lastActiveAddressRef.current !== undefined) {
        consoleLogger.info('[AppProvider] Active address changed, clearing instances')
        clearInstances()
      }
      lastActiveAddressRef.current = activeAddress
    }

    if (!activeAddress) {
      setIsLoading(false)
      return
    }

    // Initialize app methods first
    initializeAppMethods()

    // Then try to hydrate
    hydrateFromStorage()
  }, [activeAddress, initializeAppMethods, hydrateFromStorage])

  // --- Effect: Initialize method handler when appClient is available (fallback) ---
  useEffect(() => {
    if (appClient && activeAddress && appMethodsRef.current && !appMethodHandlerRef.current) {
      // This is a fallback in case the direct initialization didn't work
      consoleLogger.info('[AppProvider] Initializing method handler via effect (fallback)')
      initializeMethodHandler()
    }
  }, [appClient, activeAddress, initializeMethodHandler])

  // --- Context value ---
  const value = {
    appClient,
    appCreator,
    appMethods: appMethodsRef.current,
    appMethodHandler: appMethodHandlerRef.current,
    getAppClient,
    isLoading,
    initError,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
