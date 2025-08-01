import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import deepEqual from 'fast-deep-equal'
import { useCallback, useEffect, useRef } from 'react'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { PollGameDataProps } from '../types/PollGameDataProps'
import { lookupTrophyAssetBalances } from '../utils/network/getAccTrophyBalance'

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

  // Helper to update data only if not equal
  const syncData = <T>(ref: React.MutableRefObject<T | undefined>, newValue: T | undefined, setter: (v: T | undefined) => void) => {
    if (!deepEqual(ref.current, newValue)) {
      ref.current = newValue
      setter(newValue)
    }
  }

  // Helper function to fetch active games
  const getActiveGames = useCallback(async () => {
    if (!appClient || !activeAddress) return
    try {
      const activeGames = await appClient.state.box.boxGameState.getMap()

      // Extract game ID (key) and adminAddress from each GameState
      const gameIdAndAdmin: [bigint, string][] = Array.from(activeGames.entries()).map(([gameId, gameState]) => [
        gameId,
        gameState.adminAddress,
      ])

      syncData(activeGamesRef, gameIdAndAdmin, setActiveGames)
    } catch (error) {
      consoleLogger.error('Error fetching active games:', error)
    }
  }, [appClient, activeAddress, setActiveGames])

  const getTrophyBalance = useCallback(async () => {
    if (!appClient || !gameTrophyData?.assetId) return

    try {
      const { optedIn, holding } = await lookupTrophyAssetBalances(gameTrophyData?.assetId, appClient.algorand.client.indexer)

      syncData(accsWithTrophyBalanceRef, optedIn, setAccsWithTrophyBalance)
      syncData(trophyHolderAddressRef, holding, setTrophyHolderAddress)
    } catch (error) {
      consoleLogger.error('Error fetching trophy asset holders:', error)
    }
  }, [appClient, gameTrophyData?.assetId, setAccsWithTrophyBalance, setTrophyHolderAddress])

  const poll = useCallback(async () => {
    if (!activeAddress || !appClient || !appMethods) return

    try {
      const trophyExists = await appMethods.doesBoxGameTrophyExist(appClient.appId, activeAddress)
      if (trophyExists) {
        const gameTrophyData = await appClient.state.box.boxGameTrophy()
        syncData(gameTrophyRef, gameTrophyData, setGameTrophyData)
      }

      const registerExists = await appMethods.doesBoxGameRegisterExist(appClient.appId, activeAddress, activeAddress)
      if (registerExists) {
        const gameRegisterData = await appClient.state.box.boxGameRegister.value(activeAddress)
        syncData(gameRegisterRef, gameRegisterData, setGameRegisterData)
      }

      if (gameId != null) {
        const stateExists = await appMethods.doesBoxGameStateExist(appClient.appId, activeAddress, gameId)

        if (stateExists) {
          // Fetch both game state and players data in parallel
          const [gameStateData, gamePlayersData] = await Promise.all([
            appClient.state.box.boxGameState.value(gameId),
            appMethods.readBoxGamePlayers(appClient.appId, activeAddress, gameId),
          ])

          syncData(gameStateRef, gameStateData, setGameStateData)
          syncData(gamePlayersRef, Array.isArray(gamePlayersData) ? [...gamePlayersData] : undefined, setGamePlayersData)

          // Clear loading state after successful fetch
          setIsLoadingGameData(false)
        } else {
          // Game doesn't exist, clear loading state
          setIsLoadingGameData(false)
        }
      }
      // NEW: Poll for active games
      await getActiveGames()

      // NEW: Poll for trophy holders (only if we have trophy data)
      if (gameTrophyData?.assetId) {
        await getTrophyBalance()
      }
    } catch (error) {
      consoleLogger.error('Polling game box data error:', error)
      // Clear loading state on error
      setIsLoadingGameData(false)
    }
  }, [
    activeAddress,
    appClient,
    appMethods,
    gameId,
    setGameTrophyData,
    setGameRegisterData,
    setGameStateData,
    setGamePlayersData,
    getActiveGames,
    getTrophyBalance,
    setIsLoadingGameData,
  ])

  // Start polling data
  useEffect(() => {
    if (!activeAddress || !appClient || !pollingInterval) return

    intervalRef.current = setInterval(() => {
      poll()
    }, pollingInterval)

    return () => {
      clearInterval(intervalRef.current!)
      intervalRef.current = null
    }
  }, [poll, activeAddress, appClient, pollingInterval])

  useEffect(() => {
    const getGameRegisterData = async () => {
      if (!activeAddress || !appClient || !appMethods) return

      try {
        const registerExists = await appMethods.doesBoxGameRegisterExist(appClient.appId, activeAddress, activeAddress)
        if (registerExists) {
          const gameRegisterData = await appClient.state.box.boxGameRegister.value(activeAddress)
          syncData(gameRegisterRef, gameRegisterData, setGameRegisterData)
        }
      } catch (error) {
        consoleLogger.error('Error fetching gameRegisterData on wallet change:', error)
      }
    }

    getGameRegisterData()
  }, [activeAddress, appClient, appMethods])

  // Return loading state for external use (though it's also managed by the provider)
  return {
    isLoadingGameData,
  }
}
