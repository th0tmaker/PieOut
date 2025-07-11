import { useContext } from 'react'
import { AppClientContext } from '../contexts/AppClient'
import { AppClientContextInterface } from '../interfaces/appClientContext'

export const useAppClient = (): AppClientContextInterface => {
  const context = useContext(AppClientContext)
  if (!context) {
    throw new Error('useAppClient must be used within AppClientProvider')
  }
  return context
}
