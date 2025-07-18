//src/contexts/App.ts
import { createContext } from 'react'
import { AppCtxProps } from '../types/AppCtxProps'

// Create the App Context
export const AppCtx = createContext<AppCtxProps | undefined>(undefined)
