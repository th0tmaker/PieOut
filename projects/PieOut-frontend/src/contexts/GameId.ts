//src/contexts/GameId.ts
import { createContext } from 'react'
import { GameIdCtxProps } from '../types/GameIdCtxProps'

// Create the Game ID Context
export const GameIdCtx = createContext<GameIdCtxProps | undefined>(undefined)
