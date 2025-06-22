import deepEqual from 'fast-deep-equal'
import { useEffect, useMemo, useRef } from 'react'
import { GameState } from '../contracts/Pieout'
import { PieOutMethods } from '../methods'

type UsePollGameDataProps = {
  appMethods?: PieOutMethods
  validatedGameId: string
  activeAddress?: string
  currentGameState: GameState | null
  setCurrentGameState: (state: GameState) => void
  currentGamePlayers: string[] | null
  setCurrentGamePlayers: (players: string[]) => void
}

export function usePollGameData({
  appMethods,
  validatedGameId,
  activeAddress,
  currentGameState,
  setCurrentGameState,
  currentGamePlayers,
  setCurrentGamePlayers,
}: UsePollGameDataProps) {
  const gameId = useMemo(() => {
    try {
      return BigInt(validatedGameId)
    } catch {
      return null
    }
  }, [validatedGameId])

  const gameStateRef = useRef(currentGameState)
  const gamePlayersRef = useRef(currentGamePlayers)

  useEffect(() => {
    gameStateRef.current = currentGameState
  }, [currentGameState])
  useEffect(() => {
    gamePlayersRef.current = currentGamePlayers
  }, [currentGamePlayers])

  useEffect(() => {
    if (!activeAddress || !appMethods || !gameId) return

    const poll = async () => {
      try {
        const newGameState = await appMethods.readGameState(1001n, activeAddress, gameId)
        if (newGameState && !deepEqual(gameStateRef.current, newGameState)) {
          setCurrentGameState(newGameState)
        }

        const newGamePlayers = await appMethods.readGamePlayers(1001n, activeAddress, gameId)
        if (Array.isArray(newGamePlayers) && !deepEqual(gamePlayersRef.current, newGamePlayers)) {
          setCurrentGamePlayers([...newGamePlayers])
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    poll()
    const id = setInterval(() => {
      poll().catch(console.error)
    }, 5000)

    return () => clearInterval(id)
  }, [activeAddress, appMethods, gameId])
}
