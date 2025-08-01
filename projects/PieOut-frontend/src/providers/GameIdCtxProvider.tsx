//src/providers/GameIdCtxProvider.tsx
import React, { useState } from 'react'
import { GameIdCtx } from '../contexts/GameId'

// Create a Game ID Context Provider that supplies the application's current game id to its children
export const GameIdCtxProvider = ({ children }: { children: React.ReactNode }) => {
  // --- States ---
  const [gameId, setGameId] = useState<bigint | null>(null)

  // Provide the context to child components
  return <GameIdCtx.Provider value={{ gameId, setGameId }}>{children}</GameIdCtx.Provider>
}
