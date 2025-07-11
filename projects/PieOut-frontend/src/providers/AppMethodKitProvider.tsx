import React, { useState, useEffect, useMemo, useRef } from 'react'
import { PieoutMethods } from '../methods'
import { PieoutMethodHandler } from '../pieoutMethodHandler'
import { AppMethodKitContext } from '../contexts/AppMethodKit'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import { algorand } from '../utils/network/getAlgorandClient'
import { useAppClient } from '../hooks/useAppClient'
import { useBoxCommitRandData } from '../hooks/useBoxCommitRandData'

export const AppMethodKitProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [handler, setHandler] = useState<PieoutMethodHandler | null>(null)
  const [methods, setMethods] = useState<PieoutMethods | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasHydrated = useRef(false)

  const { activeAddress } = useWallet()
  const { appClient } = useAppClient()
  const { setBoxCommitRandData } = useBoxCommitRandData()

  // Hydrate from storage only once
  useEffect(() => {
    const hydrateFromStorage = async () => {
      if ((handler && methods) || hasHydrated.current) {
        setIsLoading(false)
        return
      }
      hasHydrated.current = true

      if (!activeAddress || !appClient || !setBoxCommitRandData) {
        setIsLoading(false)
        return
      }

      try {
        // Create methods instance
        const methodsInstance = new PieoutMethods(algorand, activeAddress)

        // Create handler instance
        const handlerInstance = new PieoutMethodHandler({
          activeAddress,
          appMethods: methodsInstance,
          appClient,
          setBoxCommitRandData,
        })

        setMethods(methodsInstance)
        setHandler(handlerInstance)

        consoleLogger.info('[AppMethodKitProvider] Successfully hydrated method kit')
      } catch (error) {
        consoleLogger.error('[AppMethodKitProvider] Failed to hydrate method kit:', error)
        setHandler(null)
        setMethods(null)
      }

      setIsLoading(false)
    }

    hydrateFromStorage()
  }, [activeAddress, appClient, setBoxCommitRandData, handler, methods])

  // Reset when activeAddress changes
  useEffect(() => {
    if (hasHydrated.current) {
      setHandler(null)
      setMethods(null)
      setIsLoading(true)
      hasHydrated.current = false
    }
  }, [activeAddress])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      handler,
      methods,
      isLoading,
    }),
    [handler, methods, isLoading],
  )

  return <AppMethodKitContext.Provider value={contextValue}>{children}</AppMethodKitContext.Provider>
}
