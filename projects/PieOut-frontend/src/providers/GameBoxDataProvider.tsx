//src/providers/GameBoxDataProvider.tsx
import React, { useState, FC, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePollGameData } from '../hooks/usePollGameBoxData'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { useAppCtx } from '../hooks/useAppCtx'
import { GameBoxDataCtx } from '../contexts/GameBoxData'

// Create Game Box Data Provider that supplies the application box data to its children
export const GameBoxDataProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { activeAddress } = useWallet()
  const { appClient, appMethods } = useAppCtx()
  const { gameId } = useGameIdCtx()

  const [gameTrophyData, setGameTrophyData] = useState<GameTrophy | undefined>(undefined)
  const [gameRegisterData, setGameRegisterData] = useState<GameRegister | undefined>(undefined)
  const [gameStateData, setGameStateData] = useState<GameState | undefined>(undefined)
  const [gamePlayersData, setGamePlayersData] = useState<string[] | undefined>(undefined)

  // Add loading state for game data
  const [isLoadingGameData, setIsLoadingGameData] = useState(false)

  // Reset user-specific data when activeAddress changes
  useEffect(() => {
    // Reset register data since it's user-specific
    setGameRegisterData(undefined)
  }, [activeAddress])

  // Reset all game data when gameId changes and set loading state
  useEffect(() => {
    if (gameId != null) {
      // Set loading state when gameId changes
      setIsLoadingGameData(true)

      // Clear previous game data to prevent showing stale data
      setGameTrophyData(undefined)
      setGameRegisterData(undefined)
      setGameStateData(undefined)
      setGamePlayersData(undefined)
    } else {
      // No gameId selected, clear loading state
      setIsLoadingGameData(false)
    }
  }, [gameId])

  // Get loading state from the polling hook
  const { isLoadingGameData: hookLoadingState } = usePollGameData({
    appClient,
    appMethods,
    gameId,
    activeAddress,
    gameTrophyData,
    setGameTrophyData,
    gameRegisterData,
    setGameRegisterData,
    gameStateData,
    setGameStateData,
    gamePlayersData,
    setGamePlayersData,
    // Pass loading state setters to the hook
    isLoadingGameData,
    setIsLoadingGameData,
  })

  return (
    <GameBoxDataCtx.Provider
      value={{
        gameTrophyData,
        gameRegisterData,
        gameStateData,
        gamePlayersData,
        isLoadingGameData: isLoadingGameData || hookLoadingState, // Combine both loading states
        setIsLoadingGameData, // Add this line
      }}
    >
      {children}
    </GameBoxDataCtx.Provider>
  )
}
