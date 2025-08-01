//src/hooks/GameDataCtx.ts
import { useContext } from 'react'
import { GameDataCtx } from '../contexts/GameData'
import { GameDataCtxProps } from '../types/GameDataCtxProps'

// Create hook that uses the Game Box Data Context
export const useGameDataCtx = (): GameDataCtxProps => {
  const ctx = useContext(GameDataCtx)
  if (!ctx) {
    throw new Error('useGameData must be used within a GameDataCtxProvider')
  }
  return ctx
}
