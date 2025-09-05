//src/hooks/useGameIdCtx.ts
import { useContext } from 'react'
import { GameIdCtx } from '../contexts/GameId'

// Create a hook that uses the Game ID Context
export const useGameIdCtx = () => {
  const ctx = useContext(GameIdCtx)
  if (!ctx) throw new Error('useGameIdCtx must be used within a GameIdProvider')
  return ctx
}
