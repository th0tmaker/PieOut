import { useContext } from 'react'
import { AppMethodKitContext } from '../contexts/AppMethodKit'
import { AppMethodKitContextInterface } from '../interfaces/appMethodKitContext'

export const useAppMethodKit = (): AppMethodKitContextInterface => {
  const context = useContext(AppMethodKitContext)
  if (!context) {
    throw new Error('useAppMethodKit must be used within AppClientProvider')
  }
  return context
}
