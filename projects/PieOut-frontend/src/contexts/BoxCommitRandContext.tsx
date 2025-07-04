import React, { createContext, useContext, useState, useRef, useMemo, MutableRefObject } from 'react'

export type BoxCommitRand = {
  gameId: bigint | null
  commitRound: bigint | null
  expiryRound: bigint | null
} | null

type BoxCommitRandContextType = {
  boxCommitRand: BoxCommitRand
  setBoxCommitRand: (entry: BoxCommitRand) => void
  boxCommitRandRef: MutableRefObject<BoxCommitRand>
}

const BoxCommitRandContext = createContext<BoxCommitRandContextType | undefined>(undefined)

export const BoxCommitRandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boxCommitRand, setBoxCommitRand] = useState<BoxCommitRand>(null)
  const boxCommitRandRef = useRef<BoxCommitRand>(null)

  const handleSetBoxCommitRand = (entry: BoxCommitRand) => {
    boxCommitRandRef.current = entry
    setBoxCommitRand(entry)
  }

  // memoize to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      boxCommitRand,
      setBoxCommitRand: handleSetBoxCommitRand,
      boxCommitRandRef,
    }),
    [boxCommitRand], // only changes when boxCommitRand changes
  )

  return <BoxCommitRandContext.Provider value={value}>{children}</BoxCommitRandContext.Provider>
}

export const useBoxCommitRand = (): BoxCommitRandContextType => {
  const context = useContext(BoxCommitRandContext)
  if (!context) {
    throw new Error('useBoxCommitRand must be used within a BoxCommitRandProvider')
  }
  return context
}
