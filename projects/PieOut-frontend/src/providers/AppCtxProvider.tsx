// src/providers/AppCtxProvider.tsx
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppCtx } from '../contexts/App'
import { PieoutClient } from '../contracts/Pieout'
import { createMethodHandler } from '../methodHandler'
import { PieoutMethods } from '../methods'
import { algorand } from '../utils/network/getAlgorandClient'

// Keys used for persisting app state in local storage
const STORAGE_KEYS = {
  appId: 'appId',
  appCreator: 'appCreator',
  appSpec: 'appSpec',
}

// Create an App Context Provider that supplies the application state data to its children
export const AppCtxProvider: FC<React.PropsWithChildren> = ({ children }) => {
  // Hooks
  const { activeAddress, transactionSigner } = useWallet()

  // States
  const [appCreator, setAppCreator] = useState<string>()
  const [appClient, setAppClient] = useState<PieoutClient>()
  const [isLoading, setIsLoading] = useState(false)

  // Refs
  const appMethodsRef = useRef<PieoutMethods>()
  const appMethodHandlerRef = useRef<ReturnType<typeof createMethodHandler>>()
  const appIsInitializingRef = useRef(false)
  const hasHydratedRef = useRef(false)
  const lastActiveAddressRef = useRef<string | null>(null)
  const hydrationLock = useRef<Promise<boolean> | null>(null)

  // Define a function that clears the application methods, method handler and hydration reference
  function clearInstances() {
    appMethodsRef.current = undefined
    appMethodHandlerRef.current = undefined
    hasHydratedRef.current = false
  }

  // Define a function that ensures the application methods are initialized with a default signer derived from the wallet
  function ensureAppMethods() {
    // If active address or application methods reference is missing, return early
    if (!activeAddress || appMethodsRef.current) return

    // Try block
    try {
      algorand.setDefaultSigner(transactionSigner) // Set the default signer for the instance of the `AlgorandClient`

      // Create a new instance of the application methods class
      appMethodsRef.current = new PieoutMethods(algorand, activeAddress)

      // Log
      // consoleLogger.info('[AppProvider] App methods initialized for:', activeAddress)
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('[AppProvider] Failed to initialize app methods:', error)
    }
  }

  // Define a method that ensures the application method handler is initialized for the given client
  const ensureMethodHandler = useCallback(
    (client: PieoutClient) => {
      // If active address or application methods or application method handler reference is missing, return early
      if (!activeAddress || !appMethodsRef.current || appMethodHandlerRef.current) return

      // Try block
      try {
        // Call the `createMethodHandler` helper function and store as current application method handler reference
        appMethodHandlerRef.current = createMethodHandler({
          activeAddress,
          appMethods: appMethodsRef.current,
          appClient: client, // Pass the app client instance
        })

        // Log
        // consoleLogger.info('[AppProvider] Method handler initialized')
        // Catch error
      } catch (error) {
        // Log
        consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
      }
    },
    [activeAddress],
  )

  // Define a function that hydrates the app state from local storage
  const hydrateFromStorage = useCallback(async () => {
    // If app is currently initializing, return false
    if (appIsInitializingRef.current) return false

    // Lock hydration
    if (hydrationLock.current) return hydrationLock.current

    // Define an async method that returns a promise
    const promise = (async () => {
      // Try block
      try {
        // Retrieve app state items from local storage by key
        const storedAppId = localStorage.getItem(STORAGE_KEYS.appId)
        const storedAppCreator = localStorage.getItem(STORAGE_KEYS.appCreator)
        const storedAppSpec = localStorage.getItem(STORAGE_KEYS.appSpec)

        // Return false if there is no app state found in storage
        if (!storedAppId || !storedAppSpec) {
          consoleLogger.warn('[AppProvider] No stored app data found')
          return false
        }

        consoleLogger.info('[AppProvider] Hydrating app from storage...')

        // Get app client and creator via ID
        // const client = algorand.client.getTypedAppClientById(PieoutClient, { appId: BigInt(storedAppId) })
        const client = algorand.client.getTypedAppClientById(PieoutClient, { appId: 744886519n })
        const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

        // Update app client and app creator states
        setAppClient(client)
        setAppCreator(creator)

        // If there is no value for app creator in local storage, set one
        if (!storedAppCreator) {
          localStorage.setItem(STORAGE_KEYS.appCreator, creator)
        }

        // Call method that ensure method handler for client is initialized
        ensureMethodHandler(client)

        // Set hydration flag after successful hydration
        hasHydratedRef.current = true

        consoleLogger.info('[AppProvider] Hydration successful:', client.appId)
        return true
        // Catch error
      } catch (error) {
        consoleLogger.warn('[AppProvider] Hydration failed, clearing storage:', error)

        // If error exists, remove items from local storage by key
        localStorage.removeItem(STORAGE_KEYS.appId)
        localStorage.removeItem(STORAGE_KEYS.appCreator)
        localStorage.removeItem(STORAGE_KEYS.appSpec)
        return false
      }
    })()

    // Set hydration lock to promise
    hydrationLock.current = promise

    // Return the promise
    return promise.finally(() => {
      hydrationLock.current = null
    })
  }, [ensureMethodHandler])

  // Create a method that generates an instance of the smart contract client
  const getAppClient = useCallback(async (): Promise<PieoutClient> => {
    // If the smart contract application client already exists, return early
    if (appClient) {
      // consoleLogger.info('[AppProvider] App Client already exists')
      return appClient
    }

    // Throw error if no active address if found
    if (!activeAddress) throw new Error('No active wallet address')

    // Set the app is initializing and loading flags to true
    appIsInitializingRef.current = true
    setIsLoading(true)

    // Try Block
    try {
      // call function that ensures an instance of the application methods exist
      ensureAppMethods()

      // If no application methods reference exists, throw error
      if (!appMethodsRef.current) throw new Error('App methods not initialized')

      // consoleLogger.info('[AppProvider] Generating new app...')

      // Get app client and creator via ID
      // const client = await appMethodsRef.current.generate(activeAddress)
      const client = algorand.client.getTypedAppClientById(PieoutClient, { appId: 744886519n })
      const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

      // Update app client and app creator states
      setAppClient(client)
      setAppCreator(creator)

      // Call method that ensure method handler for client is initialized
      ensureMethodHandler(client)

      // Set app state items to local storage by key
      localStorage.setItem(STORAGE_KEYS.appId, client.appId.toString())
      localStorage.setItem(STORAGE_KEYS.appCreator, creator)
      localStorage.setItem(STORAGE_KEYS.appSpec, JSON.stringify(client.appClient.appSpec))

      // Log
      // consoleLogger.info('[AppProvider] New app generated:', client.appId)

      // Return the generated application client
      return client
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('[AppProvider] Failed to generate app client:', error)
      // Throw error if one exists
      throw error
    } finally {
      // Set the app is initializing and loading flags to false
      appIsInitializingRef.current = false
      setIsLoading(false)
    }
  }, [activeAddress, appClient, ensureMethodHandler])

  // New function to initialize app client immediately on load
  const initializeAppClient = useCallback(async () => {
    // If we're already loading or don't have an active address, return
    if (isLoading || !activeAddress) return

    // If we already have an app client, no need to initialize
    if (appClient) return

    try {
      setIsLoading(true)

      // First try to hydrate from storage
      const hydrated = await hydrateFromStorage()

      // If hydration failed, create/get the app client
      if (!hydrated) {
        consoleLogger.info('[AppProvider] Hydration failed, getting app client...')
        await getAppClient()
      }
    } catch (error) {
      consoleLogger.error('[AppProvider] Failed to initialize app client:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, activeAddress, appClient, hydrateFromStorage, getAppClient])

  // Effects
  // Initialize when activeAddress becomes available
  useEffect(() => {
    if (activeAddress && !appClient) {
      consoleLogger.info('[AppProvider] Active address detected, initializing app client...')
      initializeAppClient()
    }
  }, [activeAddress, appClient, initializeAppClient])

  // Define a method that runs application state logic in response to the app client or active address changing
  useEffect(() => {
    // Check if the active address has changed since last render
    if (lastActiveAddressRef.current !== activeAddress) {
      consoleLogger.info('[AppProvider] Address changed from', lastActiveAddressRef.current, 'to', activeAddress)

      // Clear previous state when switching between different addresses
      if (lastActiveAddressRef.current !== null && lastActiveAddressRef.current !== activeAddress) {
        consoleLogger.info('[AppProvider] Clearing previous state for address change')
        clearInstances()
        setAppClient(undefined)
        setAppCreator(undefined)
      }
      // Update the ref to track the new active address
      lastActiveAddressRef.current = activeAddress
    }

    // Initialize wallet-dependent functionality only when connected
    if (activeAddress) {
      // Set up core application methods for the connected wallet
      ensureAppMethods()
      // Configure method handlers if app client is available
      if (appClient) {
        ensureMethodHandler(appClient)
      }
    } else {
      // Clear everything when wallet disconnects
      consoleLogger.info('[AppProvider] No active address, clearing state')
      clearInstances()
      setAppClient(undefined)
      setAppCreator(undefined)
    }
  }, [activeAddress, appClient, ensureMethodHandler])

  // Memoized context value to avoid unnecessary re-renders
  const value = useMemo(
    () => ({
      appClient,
      appCreator,
      appMethods: appMethodsRef.current,
      appMethodHandler: appMethodHandlerRef.current,
      getAppClient,
      isLoading,
    }),
    [appClient, appCreator, getAppClient, isLoading],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
