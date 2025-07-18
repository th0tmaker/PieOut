//src/contexts/GameBoxData.ts
import { createContext } from 'react'
import { GameBoxDataCtxProps } from '../types/GameBoxDataCtxProps'

// Create the Game Box Data Context
export const GameBoxDataCtx = createContext<GameBoxDataCtxProps | undefined>(undefined)
