//src/providers/GameDataCtxProvider.tsx
import React, { useState, FC, useEffect, useMemo, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePollGameData } from '../hooks/usePollGameData'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { useAppCtx } from '../hooks/useAppCtx'
import { GameDataCtx } from '../contexts/GameData'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

// Create a Game Data Context Provider that supplies the application's game data to its children
export const GameDataCtxProvider: FC<React.PropsWithChildren> = ({ children }) => {
  // Hooks
  const { activeAddress } = useWallet()
  const { appClient, appMethods } = useAppCtx()
  const { gameId } = useGameIdCtx()

  // States
  const [gameTrophyData, setGameTrophyData] = useState<GameTrophy | undefined>(undefined)
  const [gameRegisterData, setGameRegisterData] = useState<GameRegister | undefined>(undefined)
  const [gameStateData, setGameStateData] = useState<GameState | undefined>(undefined)
  const [gamePlayersData, setGamePlayersData] = useState<string[] | undefined>(undefined)

  const [activeGames, setActiveGames] = useState<[bigint, string][] | undefined>(undefined)
  const [accsWithTrophyBalance, setAccsWithTrophyBalance] = useState<string[] | undefined>(undefined)
  const [trophyHolderAddress, setTrophyHolderAddress] = useState<string | undefined>(undefined)

  const [userHostedGameId, setUserHostedGameId] = useState<bigint | null>(null)
  const [userHostedGameStateData, setUserHostedGameStateData] = useState<GameState | undefined>(undefined)

  const [isLoadingGameData, setIsLoadingGameData] = useState(false)

  // Define a method that gets and updates the current game state of the user hosted game id
  const getUserHostedGameStateData = useCallback(async () => {
    // If `appClient` or `userHostedGameId` values don't exist
    if (!appClient || !userHostedGameId) {
      // Set the `userHostedGameState` value as undefined
      setUserHostedGameStateData(undefined)
      // Return early
      return
    }

    // Try block
    try {
      // Make an API call to access the game state box data for the `userHostedGameId`
      const userHostedGameStateData = await appClient.state.box.boxGameState.value(userHostedGameId)

      // Update the `userHostedGameStateData` value local state if it exists, else set it as undefined
      setUserHostedGameStateData(userHostedGameStateData ?? undefined)

      // Catch error
    } catch (err) {
      // Log
      consoleLogger.error('Failed to get user hosted game state:', err)

      // If an error is caught, set `userHostedGameStateData` value to undefined
      setUserHostedGameStateData(undefined)
    }
  }, [userHostedGameId, appClient])

  // Effects
  useEffect(() => {
    // If `activeAddress` and `activeGames` exist
    if (activeAddress && activeGames) {
      // Find the game hosted by `activeAddress` by matching the address with the admin address inside `activeGames`
      const userHostedGame = activeGames.find(([, admin]) => admin === activeAddress)
      // Set `userHostedGameId` to be the value at index 0, which is gameId, else it's null
      setUserHostedGameId(userHostedGame?.[0] ?? null)
    } else {
      // Else default to null
      setUserHostedGameId(null)
    }
  }, [activeGames, activeAddress])

  useEffect(() => {
    // If `gameStateData` exists AND `userHostedGameId` exists AND `userHostedGameId` equals `gameId`
    if (gameStateData && userHostedGameId && gameId === userHostedGameId) {
      // Set the current `gameStateData` value as the `userHostedGameStateData` value
      setUserHostedGameStateData(gameStateData)
    } else {
      // Call the getter method that fetches fresh `userHostedGameStateData` value
      getUserHostedGameStateData()
    }
  }, [userHostedGameId, gameId, gameStateData, getUserHostedGameStateData])

  useEffect(() => {
    // Reset register data since it's user-specific
    setGameRegisterData(undefined)
  }, [activeAddress])

  useEffect(() => {
    // If `gameId` is not null, reset all game box data when `gameId` changes and set loading state
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
      userHostedGameId,
      setUserHostedGameId,
      userHostedGameStateData,
      setUserHostedGameStateData,
      getUserHostedGameStateData,
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
      userHostedGameId,
      setUserHostedGameId,
      userHostedGameStateData,
      setUserHostedGameStateData,
    ],
  )

  return <GameDataCtx.Provider value={contextValue}>{children}</GameDataCtx.Provider>
}
