import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import deepEqual from 'fast-deep-equal'
import { useCallback, useEffect, useMemo, useRef } from 'react'
// import { AppClientContext } from '../contexts/AppClientContext'
import { GameState } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'
import { useAppClient } from './useAppClient'

type UsePollGameDataProps = {
  appMethods?: PieoutMethods
  validatedGameId: bigint
  activeAddress?: string
  currentGameState: GameState | null
  setCurrentGameState: (state: GameState | null) => void
  currentGamePlayers: string[] | null
  setCurrentGamePlayers: (players: string[]) => void
  setBoxCommitRandData?: (entry: { gameId: bigint | null; commitRound: bigint | null; expiryRound: bigint | null }) => void
  pollingInterval?: number
}

export function usePollGameData({
  appMethods,
  validatedGameId,
  activeAddress,
  currentGameState,
  setCurrentGameState,
  currentGamePlayers,
  setCurrentGamePlayers,
  setBoxCommitRandData,
  pollingInterval = 3000,
}: UsePollGameDataProps) {
  const { appClient } = useAppClient()

  const gameId = useMemo(() => {
    try {
      return BigInt(validatedGameId)
    } catch {
      return null
    }
  }, [validatedGameId])

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const gameStateRef = useRef(currentGameState)
  const gamePlayersRef = useRef(currentGamePlayers)
  const boxCommitRandRef = useRef<{
    gameId: bigint | null
    commitRound: bigint | null
    expiryRound: bigint | null
  } | null>(null)

  useEffect(() => {
    gameStateRef.current = currentGameState
  }, [currentGameState])

  useEffect(() => {
    gamePlayersRef.current = currentGamePlayers
  }, [currentGamePlayers])

  const poll = useCallback(async () => {
    if (!activeAddress || !appMethods) return

    try {
      let newGameState: GameState | null = null
      let newGamePlayers: string[] | null = null

      if (gameId) {
        ;[newGameState, newGamePlayers] = await Promise.all([
          appMethods.readGameState(1001n, activeAddress, gameId),
          appMethods.readGamePlayers(1001n, activeAddress, gameId),
        ])

        if (newGameState && !deepEqual(gameStateRef.current, newGameState)) {
          setCurrentGameState(newGameState)
        }
        if (Array.isArray(newGamePlayers) && !deepEqual(gamePlayersRef.current, newGamePlayers)) {
          setCurrentGamePlayers([...newGamePlayers])
        }
      }

      // Get boxCommitRand entry for active address (always, even if no gameId)
      if (setBoxCommitRandData && appClient) {
        const boxCommitRandMap = await appClient.state.box.boxGameRegister.getMap()
        const entry = boxCommitRandMap?.get(activeAddress)

        const parsedEntry = {
          gameId: entry?.gameId ?? null,
          commitRound: entry?.commitRound ?? null,
          expiryRound: entry?.expiryRound ?? null,
        }

        // Only update if changed
        if (!deepEqual(boxCommitRandRef.current, parsedEntry)) {
          boxCommitRandRef.current = parsedEntry
          setBoxCommitRandData(parsedEntry)
        }
      }
    } catch (err) {
      consoleLogger.error('Polling error:', err)
    }
  }, [activeAddress, appClient, appMethods, gameId, setCurrentGameState, setCurrentGamePlayers, setBoxCommitRandData])

  useEffect(() => {
    if (!gameId || !activeAddress || !appMethods) return

    const resetStateIfNotFound = async () => {
      try {
        const state = await appMethods.readGameState(1001n, activeAddress, gameId)
        if (!state) {
          setCurrentGameState(null)
          gameStateRef.current = null
        }
      } catch {
        setCurrentGameState(null)
        gameStateRef.current = null
      }
    }

    resetStateIfNotFound()
  }, [validatedGameId])

  // Clear polling when currentGameState becomes null
  useEffect(() => {
    if (currentGameState === null && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [currentGameState])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Don't start polling if currentGameState is explicitly null
    if (!activeAddress || !appMethods) return

    poll()

    intervalRef.current = setInterval(() => {
      poll().catch(consoleLogger.error)
    }, pollingInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [poll, pollingInterval, currentGameState])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
}
