import React, { createContext, useContext, useState, useRef } from 'react'

type BoxCommitRand = {
  gameId: bigint | null
  commitRound: bigint | null
  expiryRound: bigint | null
} | null

type BoxCommitRandContextType = {
  boxCommitRand: BoxCommitRand
  setBoxCommitRand: (entry: BoxCommitRand) => void
  boxCommitRandRef: React.MutableRefObject<BoxCommitRand>
}

const BoxCommitRandContext = createContext<BoxCommitRandContextType | undefined>(undefined)

export const BoxCommitRandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boxCommitRand, _setBoxCommitRand] = useState<BoxCommitRand>(null)
  const boxCommitRandRef = useRef<BoxCommitRand>(null)

  const setBoxCommitRand = (entry: BoxCommitRand) => {
    boxCommitRandRef.current = entry
    _setBoxCommitRand(entry)
  }

  return (
    <BoxCommitRandContext.Provider value={{ boxCommitRand, setBoxCommitRand, boxCommitRandRef }}>{children}</BoxCommitRandContext.Provider>
  )
}

export const useBoxCommitRand = (): BoxCommitRandContextType => {
  const context = useContext(BoxCommitRandContext)
  if (!context) {
    throw new Error('useBoxCommitRand must be used within a BoxCommitRandProvider')
  }
  return context
}
