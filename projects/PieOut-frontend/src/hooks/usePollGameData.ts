import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import deepEqual from 'fast-deep-equal'
import { useCallback, useEffect, useRef } from 'react'
import { GameState, GameTrophy, GameRegister, PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'

type UsePollGameDataProps = {
  appClient: PieoutClient | undefined
  appMethods: PieoutMethods | undefined
  gameId: bigint | null
  activeAddress: string | null
  gameTrophyData: GameTrophy | undefined
  setGameTrophyData: (data: GameTrophy | undefined) => void
  gameRegisterData: GameRegister | undefined
  setGameRegisterData: (data: GameRegister | undefined) => void
  gameStateData: GameState | undefined
  setGameStateData: (data: GameState | undefined) => void
  gamePlayersData: string[] | undefined
  setGamePlayersData: (data: string[] | undefined) => void
  pollingInterval?: number
}

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
  pollingInterval = 3000,
}: UsePollGameDataProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mutable refs to track previous state
  const gameTrophyRef = useRef<GameTrophy | undefined>(gameTrophyData)
  const gameRegisterRef = useRef<GameRegister | undefined>(gameRegisterData)
  const gameStateRef = useRef<GameState | undefined>(gameStateData)
  const gamePlayersRef = useRef<string[] | undefined>(gamePlayersData)

  // Update refs when props change
  useEffect(() => {
    gameTrophyRef.current = gameTrophyData
    gameRegisterRef.current = gameRegisterData
    gameStateRef.current = gameStateData
    gamePlayersRef.current = gamePlayersData
  }, [gameTrophyData, gameRegisterData, gameStateData, gamePlayersData])

  // Helper to update state only if changed
  const syncState = <T>(ref: React.MutableRefObject<T | undefined>, newValue: T | undefined, setter: (v: T | undefined) => void) => {
    if (!deepEqual(ref.current, newValue)) {
      ref.current = newValue
      setter(newValue)
    }
  }

  const poll = useCallback(async () => {
    if (!activeAddress || !appClient || !appMethods || !gameId) return

    try {
      const [freshTrophy, freshRegister, freshState, freshPlayers] = await Promise.all([
        appClient.state.box.boxGameTrophy(),
        appClient.state.box.boxGameRegister.value(activeAddress),
        appClient.state.box.boxGameState.value(gameId),
        appMethods?.readBoxGamePlayers(appClient.appId, activeAddress, gameId),
      ])

      syncState(gameTrophyRef, freshTrophy, setGameTrophyData)
      syncState(gameRegisterRef, freshRegister, setGameRegisterData)
      syncState(gameStateRef, freshState, setGameStateData)
      syncState(gamePlayersRef, Array.isArray(freshPlayers) ? [...freshPlayers] : undefined, setGamePlayersData)
    } catch (error) {
      consoleLogger.error('Polling error:', error)
    }
  }, [activeAddress, appClient, appMethods, gameId])

  // Start polling on mount and setup interval
  useEffect(() => {
    if (!appClient || !gameId || !activeAddress) return

    // Immediate first poll
    poll()

    intervalRef.current = setInterval(() => {
      poll()
    }, pollingInterval)

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [poll, pollingInterval, appClient, gameId, activeAddress])

  // Clear state if appClient, activeAddress, or currentGameId become falsy
  useEffect(() => {
    if (!appClient || !activeAddress || !gameId) {
      setGameTrophyData(undefined)
      setGameRegisterData(undefined)
      setGameStateData(undefined)
      setGamePlayersData(undefined)
    }
  }, [appClient, activeAddress, gameId, setGameTrophyData, setGameRegisterData, setGameStateData, setGamePlayersData])
}
