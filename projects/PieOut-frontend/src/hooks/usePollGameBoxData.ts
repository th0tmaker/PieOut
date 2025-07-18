import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import deepEqual from 'fast-deep-equal'
import { useCallback, useEffect, useRef } from 'react'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { PollGameBoxDataProps } from '../types/PollGameBoxDataProps'
import { maybe } from '../utils/helpers/maybe'

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
  isAbleToPollTrophyData,
  isAbleToPollRegisterData,
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
      // Poll Trophy Data
      if (isAbleToPollTrophyData) {
        const trophyData = await maybe(appClient.state.box.boxGameTrophy())
        syncState(gameTrophyRef, trophyData, setGameTrophyData)
      }

      // Poll Register Data
      if (isAbleToPollRegisterData) {
        const registerData = await maybe(appClient.state.box.boxGameRegister.value(activeAddress))
        syncState(gameRegisterRef, registerData, setGameRegisterData)
      }

      // Poll Game State and Players Data
      if (gameId != null) {
        const [stateData, playersData] = await Promise.all([
          maybe(appClient.state.box.boxGameState.value(gameId)),
          maybe(appMethods.readBoxGamePlayers(appClient.appId, activeAddress, gameId)),
        ])

        syncState(gameStateRef, stateData, setGameStateData)
        syncState(gamePlayersRef, Array.isArray(playersData) ? [...playersData] : undefined, setGamePlayersData)
      }
    } catch (error) {
      consoleLogger.error('Polling fatal error:', error)
    }
  }, [
    activeAddress,
    appClient,
    appMethods,
    gameId,
    isAbleToPollTrophyData,
    isAbleToPollRegisterData,
    setGameTrophyData,
    setGameRegisterData,
    setGameStateData,
    setGamePlayersData,
  ])

  // Start polling trophy & register data
  useEffect(() => {
    if (!activeAddress || !appClient || !pollingInterval) return

    poll() // First poll immediately

    intervalRef.current = setInterval(() => {
      poll()
    }, pollingInterval)

    return () => {
      clearInterval(intervalRef.current!)
      intervalRef.current = null
    }
  }, [poll, activeAddress, appClient, pollingInterval])

  useEffect(() => {
    if (!appClient || !activeAddress) {
      setGameTrophyData(undefined)
      setGameRegisterData(undefined)
    }
  }, [appClient, activeAddress])

  useEffect(() => {
    if (!appClient || !activeAddress || !gameId) {
      setGameStateData(undefined)
      setGamePlayersData(undefined)
    }
  }, [appClient, activeAddress, gameId])
}
