//src/providers/AppProvider.tsx
import React, { useState, useCallback, useEffect, useRef, FC, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { PieoutClient } from '../contracts/Pieout'
import { AppClient } from '@algorandfoundation/algokit-utils/types/app-client'
import { Arc56Contract } from '@algorandfoundation/algokit-utils/types/app-arc56'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { algorand } from '../utils/network/getAlgorandClient'
import { PieoutMethods } from '../methods'
import { PieoutMethodHandler } from '../methodHandler'
import { AppCtx } from '../contexts/App'

// Create App provider that initializes and supplies the application creator, client, methods and method handler its children
export const AppProvider: FC<React.PropsWithChildren> = ({ children }) => {
  // --- States ---
  const [appCreator, setAppCreator] = useState<string | undefined>(undefined)
  const [appClient, setAppClient] = useState<PieoutClient | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  // --- Wallet ---
  const { activeAddress, transactionSigner } = useWallet()
  algorand.setDefaultSigner(transactionSigner)

  // // useEffect: Set default signer only when transactionSigner changes
  // useEffect(() => {
  //   algorand.setDefaultSigner(transactionSigner)
  // }, [transactionSigner])

  // --- Refs ---
  const isHydrating = useRef(false)
  const isInitializing = useRef(false)

  // --- Memos ---
  // useMemo: Memoize application methods
  const appMethods = useMemo(() => {
    if (!activeAddress) return undefined
    return new PieoutMethods(algorand, activeAddress)
  }, [activeAddress])

  // useMemo: Memoize application method handler
  const appMethodHandler = useMemo(() => {
    if (!activeAddress || !appMethods || !appClient) return undefined
    return new PieoutMethodHandler({
      activeAddress,
      appMethods,
      appClient,
    })
  }, [activeAddress, appMethods, appClient])

  // --- Hydration ---
  // useEffect: Hydrate app data from localStorage on mount
  useEffect(() => {
    const hydrateFromStorage = async () => {
      // If app client exists, or is hydrating, return
      if (appClient || isHydrating.current) {
        consoleLogger.info('No need to hydrate App.')
        setIsLoading(false)
        return
      }

      isHydrating.current = true
      setIsLoading(true)

      // Try Block
      try {
        // Get application data item from localStorage
        const storedAppId = localStorage.getItem('appId')
        const storedAppCreator = localStorage.getItem('appCreator')
        const storedAppSpec = localStorage.getItem('appSpec')

        // If stored application data exists
        if (storedAppId && appCreator && storedAppSpec) {
          // Parse the appSpec string into an Arc56Contract object
          // const parsedAppSpec: Arc56Contract = JSON.parse(storedAppSpec)

          // Create a new application client
          const newAppClient = new AppClient({
            appId: BigInt(storedAppId), // Pass appId (cast from string to bigint)
            appSpec: storedAppSpec, // Pass appSpec
            algorand, // Pass the AlgorandClient
          })
          const client = new PieoutClient(newAppClient)

          // Access creator address from the application info
          const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

          // Set app client and app creator states
          setAppClient(client)
          setAppCreator(creator)

          // Store app creator address into localStorage if empty
          if (!storedAppCreator) {
            localStorage.setItem('appCreator', creator)
          }
          // Log
          consoleLogger.info('[AppProvider] Hydrated app from storage:', client.appId)
        }
        // Catch error
      } catch (err) {
        // Warn that hydration failed and remove items from localStorage
        consoleLogger.warn('[AppProvider] Failed hydration, clearing storage:', err)
        localStorage.removeItem('appId')
        localStorage.removeItem('appCreator')
        localStorage.removeItem('appSpec')
      } finally {
        setIsLoading(false)
        isHydrating.current = false
      }
    }

    // Run hydrateFromStorage
    hydrateFromStorage()
  }, []) // No appClient dependency to avoid loops

  // // --
  // // useEffect: Hydrate app data from localStorage on mount
  // useEffect(() => {
  //   if (!activeAddress) {
  //     setAppClient(undefined)
  //     setAppCreator(undefined)
  //     isInitializing.current = false
  //   }
  // }, [activeAddress])

  // useCallback to memoize getAppClient and avoid recreating on each render
  const getAppClient = useCallback(async (): Promise<PieoutClient> => {
    // Return cached client if it already exists
    if (appClient) return appClient

    // Throw error if required dependencies are missing
    if (!activeAddress || !appMethods) {
      throw new Error('Missing activeAddress or appMethods')
    }

    // Wait if another initialization is already in progress
    if (isInitializing.current) {
      return new Promise((resolve, reject) => {
        const checkInitialization = () => {
          if (!isInitializing.current) {
            if (appClient) {
              resolve(appClient)
            } else {
              reject(new Error('Initialization failed'))
            }
          } else {
            setTimeout(checkInitialization, 100)
          }
        }
        checkInitialization()
      })
    }

    // Begin init
    isInitializing.current = true
    setIsLoading(true)

    // Try block
    try {
      // call generateApp from the appMethods object to create a new smart contract client
      const client = await appMethods.generateApp(activeAddress)
      // Access creator address from the application info
      const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

      // Set app client and app creator states
      setAppClient(client)
      setAppCreator(creator)

      // Set application data item in localStorage (can only use string as value)
      localStorage.setItem('appId', client.appId.toString())
      localStorage.setItem('appCreator', creator)
      localStorage.setItem('appSpec', JSON.stringify(client.appClient.appSpec))

      // Log
      consoleLogger.info('[AppProvider] Successfully generated app client:', client.appId)

      // Return the app client
      return client
      // Catch error
    } catch (err) {
      // Console log and throw error if application client did not generate successfully
      consoleLogger.error('[AppProvider] Failed to generate client:', err)
      throw new Error('Failed to create app client')
    } finally {
      setIsLoading(false)
      isInitializing.current = false
    }
  }, [activeAddress, appMethods, appClient])

  // Memoize value to avoid unnecessary re-renders
  const value = useMemo(
    () => ({
      appClient,
      appCreator,
      appMethods,
      appMethodHandler,
      getAppClient,
      isLoading,
    }),
    [appClient, appCreator, appMethods, appMethodHandler, getAppClient, isLoading],
  )
  // Provide the context to child components
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
