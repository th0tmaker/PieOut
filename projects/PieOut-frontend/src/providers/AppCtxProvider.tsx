//src/providers/AppCtxProvider.tsx
import React, { useState, useCallback, useEffect, useRef, FC } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { PieoutClient } from '../contracts/Pieout'
import { AppClient } from '@algorandfoundation/algokit-utils/types/app-client'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { algorand } from '../utils/network/getAlgorandClient'
import { PieoutMethods } from '../methods'
import { createMethodHandler } from '../methodHandler'
import { AppCtx } from '../contexts/App'

// Create an App Context Provider to share app-related state and logic across the app
export const AppCtxProvider: FC<React.PropsWithChildren> = ({ children }) => {
  // Hooks
  const { activeAddress, transactionSigner } = useWallet()

  // States
  const [appCreator, setAppCreator] = useState<string | undefined>(undefined)
  const [appClient, setAppClient] = useState<PieoutClient | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [initErrorMsg, setInitErrorMsg] = useState<string | undefined>(undefined)

  // Refs
  const appMethodsRef = useRef<PieoutMethods | undefined>()
  const appMethodHandlerRef = useRef<ReturnType<typeof createMethodHandler> | undefined>()
  const isInitializingRef = useRef(false)
  const hasHydratedRef = useRef(false)
  const lastActiveAddressRef = useRef<string | null>(null)

  // Callbacks
  // Clear all instances related to app state
  const clearInstances = useCallback(() => {
    appMethodsRef.current = undefined
    appMethodHandlerRef.current = undefined
    hasHydratedRef.current = false
  }, []) // experiment with activeAddress in dependancy array

  // Initialize app methods only once per activeAddress
  const initializeAppMethods = useCallback(() => {
    // If following values evaluate true, return early
    if (!activeAddress || appMethodsRef.current) return

    // Try block
    try {
      algorand.setDefaultSigner(transactionSigner) // Set default signer object for the Algorand client
      appMethodsRef.current = new PieoutMethods(algorand, activeAddress) // Create a new instance of the smart contract methods class

      // Log
      consoleLogger.info('[AppProvider] Initialized app methods for:', activeAddress)
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('[AppProvider] Failed to initialize app methods:', error)
      setInitErrorMsg('Failed to initialize app methods') // Set init error message
    }
  }, [activeAddress, transactionSigner])

  // Initialize method handler, only once per appClient
  const initializeMethodHandler = useCallback(() => {
    // If following values evaluate true, return early
    if (!activeAddress || !appMethodsRef.current || !appClient || appMethodHandlerRef.current) {
      return
    }

    // Try block
    try {
      // Call method that creates a new instance of the smart contract method handler
      appMethodHandlerRef.current = createMethodHandler({
        activeAddress,
        appMethods: appMethodsRef.current,
        appClient,
      })
      // Log
      consoleLogger.info('[AppProvider] Initialized method handler')
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
      setInitErrorMsg('Failed to initialize method handler') // Set init error message
    }
  }, [activeAddress, appClient])

  // Hydrate application data from localStorage
  const hydrateFromStorage = useCallback(async () => {
    // If following values evaluate true, return early
    if (!activeAddress || hasHydratedRef.current || isInitializingRef.current) {
      return
    }

    // Update states and flags
    hasHydratedRef.current = true // Set hydrated reference flag to true
    setIsLoading(true)
    setInitErrorMsg(undefined)

    // Try block
    try {
      // Get app id, creator and specs from local storage
      const storedAppId = localStorage.getItem('appId')
      const storedAppCreator = localStorage.getItem('appCreator')
      const storedAppSpec = localStorage.getItem('appSpec')

      // If app id, specs exists, console log a message
      if (storedAppId && storedAppSpec) {
        consoleLogger.info('[AppProvider] Attempting to hydrate from storage...')

        // Create a new instance of the `AppClient` class from the local storage data retrieved at hydration
        const newAppClient = new AppClient({
          appId: BigInt(storedAppId),
          appSpec: storedAppSpec,
          algorand,
        })

        // Create a new instance of the smart contract client class that inherits from the `newAppClient`
        const client = new PieoutClient(newAppClient)

        // Get creator address from getting the app information by the app id
        const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

        // Update app client and app creator states with new values
        setAppClient(client)
        setAppCreator(creator)

        // Initialize method handler immediately after hydration
        if (appMethodsRef.current && !appMethodHandlerRef.current) {
          // Try block
          try {
            appMethodHandlerRef.current = createMethodHandler({
              activeAddress,
              appMethods: appMethodsRef.current,
              appClient: client, // Use the client directly, not from state
            })
            // Log
            consoleLogger.info('[AppProvider] Initialized method handler after hydration')
            // Catch error
          } catch (error) {
            // Log
            consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
          }
        }

        // Store app creator value in local storage if not already stored
        if (!storedAppCreator) {
          localStorage.setItem('appCreator', creator)
        }

        // Log
        consoleLogger.info('[AppProvider] Successfully hydrated app from storage:', client.appId)

        // Return true
        return true
      }
      // Log
      consoleLogger.warn('[AppProvider] No stored app data found')

      // Return false
      return false
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.warn('[AppProvider] Hydration failed, clearing storage:', error)

      // Clear local storage by removing all items
      localStorage.removeItem('appId')
      localStorage.removeItem('appCreator')
      localStorage.removeItem('appSpec')

      // Set init error message
      setInitErrorMsg('Failed to hydrate from storage')

      // Return false
      return false
      // Finally
    } finally {
      // Set loading flag to false
      setIsLoading(false)
    }
  }, [activeAddress])

  // Generate and return new smart contract application client
  const getAppClient = useCallback(async (): Promise<PieoutClient> => {
    // If following values evaluate true, return early
    if (appClient) {
      // Return early if App Client already exists
      consoleLogger.info('App Client already exists')
      return appClient
    }

    // Return early if no activeAddress is found
    if (!activeAddress) {
      throw new Error('No active wallet address')
    }

    // Prevent concurrent initialization
    if (isInitializingRef.current) {
      return new Promise((resolve, reject) => {
        // Repeatedly check if initialization is complete
        const checkInit = () => {
          if (!isInitializingRef.current) {
            // If initialization succeeded, resolve with appClient
            if (appClient) {
              resolve(appClient)
            } else {
              // Otherwise, reject with an error
              reject(new Error('Initialization failed'))
            }
          } else {
            // Wait 100ms and check again
            setTimeout(checkInit, 100)
          }
        }
        checkInit()
      })
    }

    // Set flags and reset error state
    isInitializingRef.current = true
    setIsLoading(true)
    setInitErrorMsg(undefined)

    // Try block
    try {
      // If appMethods not yet initialized, do so now
      if (!appMethodsRef.current) {
        algorand.setDefaultSigner(transactionSigner)
        appMethodsRef.current = new PieoutMethods(algorand, activeAddress)
      }

      // Log
      consoleLogger.info('[AppProvider] Generating new app...')

      // Generate the smart contract by calling the create app method
      const client = await appMethodsRef.current.generate(activeAddress)

      // Get creator address
      const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

      // Update state with new client and creator values
      setAppClient(client)
      setAppCreator(creator)

      // Initialize method handler if it hasn't been created yet
      if (appMethodsRef.current && !appMethodHandlerRef.current) {
        // Try block
        try {
          appMethodHandlerRef.current = createMethodHandler({
            activeAddress,
            appMethods: appMethodsRef.current,
            appClient: client, // Use the client directly, not from state
          })
          // Log
          consoleLogger.info('[AppProvider] Initialized method handler after generation')
          // Catch Error
        } catch (error) {
          // Log
          consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
        }
      }

      // Save app data in localStorage for future hydration
      localStorage.setItem('appId', client.appId.toString())
      localStorage.setItem('appCreator', creator)
      localStorage.setItem('appSpec', JSON.stringify(client.appClient.appSpec))

      // Log
      consoleLogger.info('[AppProvider] Successfully generated new app:', client.appId)

      // Return the app client
      return client
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('[AppProvider] Failed to generate app client:', error)

      // Set init error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setInitErrorMsg(`Failed to generate app: ${errorMessage}`)
      throw error
      // Finally
    } finally {
      // Set loading and initializing flags to false
      setIsLoading(false)
      isInitializingRef.current = false
    }
  }, [activeAddress, appClient, transactionSigner])

  // Effects
  // Handle activeAddress change
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

  // Initialize method handler when appClient is available (fallback)
  useEffect(() => {
    if (appClient && activeAddress && appMethodsRef.current && !appMethodHandlerRef.current) {
      // This is a fallback in case the direct initialization didn't work
      consoleLogger.info('[AppProvider] Initializing method handler via effect (fallback)')
      initializeMethodHandler()
    }
  }, [appClient, activeAddress, initializeMethodHandler])

  const value = {
    appClient,
    appCreator,
    appMethods: appMethodsRef.current,
    appMethodHandler: appMethodHandlerRef.current,
    getAppClient,
    isLoading,
    initError: initErrorMsg,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
