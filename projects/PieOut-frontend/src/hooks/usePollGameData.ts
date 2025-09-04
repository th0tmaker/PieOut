import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import deepEqual from 'fast-deep-equal'
import { useCallback, useEffect, useRef } from 'react'
import { GameRegister, GameState, GameTrophy } from '../contracts/Pieout'
import { PollGameDataProps } from '../types/PollGameDataProps'
import { lookupTrophyAssetBalances } from '../utils/network/getAccTrophyBalance'

// Define a custom hook to manage polling game data from the blockchain
export function usePollGameData({
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
  isGameDataLoading: isLoadingGameData,
  setIsGameDataLoading: setIsLoadingGameData,
  activeGames,
  setActiveGames,
  accsWithTrophyBalance,
  setAccsWithTrophyBalance,
  trophyHolderAddress,
  setTrophyHolderAddress,
  pollingInterval = 3000,
}: PollGameDataProps) {
  // Mutable refs to track previous state
  const gameTrophyRef = useRef<GameTrophy | undefined>(gameTrophyData)
  const gameRegisterRef = useRef<GameRegister | undefined>(gameRegisterData)
  const gameStateRef = useRef<GameState | undefined>(gameStateData)
  const gamePlayersRef = useRef<string[] | undefined>(gamePlayersData)

  const activeGamesRef = useRef<[bigint, string][] | undefined>(activeGames)
  const accsWithTrophyBalanceRef = useRef<string[] | undefined>(accsWithTrophyBalance)
  const trophyHolderAddressRef = useRef<string | undefined>(trophyHolderAddress)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update refs when props change
  useEffect(() => {
    gameTrophyRef.current = gameTrophyData
    gameRegisterRef.current = gameRegisterData
    gameStateRef.current = gameStateData
    gamePlayersRef.current = gamePlayersData
    activeGamesRef.current = activeGames
    accsWithTrophyBalanceRef.current = accsWithTrophyBalance
    trophyHolderAddressRef.current = trophyHolderAddress
  }, [gameTrophyData, gameRegisterData, gameStateData, gamePlayersData, activeGames, accsWithTrophyBalance, trophyHolderAddress])

  // Define a helper method to sync data with new values only if new values are not equal to existing data
  const syncData = <T>(refValue: React.MutableRefObject<T | undefined>, newValue: T | undefined, setter: (v: T | undefined) => void) => {
    // Use `deepEqual` module: Check if `ref` aka current value from reference (1st arg) is not deep equal to the `newValue` (2nd arg)
    if (!deepEqual(refValue.current, newValue)) {
      // If it's not deep equal
      refValue.current = newValue // Assign `newValue` to reference current value
      setter(newValue) // Use the setter method to set `newValue`
    }
  }

  // Define a method that gets and updates the current game data
  const getGameData = useCallback(
    async (shouldClearLoadingState = false) => {
      // If `activeAddress` or `appClient` or `appMethods` values do not exist, return early
      if (!activeAddress || !appClient || !appMethods) return

      // Try block
      try {
        // Check if game trophy box data exists by calling the `doesBoxGameTrophyExist` read-only contract method
        const trophyExists = await appMethods.doesBoxGameTrophyExist(appClient.appId, activeAddress)

        // If game trophy box data exist
        if (trophyExists) {
          // Get game trophy box data from the blockchain via API call
          const gameTrophyData = await appClient.state.box.boxGameTrophy()

          // Use `syncData` to update the `gameTrophyData` values
          syncData(gameTrophyRef, gameTrophyData, setGameTrophyData)
        } else {
          // If game trophy box data does not exist, set `gameTrophyData` value to undefined
          setGameTrophyData(undefined)
        }

        // Check if game register box data exists by calling the `doesBoxGameRegisterExist` read-only contract method
        const registerExists = await appMethods.doesBoxGameRegisterExist(appClient.appId, activeAddress, activeAddress)

        // If game register box data exist
        if (registerExists) {
          // Get game register box data from the blockchain via API call
          const gameRegisterData = await appClient.state.box.boxGameRegister.value(activeAddress)

          // Use `syncData` to update the `gameRegisteryData` values
          syncData(gameRegisterRef, gameRegisterData, setGameRegisterData)
        } else {
          // If game register box data does not exist, set `gameRegisterData` value to undefined
          setGameRegisterData(undefined)
        }

        // If gameId is valid
        if (gameId != null) {
          // Check if game state box data exists by calling the `doesBoxGameStateExist` read-only contract method
          const stateExists = await appMethods.doesBoxGameStateExist(appClient.appId, activeAddress, gameId)

          // If game state box data exist
          if (stateExists) {
            // Await two promises
            const [gameStateData, gamePlayersData] = await Promise.all([
              // Get game state box data from the blockchain via API call
              appClient.state.box.boxGameState.value(gameId),
              // Get game players data as an array of addresses (string values) by calling `readBoxGamePlayers` read-only contract method
              appMethods.readBoxGamePlayers(appClient.appId, activeAddress, gameId),
            ])

            // Use `syncData` to update the `gameStateData` and `gamePlayersData` values
            syncData(gameStateRef, gameStateData, setGameStateData)
            syncData(gamePlayersRef, Array.isArray(gamePlayersData) ? [...gamePlayersData] : undefined, setGamePlayersData)

            // If `shouldClearLoadingState`, set is loading game data flag to false
            if (shouldClearLoadingState) {
              setIsLoadingGameData(false)
            }
            // Else, game does not exist
          } else {
            // Set both game state and game playerss data as undefined
            setGameStateData(undefined)
            setGamePlayersData(undefined)

            // If `shouldClearLoadingState`, set is loading game data flag to false
            if (shouldClearLoadingState) {
              setIsLoadingGameData(false)
            }
          }
        }
        // Catch error
      } catch (error) {
        // Log
        consoleLogger.error('Error fetching game data:', error)

        // If `shouldClearLoadingState`, set is loading game data flag to false
        if (shouldClearLoadingState) {
          setIsLoadingGameData(false)
        }
      }
    },
    [
      activeAddress,
      appClient,
      appMethods,
      gameId,
      setGameTrophyData,
      setGameRegisterData,
      setGameStateData,
      setGamePlayersData,
      setIsLoadingGameData,
      syncData,
    ],
  )

  // Define a method that gets all current active games on the application
  const getActiveGames = useCallback(async () => {
    // If `appClient` or `appMethods` values do not exist, return early
    if (!appClient || !activeAddress) return

    // Try block
    try {
      // Get all game state boxes as a map from the blockchain via API call
      const activeGames = await appClient.state.box.boxGameState.getMap()

      // Extract game ID (key) and adminAddress from each GameState
      const gameIdAndAdmin: [bigint, string][] = Array.from(activeGames.entries()).map(([gameId, gameState]) => [
        gameId,
        gameState.adminAddress,
      ])

      // Use `syncData` to update the `activeGames` values
      syncData(activeGamesRef, gameIdAndAdmin, setActiveGames)

      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('Error fetching active games:', error)
    }
  }, [appClient, activeAddress, setActiveGames])

  // Define a method that gets the trophy asset balance
  const getTrophyBalance = useCallback(async () => {
    // If `appClient` or `gameTrophyData.assetId` values do not exist, return early
    if (!appClient || !gameTrophyData?.assetId) return

    // Try Block
    try {
      // Call the `lookupTrophyAssetBalances` self-defined helper method to access data on accounts opted-in to the asset and the holder account
      const { optedIn, holding } = await lookupTrophyAssetBalances(gameTrophyData?.assetId, appClient.algorand.client.indexer)

      // Use `syncData` to update the `accsWithTrophyBalance` and `trophyHolderAddres` values
      syncData(accsWithTrophyBalanceRef, optedIn, setAccsWithTrophyBalance)
      syncData(trophyHolderAddressRef, holding, setTrophyHolderAddress)

      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('Error fetching trophy asset holders:', error)
    }
  }, [appClient, gameTrophyData?.assetId, setAccsWithTrophyBalance, setTrophyHolderAddress])

  // Define a method that manages the game data polling lifecycle
  const poll = useCallback(async () => {
    // If `activeAddress` or `appClient` or `appMethods` values do not exist, return early
    if (!activeAddress || !appClient || !appMethods) return

    // Try block
    try {
      // Call the `getGameData` method
      await getGameData(true)

      // Call the `getActiveGames` method
      await getActiveGames()

      // If game trophy asset ID exists, call the `getTrohpyBalance` method
      if (gameTrophyData?.assetId) {
        await getTrophyBalance()
      }
      // Catch error
    } catch (error) {
      // Log
      consoleLogger.error('Polling game box data error:', error)

      // Set is loading game data flag to false
      setIsLoadingGameData(false)
    }
  }, [activeAddress, appClient, appMethods, getGameData, getActiveGames, getTrophyBalance, gameTrophyData?.assetId, setIsLoadingGameData])

  // Effects
  useEffect(() => {
    // If `activeAddress` or `appClient` or `pollingInterval` values do not exist, return early
    if (!activeAddress || !appClient || !pollingInterval) return

    // Execute the `poll` method at a set interval defined in hook's parameters
    intervalRef.current = setInterval(() => {
      poll()
    }, pollingInterval)

    // Clear interval on return
    return () => {
      clearInterval(intervalRef.current!)
      intervalRef.current = null
    }
  }, [poll, activeAddress, appClient, pollingInterval])

  useEffect(() => {
    // If `activeAddress` or `appClient` or `appMethods` value exists
    if (activeAddress && appClient && appMethods) {
      // Call the `getGameData` method
      getGameData(false) // Don't clear loading state for immediate fetches
    }
  }, [activeAddress, appClient, appMethods, getGameData])

  // Return loading state for external use
  return {
    isLoadingGameData,
  }
}
