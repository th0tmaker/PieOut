//src/providers/GameIdProvider.tsx
import React, { useState } from 'react'
import { GameIdCtx } from '../contexts/GameId'

// Create Game ID provider that supplies the game id currently in use
export const GameIdProvider = ({ children }: { children: React.ReactNode }) => {
  // --- States ---
  const [gameId, setGameId] = useState<bigint | null>(null)

  // Provide the context to child components
  return <GameIdCtx.Provider value={{ gameId, setGameId }}>{children}</GameIdCtx.Provider>
}
