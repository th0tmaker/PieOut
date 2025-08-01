//src/contexts/GameData.ts
import { createContext } from 'react'
import { GameDataCtxProps } from '../types/GameDataCtxProps'

// Create the Game Box Data Context
export const GameDataCtx = createContext<GameDataCtxProps | undefined>(undefined)
