// src/providers/MethodLoadingCtxProvider.tsx
import React, { useState } from 'react'
import { MethodLoadingCtx } from '../contexts/MethodLoading'

// Create a Method Loading Context Provider that denotes if a contract method is loading or not and supplies the data to its children
export const MethodLoadingCtxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMethodLoading, setMethodLoading] = useState(false)

  return <MethodLoadingCtx.Provider value={{ isMethodLoading, setMethodLoading }}>{children}</MethodLoadingCtx.Provider>
}
