// src/providers/AppCtxProvider.tsx
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppCtx } from '../contexts/App'
import { PieoutClient } from '../contracts/Pieout'
import { createMethodHandler } from '../methodHandler'
import { PieoutMethods } from '../methods'
import { algorand } from '../utils/network/getAlgorandClient'

const STORAGE_KEYS = {
  appId: 'appId',
  appCreator: 'appCreator',
  appSpec: 'appSpec',
}

export const AppCtxProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { activeAddress, transactionSigner } = useWallet()

  const [appCreator, setAppCreator] = useState<string>()
  const [appClient, setAppClient] = useState<PieoutClient>()
  const [isLoading, setIsLoading] = useState(true)

  const appMethodsRef = useRef<PieoutMethods>()
  const appMethodHandlerRef = useRef<ReturnType<typeof createMethodHandler>>()
  const isInitializingRef = useRef(false)
  const hasHydratedRef = useRef(false)
  const lastActiveAddressRef = useRef<string | null>(null)
  const hydrationLock = useRef<Promise<boolean> | null>(null)

  /** Clears app-related refs and state */
  function clearInstances() {
    appMethodsRef.current = undefined
    appMethodHandlerRef.current = undefined
    hasHydratedRef.current = false
  }

  /** Initialize PieoutMethods if not present */
  function ensureAppMethods() {
    if (!activeAddress || appMethodsRef.current) return
    try {
      algorand.setDefaultSigner(transactionSigner)
      appMethodsRef.current = new PieoutMethods(algorand, activeAddress)
      consoleLogger.info('[AppProvider] App methods initialized for:', activeAddress)
    } catch (error) {
      consoleLogger.error('[AppProvider] Failed to initialize app methods:', error)
    }
  }

  /** Initialize method handler for given client */
  const ensureMethodHandler = useCallback(
    (client: PieoutClient) => {
      if (!activeAddress || !appMethodsRef.current || appMethodHandlerRef.current) return
      try {
        appMethodHandlerRef.current = createMethodHandler({
          activeAddress,
          appMethods: appMethodsRef.current,
          appClient: client,
        })
        consoleLogger.info('[AppProvider] Method handler initialized')
      } catch (error) {
        consoleLogger.error('[AppProvider] Failed to initialize method handler:', error)
      }
    },
    [activeAddress],
  )

  /** Hydrate app client from localStorage (with lock to prevent overlaps) */
  const hydrateFromStorage = useCallback(async () => {
    if (!activeAddress || hasHydratedRef.current || isInitializingRef.current) return false
    if (hydrationLock.current) return hydrationLock.current

    const promise = (async () => {
      hasHydratedRef.current = true
      setIsLoading(true)

      try {
        const storedAppId = localStorage.getItem(STORAGE_KEYS.appId)
        const storedAppCreator = localStorage.getItem(STORAGE_KEYS.appCreator)
        const storedAppSpec = localStorage.getItem(STORAGE_KEYS.appSpec)

        if (!storedAppId || !storedAppSpec) {
          consoleLogger.warn('[AppProvider] No stored app data found')
          return false
        }

        consoleLogger.info('[AppProvider] Hydrating app from storage...')

        const client = algorand.client.getTypedAppClientById(PieoutClient, { appId: BigInt(storedAppId) })

        const creator = (await client.algorand.app.getById(client.appId)).creator.toString()
        setAppClient(client)
        setAppCreator(creator)

        if (!storedAppCreator) {
          localStorage.setItem(STORAGE_KEYS.appCreator, creator)
        }

        ensureMethodHandler(client)
        consoleLogger.info('[AppProvider] Hydration successful:', client.appId)
        return true
      } catch (error) {
        // consoleLogger.warn('[AppProvider] Hydration failed, clearing storage:', error)
        localStorage.removeItem(STORAGE_KEYS.appId)
        localStorage.removeItem(STORAGE_KEYS.appCreator)
        localStorage.removeItem(STORAGE_KEYS.appSpec)
        return false
      } finally {
        setIsLoading(false)
      }
    })()

    hydrationLock.current = promise
    return promise.finally(() => {
      hydrationLock.current = null
    })
  }, [activeAddress, ensureMethodHandler])

  /** Generate a new app client */
  const getAppClient = useCallback(async (): Promise<PieoutClient> => {
    if (appClient) {
      consoleLogger.info('[AppProvider] App Client already exists')
      return appClient
    }
    if (!activeAddress) throw new Error('No active wallet address')

    isInitializingRef.current = true
    setIsLoading(true)

    try {
      ensureAppMethods()
      if (!appMethodsRef.current) throw new Error('App methods not initialized')

      consoleLogger.info('[AppProvider] Generating new app...')
      const client = await appMethodsRef.current.generate(activeAddress)
      const creator = (await client.algorand.app.getById(client.appId)).creator.toString()

      setAppClient(client)
      setAppCreator(creator)
      ensureMethodHandler(client)

      localStorage.setItem(STORAGE_KEYS.appId, client.appId.toString())
      localStorage.setItem(STORAGE_KEYS.appCreator, creator)
      localStorage.setItem(STORAGE_KEYS.appSpec, JSON.stringify(client.appClient.appSpec))

      consoleLogger.info('[AppProvider] New app generated:', client.appId)
      return client
    } catch (error) {
      consoleLogger.error('[AppProvider] Failed to generate app client:', error)
      throw error
    } finally {
      setIsLoading(false)
      isInitializingRef.current = false
    }
  }, [activeAddress, appClient, ensureMethodHandler])

  /** React to wallet address change */
  useEffect(() => {
    const runInit = async () => {
      if (lastActiveAddressRef.current !== activeAddress) {
        if (lastActiveAddressRef.current !== undefined) {
          consoleLogger.info('[AppProvider] Active address changed, clearing state')
          clearInstances()
        }
        lastActiveAddressRef.current = activeAddress
      }

      if (!activeAddress) {
        setIsLoading(false)
        return
      }

      ensureAppMethods()
      await hydrateFromStorage()
    }

    runInit()
  }, [activeAddress, hydrateFromStorage])

  /** Memoized context value to avoid unnecessary re-renders */
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
