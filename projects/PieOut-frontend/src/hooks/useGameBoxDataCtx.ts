//src/hooks/GameBoxDataCtx.ts
import { useContext } from 'react'
import { GameBoxDataCtx } from '../contexts/GameBoxData'
import { GameBoxDataCtxProps } from '../types/GameBoxDataCtxProps'

// Create hook that uses the Game Box Data Context
export const useGameBoxDataCtx = (): GameBoxDataCtxProps => {
  const ctx = useContext(GameBoxDataCtx)
  if (!ctx) {
    throw new Error('useGameBoxData must be used within a GameBoxDataProvider')
  }
  return ctx
}
