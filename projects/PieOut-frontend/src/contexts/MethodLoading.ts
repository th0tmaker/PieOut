// src/contexts/MethodLoading.tsx
import { createContext } from 'react'
import { MethodLoadingCtxProps } from '../types/MethodLoadingCtxProps'

// Create the Method Loading Context
export const MethodLoadingCtx = createContext<MethodLoadingCtxProps | undefined>(undefined)
