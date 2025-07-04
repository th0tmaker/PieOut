//src/contexts/AppClientContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react'
import { PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

// Define an interface for the application client context
interface AppClientContextType {
  appClient: PieoutClient | null // Stores the application client instance for interacting with the app
  appCreator: string | null // Stores the address of the app creator
  getAppClient: () => Promise<void> // Function to initialize and return the created application client
}

// Create React Context with the defined type, initial value undefined
const AppClientContext = createContext<AppClientContextType | undefined>(undefined)

// Context Provider component that wraps children and provides the app client context
export const AppClientProvider: React.FC<{
  children: React.ReactNode // React children components to render inside the provider
  activeAddress: string | undefined // The current connected wallet address
  appMethods: PieoutMethods | undefined // Methods object that contains functions to interact with the smart contract
}> = ({ children, activeAddress, appMethods }) => {
  // States
  const [appClient, setAppClient] = useState<PieoutClient | null>(null) // Hold app client instance (or null)
  const [appCreator, setAppCreator] = useState<string | null>(null) // Hold app creator instance (or null)

  // Memoized function to create and set up the app client
  const getAppClient = useCallback(async () => {
    // Guard clause: If no active wallet address, no appMethods, or appClient already exists, return
    if (!activeAddress || !appMethods || appClient) return
    // Handle try block
    try {
      // Call the 'generateApp' smart contract method and await its promise
      const client = await appMethods.generateApp(activeAddress)
      setAppClient(client) // Set returned client instance to its corresponding state

      // Query app information (by its ID) to retrieve the creator address
      const info = await client.algorand.app.getById(client.appId)
      setAppCreator(info.creator.toString()) // Set app creator address value to its corresponding state

      // Handle catch error block
    } catch (err) {
      consoleLogger.error('[AppClientProvider] Failed to generate and initialize app client:', err)
      alert('Failed to create app.')
    }
  }, [activeAddress, appMethods, appClient]) // Dependencies of useCallback hook

  // Provide context value (appClient, appCreator, and getAppClient) to all children wrapped in this provider
  return <AppClientContext.Provider value={{ appClient, appCreator, getAppClient }}>{children}</AppClientContext.Provider>
}

// Custom hook to consume AppClientContext values in any child component
export const useAppClient = (): AppClientContextType => {
  const context = useContext(AppClientContext)
  // Ensure that this hook is used only inside a provider
  if (!context) throw new Error('useAppClient must be used within AppClientProvider')
  return context
}
