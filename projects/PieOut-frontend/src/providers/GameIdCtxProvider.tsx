// src/providers/GameIdCtxProvider.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useState } from 'react'
import { GameIdCtx } from '../contexts/GameId'

// Create a Game ID Context Provider that supplies the global game id value to its children
export const GameIdCtxProvider = ({ children }: { children: React.ReactNode }) => {
  // Hooks
  const { activeAddress } = useWallet()

  // States
  const [gameId, setGameId] = useState<bigint | null>(null)

  // Effects
  useEffect(() => {
    // If no `activeAddress` exists
    if (!activeAddress) {
      setGameId(null) // Set `gameId` to null
      localStorage.removeItem('gameId') // Remove `gameId` value from local storage
      return
    }
    // If `gameId` is equal to null
    if (gameId === null) {
      // Get `gameId` value from local storage
      const localStorageGameId = localStorage.getItem('gameId')
      // If a value exists, assign it as the new `gameId` global value
      if (localStorageGameId) setGameId(BigInt(localStorageGameId))
      // If `gameId` is not equal to null
    } else {
      // Set that `gameId` value as the local storage value
      localStorage.setItem('gameId', gameId.toString())
    }
  }, [activeAddress, gameId])

  return <GameIdCtx.Provider value={{ gameId, setGameId }}>{children}</GameIdCtx.Provider>
}
