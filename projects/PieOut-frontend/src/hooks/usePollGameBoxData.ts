import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import deepEqual from 'fast-deep-equal'
import { useCallback, useEffect, useRef } from 'react'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { PollGameBoxDataProps } from '../types/PollGameBoxDataProps'

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
  isLoadingGameData,
  setIsLoadingGameData,
  pollingInterval = 3000,
}: PollGameBoxDataProps) {
  // Mutable refs to track previous state
  const gameTrophyRef = useRef<GameTrophy | undefined>(gameTrophyData)
  const gameRegisterRef = useRef<GameRegister | undefined>(gameRegisterData)
  const gameStateRef = useRef<GameState | undefined>(gameStateData)
  const gamePlayersRef = useRef<string[] | undefined>(gamePlayersData)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update refs when props change
  useEffect(() => {
    gameTrophyRef.current = gameTrophyData
    gameRegisterRef.current = gameRegisterData
    gameStateRef.current = gameStateData
    gamePlayersRef.current = gamePlayersData
  }, [gameTrophyData, gameRegisterData, gameStateData, gamePlayersData])

  // Helper to update state only if not equal
  const syncState = <T>(ref: React.MutableRefObject<T | undefined>, newValue: T | undefined, setter: (v: T | undefined) => void) => {
    if (!deepEqual(ref.current, newValue)) {
      ref.current = newValue
      setter(newValue)
    }
  }

  const poll = useCallback(async () => {
    if (!activeAddress || !appClient || !appMethods) return

    try {
      const trophyExists = await appMethods.doesBoxGameTrophyExist(appClient.appId, activeAddress)
      if (trophyExists) {
        const gameTrophyData = await appClient.state.box.boxGameTrophy()
        syncState(gameTrophyRef, gameTrophyData, setGameTrophyData)
      }

      const registerExists = await appMethods.doesBoxGameRegisterExist(appClient.appId, activeAddress, activeAddress)
      if (registerExists) {
        const gameRegisterData = await appClient.state.box.boxGameRegister.value(activeAddress)
        syncState(gameRegisterRef, gameRegisterData, setGameRegisterData)
      }

      if (gameId != null) {
        const stateExists = await appMethods.doesBoxGameStateExist(appClient.appId, activeAddress, gameId)

        if (stateExists) {
          // Fetch both game state and players data in parallel
          const [gameStateData, gamePlayersData] = await Promise.all([
            appClient.state.box.boxGameState.value(gameId),
            appMethods.readBoxGamePlayers(appClient.appId, activeAddress, gameId),
          ])

          syncState(gameStateRef, gameStateData, setGameStateData)
          syncState(gamePlayersRef, Array.isArray(gamePlayersData) ? [...gamePlayersData] : undefined, setGamePlayersData)

          // Clear loading state after successful fetch
          setIsLoadingGameData(false)
        } else {
          // Game doesn't exist, clear loading state
          setIsLoadingGameData(false)
        }
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
          syncState(gameRegisterRef, gameRegisterData, setGameRegisterData)
        }
      } catch (error) {
        consoleLogger.error('Error fetching gameRegisterData on wallet change:', error)
      }
    }

    getGameRegisterData()
  }, [activeAddress, appClient, appMethods])

  // useEffect(() => {
  //   const getActiveGames = async () => {
  //     if (!activeAddress || !appClient || !appMethods) return

  //     try {
  //       const activeGames = await appClient.state.box.boxGameState.getMap()

  //       for (const [key, value] of Object.entries(activeGames)) {
  //         consoleLogger.info(key, value);
  //       }
  //         // const gameRegisterData = await appClient.state.box.boxGameRegister.value(activeAddress)
  //         // syncState(gameRegisterRef, gameRegisterData, setGameRegisterData)
  //       }
  //     } catch (error) {
  //       consoleLogger.error('Error fetching gameRegisterData on wallet change:', error)
  //     }
  //   }

  // }, [activeAddress, appClient, appMethods])

  // Return loading state for external use (though it's also managed by the provider)
  return {
    isLoadingGameData,
  }
}
