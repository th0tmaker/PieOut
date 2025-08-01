//src/providers/GameDataCtxProvider.tsx
import React, { useState, FC, useEffect, useMemo } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePollGameData } from '../hooks/usePollGameData'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { useAppCtx } from '../hooks/useAppCtx'
import { GameDataCtx } from '../contexts/GameData'

// Create a Game Data Context Provider that supplies the application's game data to its children
export const GameDataCtxProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { activeAddress } = useWallet()
  const { appClient, appMethods } = useAppCtx()
  const { gameId } = useGameIdCtx()

  const [gameTrophyData, setGameTrophyData] = useState<GameTrophy | undefined>(undefined)
  const [gameRegisterData, setGameRegisterData] = useState<GameRegister | undefined>(undefined)
  const [gameStateData, setGameStateData] = useState<GameState | undefined>(undefined)
  const [gamePlayersData, setGamePlayersData] = useState<string[] | undefined>(undefined)

  // New state for active games and trophy holders
  const [activeGames, setActiveGames] = useState<[bigint, string][] | undefined>(undefined)
  const [accsWithTrophyBalance, setAccsWithTrophyBalance] = useState<string[] | undefined>(undefined)
  const [trophyHolderAddress, setTrophyHolderAddress] = useState<string | undefined>(undefined)

  // Add loading state for game data
  const [isLoadingGameData, setIsLoadingGameData] = useState(false)

  // Reset user-specific data when activeAddress changes
  useEffect(() => {
    // Reset register data since it's user-specific
    setGameRegisterData(undefined)
  }, [activeAddress])

  // Reset all game box data when gameId changes and set loading state
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
    activeGames,
    setActiveGames,
    accsWithTrophyBalance,
    setAccsWithTrophyBalance,
    trophyHolderAddress,
    setTrophyHolderAddress,
    isGameDataLoading: isLoadingGameData,
    setIsGameDataLoading: setIsLoadingGameData,
  })

  // Memoize the context value so it only changes when its dependencies change
  const contextValue = useMemo(
    () => ({
      gameTrophyData,
      setGameTrophyData,
      gameRegisterData,
      setGameRegisterData,
      gameStateData,
      setGameStateData,
      gamePlayersData,
      setGamePlayersData,
      activeGames,
      setActiveGames,
      accsWithTrophyBalance,
      setAccsWithTrophyBalance,
      trophyHolderAddress,
      setTrophyHolderAddress,
      isGameDataLoading: hookLoadingState,
      setIsGameDataLoading: setIsLoadingGameData,
    }),
    [
      gameTrophyData,
      setGameTrophyData,
      gameRegisterData,
      setGameRegisterData,
      gameStateData,
      setGameStateData,
      gamePlayersData,
      setGamePlayersData,
      activeGames,
      setActiveGames,
      accsWithTrophyBalance,
      setAccsWithTrophyBalance,
      trophyHolderAddress,
      setTrophyHolderAddress,
      hookLoadingState,
      setIsLoadingGameData,
    ],
  )

  return <GameDataCtx.Provider value={contextValue}>{children}</GameDataCtx.Provider>
}
