import { createContext } from 'react'
import { AppMethodKitContextInterface } from '../interfaces/appMethodKitContext'

export const AppMethodKitContext = createContext<AppMethodKitContextInterface | undefined>(undefined)
