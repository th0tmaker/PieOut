import { useContext } from 'react'
import { BoxCommitRandDataContext } from '../contexts/BoxCommitRandData'
import { BoxCommitRandDataContextInterface } from '../interfaces/boxCommitRandDataContext'

export const useBoxCommitRandData = (): BoxCommitRandDataContextInterface => {
  const context = useContext(BoxCommitRandDataContext)
  if (!context) {
    throw new Error('useBoxCommitRand must be used within a BoxCommitRandProvider')
  }
  return context
}
