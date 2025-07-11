import { createContext } from 'react'
import { BoxCommitRandDataContextInterface } from '../interfaces/boxCommitRandDataContext'

export const BoxCommitRandDataContext = createContext<BoxCommitRandDataContextInterface | undefined>(undefined)
