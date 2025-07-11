//src/providers/BoxCommitRandDataProvider.tsx
import React, { useState, useRef, useMemo, useCallback } from 'react'
import { BoxCommitRandDataType } from '../types/boxCommitRandDataType'
import { BoxCommitRandDataContext } from '../contexts/BoxCommitRandData'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

// Helper functions to handle BigInt serialization
const serializeBigInt = (data: BoxCommitRandDataType): string => {
  if (!data) return JSON.stringify(data)

  return JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') {
      return { __type: 'bigint', value: value.toString() }
    }
    return value
  })
}

// const deserializeBigInt = (jsonString: string): BoxCommitRandDataType => {
//   return JSON.parse(jsonString, (_, value) => {
//     if (value && typeof value === 'object' && value.__type === 'bigint') {
//       return BigInt(value.value)
//     }
//     return value
//   })
// }

export const BoxCommitRandDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boxCommitRandData, setBoxCommitRandData] = useState<BoxCommitRandDataType>(null)
  const boxCommitRandRef = useRef<BoxCommitRandDataType>(null)
  // const [isLoading, setIsLoading] = useState(true)
  // const hasHydrated = useRef(false)

  // Hydrate from storage only if boxCommitRandData doesn't exist yet
  // useEffect(() => {
  //   const hydrateFromStorage = async () => {
  //     if (boxCommitRandData || hasHydrated.current) {
  //       setIsLoading(false)
  //       return
  //     }
  //     hasHydrated.current = true
  //     const storedBoxCommitRandData = localStorage.getItem('boxCommitRandData')
  //     if (storedBoxCommitRandData) {
  //       try {
  //         const parsedData: BoxCommitRandDataType = deserializeBigInt(storedBoxCommitRandData)
  //         setBoxCommitRandData(parsedData)
  //         boxCommitRandRef.current = parsedData
  //         consoleLogger.info('[BoxCommitRandDataProvider] Successfully hydrated boxCommitRandData from storage')
  //       } catch (err) {
  //         consoleLogger.warn('[BoxCommitRandDataProvider] Failed to hydrate boxCommitRandData from storage, clearing cache:', err)
  //         // Clean up invalid storage data
  //         localStorage.removeItem('boxCommitRandData')
  //       }
  //     }
  //     setIsLoading(false)
  //   }
  //   hydrateFromStorage()
  // }, [boxCommitRandData])

  const handleSetBoxCommitRand = useCallback((entry: BoxCommitRandDataType) => {
    boxCommitRandRef.current = entry
    setBoxCommitRandData(entry)
    // Persist to storage
    if (entry) {
      try {
        const serializedData = serializeBigInt(entry)
        localStorage.setItem('boxCommitRandData', serializedData)
      } catch (err) {
        consoleLogger.error('[BoxCommitRandDataProvider] Failed to serialize boxCommitRandData:', err)
      }
    } else {
      localStorage.removeItem('boxCommitRandData')
    }
  }, [])

  const getBoxCommitRandData = useCallback((): BoxCommitRandDataType => {
    return boxCommitRandData
  }, [boxCommitRandData])

  // memoize to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      boxCommitRandData,
      setBoxCommitRandData: handleSetBoxCommitRand,
      getBoxCommitRandData,
      boxCommitRandRef,
      // isLoading,
    }),
    [boxCommitRandData, handleSetBoxCommitRand, getBoxCommitRandData],
  )

  return <BoxCommitRandDataContext.Provider value={value}>{children}</BoxCommitRandDataContext.Provider>
}
