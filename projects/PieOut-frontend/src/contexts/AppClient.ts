import { createContext } from 'react'
import { AppClientContextInterface } from '../interfaces/appClientContext'

export const AppClientContext = createContext<AppClientContextInterface | undefined>(undefined)
