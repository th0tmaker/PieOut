// src/providers/GameIdCtxProvider.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useState } from 'react'
import { GameIdCtx } from '../contexts/GameId'

export const GameIdCtxProvider = ({ children }: { children: React.ReactNode }) => {
  const { activeAddress } = useWallet()
  const [gameId, setGameId] = useState<bigint | null>(null)

  useEffect(() => {
    if (!activeAddress) {
      setGameId(null)
      localStorage.removeItem('gameId')
      return
    }
    if (gameId === null) {
      const localStorageGameId = localStorage.getItem('gameId')
      if (localStorageGameId) setGameId(BigInt(localStorageGameId))
    } else {
      localStorage.setItem('gameId', gameId.toString())
    }
  }, [activeAddress, gameId])

  return <GameIdCtx.Provider value={{ gameId, setGameId }}>{children}</GameIdCtx.Provider>
}
