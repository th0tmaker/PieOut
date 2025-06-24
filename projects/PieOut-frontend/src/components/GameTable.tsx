import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GameState } from '../contracts/Pieout'
import { PieOutMethods } from '../methods'
import { ellipseAddress } from '../utils/ellipseAddress'
import { algorand } from '../utils/network/getAlgorandClient'

import { useCollapseTableItem } from '../hooks/useCollapseTableItem'
import { useCurrentTimestamp } from '../hooks/useCurrentTimestamp'
import { usePollGameData } from '../hooks/usePollGameData'
import { useAppClient } from '../contexts/AppClientContext'
import { useBoxCommitRand } from '../contexts/BoxCommitRandContext'

const GameTable: React.FC = () => {
  const { activeAddress } = useWallet()
  const { appClient } = useAppClient()

  const appMethods = useMemo(() => {
    if (!activeAddress) return undefined
    return new PieOutMethods(algorand, activeAddress)
  }, [algorand, activeAddress])

  const { boxCommitRand, setBoxCommitRand } = useBoxCommitRand()

  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null)

  const [inputedGameId, setInputedGameId] = useState('')
  const [validatedGameId, setValidatedGameId] = useState('')
  const [userMsg, setUserMsg] = useState('')

  const [isViewingAdminActions, setIsViewingAdminActions] = useState(false)
  const [isViewingTriggerEvents, setIsViewingTriggerEvents] = useState(false)
  const [isViewingGamePlayers, setIsViewingGamePlayers] = useState(false)

  const [currentGamePlayers, setCurrentGamePlayers] = useState<string[] | null>(null)

  const currentTimestamp = useCurrentTimestamp()

  const eventTriggerConditions = useMemo(
    () => ({
      triggersEvent0:
        currentGameState && currentTimestamp > Number(currentGameState.expiryTs) && currentGameState.stakingFinalized === false,
      triggersEvent2:
        currentGameState && currentTimestamp > Number(currentGameState.expiryTs) && currentGameState.stakingFinalized === true,
    }),
    [currentGameState, currentTimestamp],
  )

  const dropdownAdminRef = useRef<HTMLDivElement>(null)
  const dropdownTriggerRef = useRef<HTMLDivElement>(null)
  const dropdownPlayersRef = useRef<HTMLDivElement>(null)

  useCollapseTableItem({
    refs: [dropdownAdminRef, dropdownTriggerRef, dropdownPlayersRef],
    conditions: [isViewingAdminActions, isViewingTriggerEvents, isViewingGamePlayers],
    collapse: () => {
      setIsViewingAdminActions(false)
      setIsViewingTriggerEvents(false)
      setIsViewingGamePlayers(false)
    },
  })

  usePollGameData({
    appMethods,
    validatedGameId,
    activeAddress: activeAddress ?? undefined,
    currentGameState,
    setCurrentGameState,
    currentGamePlayers,
    setCurrentGamePlayers,
    setBoxCommitRand,
  })

  useEffect(() => {
    consoleLogger.info('bla', currentGameState?.activePlayers?.toString() ?? 'No active players')
    setIsViewingGamePlayers(false)
  }, [validatedGameId, currentGameState])

  // Create a method that reads the game state
  const readBoxGameData = async (inputGameId: string) => {
    try {
      // Return from method if no activeAddress or appMethods object exists
      if (!activeAddress || !appMethods) {
        consoleLogger.info('Missing wallet address or method binding')
        return
      }

      // Try to safely parse inputGameId to BigInt
      let bigIntGameId: bigint
      try {
        bigIntGameId = BigInt(inputGameId)
      } catch {
        setUserMsg('Invalid Game ID.')
        return
      }

      if (bigIntGameId === 0n) {
        setUserMsg('Game ID must not be zero.')
        return
      }

      // NOTE: Need to listen for change and update validatedGameId based on that instead of needing another render

      // Try to fetch game state and related data
      const gameState = await appMethods.readGameState(1001n, activeAddress, bigIntGameId)
      const gamePlayers = await appMethods.readGamePlayers(1001n, activeAddress, bigIntGameId)

      // Current game State is responsible for rendring table contents or message to enter valid game id
      // Therefore, when my inputGameId changes to prompt a non-existent gameState, it should:
      // change to message permanently (need to ensure gameState is null even on polls)
      // or, keep previous gameState and not override it with null, just display red message
      if (gameState) {
        setCurrentGameState(gameState)
        setValidatedGameId(inputGameId)
        setUserMsg('')
        setCurrentGamePlayers(Array.isArray(gamePlayers) ? [...gamePlayers] : [])
      } else {
        // No gameState found: set null but preserve last valid game ID
        setCurrentGameState(null)
        setInputedGameId(validatedGameId)
        setUserMsg('No matching game found.')
        setCurrentGamePlayers([])
      }
    } catch (error) {
      consoleLogger.error('Failed to fetch game state:', error)

      // Treat errors the same as an invalid/missing game
      setCurrentGameState(null)
      setUserMsg('No matching game found.')
      setCurrentGamePlayers([])
    }
  }

  const handleJoinGame = () => {
    if (!appMethods || !activeAddress || !validatedGameId) return

    appMethods.joinGame(1001n, activeAddress, BigInt(validatedGameId))
  }

  const handlePlayGame = async () => {
    if (!appMethods || !activeAddress || !validatedGameId) return

    try {
      await appMethods.playGame(1001n, activeAddress, BigInt(validatedGameId))
    } catch (err) {
      consoleLogger.error('Error during play sequence:', err)
    }
  }

  const handleSetBoxCommitRand = async () => {
    if (!appMethods || !activeAddress || !validatedGameId) return

    try {
      await appMethods.setBoxCommitRand(1001n, activeAddress, BigInt(validatedGameId))
    } catch (err) {
      consoleLogger.error('Error during set box commit rand sequence:', err)
    }
  }

  const handleNumOnlyGameId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numOnlyInput = e.target.value.replace(/\D/g, '')
    setInputedGameId(numOnlyInput)
  }

  const handleTrigGameEvent = async (triggerId: bigint) => {
    if (!activeAddress || !appMethods || !eventTriggerConditions) return
    try {
      await appMethods.triggerGameProg(1001n, activeAddress, BigInt(validatedGameId), triggerId)
      setIsViewingTriggerEvents(false)
    } catch (err) {
      consoleLogger.error('Error during trigger game event:', err)
    }
  }

  // Render JSX
  return activeAddress ? (
    <div className="p-4">
      <div className="mb-4 font-bold text-indigo-200">
        Current Local Time: <span className="text-cyan-300">{new Date(currentTimestamp * 1000).toLocaleTimeString()}</span>
      </div>
      <div className="mb-4 flex items-center gap-4">
        <label className="font-bold text-indigo-200">Look Up Game by ID:</label>

        <input
          className={`w-54 font-bold text-center text-white bg-slate-800 border-2 border-pink-400 rounded px-3 py-1 focus:bg-slate-700 ${
            inputedGameId ? 'bg-slate-700' : ''
          } hover:bg-slate-700 focus:outline-none focus:border-lime-400`}
          type="text"
          value={inputedGameId}
          onChange={handleNumOnlyGameId}
          maxLength={20}
          inputMode="numeric"
          placeholder="Game ID"
        />
        <span className="font-bold text-indigo-200">:</span>
        <button
          className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={() => readBoxGameData(inputedGameId)}
        >
          Input
        </button>
        {/* Error Message */}
        <span className="flex items-center gap-4">{userMsg && <span className="text-red-500 text-sm">{userMsg}</span>}</span>
      </div>
      <table className="min-w-min border border-indigo-300 rounded-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Game ID</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Admin</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Prize Pool</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Status</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Commit</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Trigger</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Players</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Leaderboard</th>
          </tr>
        </thead>
        <tbody>
          {currentGameState ? (
            <tr>
              {/* Game ID */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-2 py-1">{validatedGameId}</td>
              {/* Admin */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2 relative">
                {currentGameState.adminAddress === activeAddress ? (
                  <div ref={dropdownAdminRef}>
                    <button
                      onClick={() => setIsViewingAdminActions((prev) => !prev)}
                      className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    >
                      {ellipseAddress(currentGameState.adminAddress)}
                    </button>
                    {isViewingAdminActions && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
                        <ul className="text-sm text-gray-700">
                          <li
                            className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                            onClick={() => {
                              // Add your admin action here
                              consoleLogger.info('Admin clicked: kick players, end game, etc.')
                              setIsViewingAdminActions(false)
                            }}
                          >
                            Reset Game
                          </li>

                          <li className="hover:bg-gray-100 px-4 py-2 cursor-pointer" onClick={() => setIsViewingAdminActions(false)}>
                            Delete Game
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  ellipseAddress(currentGameState.adminAddress)
                )}
              </td>
              {/* Prize Pool */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
                {currentGameState.prizePool.toString()}
              </td>
              {/* Status */}
              <td className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
                <div className="font-bold flex items-center justify-center gap-1">
                  {Number(currentGameState.prizePool) === 0 ? (
                    <>Over</>
                  ) : currentGameState.stakingFinalized ? (
                    <>
                      Live /
                      <button
                        onClick={handlePlayGame}
                        className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                      >
                        Play
                      </button>
                    </>
                  ) : (
                    <>
                      Lobby
                      {activeAddress !== currentGameState.adminAddress && (
                        <>
                          {' / '}
                          <button
                            onClick={handleJoinGame}
                            className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                          >
                            Join
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                {Number(currentGameState.prizePool) !== 0 && (
                  <div className="text-xs text-white">{new Date(Number(currentGameState.expiryTs) * 1000).toLocaleString()}</div>
                )}{' '}
              </td>
              {/* Set */}
              <td className="font-bold text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
                {currentGameState.stakingFinalized && currentGameState.prizePool !== 0n && boxCommitRand?.gameId === 0n ? (
                  <button
                    className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    onClick={handleSetBoxCommitRand}
                  >
                    Set
                  </button>
                ) : (
                  <div className="group inline-block relative">
                    <span className="text-indigo-200 cursor-help">Set</span>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                      {!currentGameState.stakingFinalized
                        ? 'Unavailable: This game has not started yet.'
                        : currentGameState.prizePool === 0n
                          ? 'Unavailable: This game already ended.'
                          : 'Unavailable: Previous commit is still active.'}
                    </div>
                  </div>
                )}
              </td>
              {/* Trigger */}
              <td className=" relative font-bold text-center text-indigo-200 bg-slate-800 border border-indigo-300">
                <button
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => setIsViewingTriggerEvents((prev) => !prev)}
                >
                  Check
                </button>

                {isViewingTriggerEvents && (
                  <div
                    ref={dropdownTriggerRef}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
                  >
                    <ul className="text-sm text-gray-700">
                      <li
                        className={`relative px-4 py-2 ${
                          eventTriggerConditions.triggersEvent0
                            ? 'text-indigo-200 bg-slate-800 border border-lime-400 cursor-pointer'
                            : 'bg-slate-800 text-gray-400 cursor-help'
                        } group`} // group is required for group-hover
                        onClick={() => handleTrigGameEvent(0n)}
                      >
                        <span className={eventTriggerConditions.triggersEvent0 ? 'text-lime-400 font-bold' : ''}>0 - Game Live</span>

                        {/* Tooltip shown only when not triggerable */}
                        {!eventTriggerConditions.triggersEvent0 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            This action is unavailable until the game is ready.
                          </div>
                        )}
                      </li>
                      <li
                        className={`relative px-4 py-2 ${
                          eventTriggerConditions.triggersEvent2
                            ? 'text-indigo-200 bg-slate-800 border border-lime-400 cursor-pointer'
                            : 'bg-slate-800 text-gray-400 cursor-help'
                        } group`} // group is required for group-hover
                        onClick={() => handleTrigGameEvent(2n)}
                      >
                        <span className={eventTriggerConditions.triggersEvent2 ? 'text-lime-400 font-bold' : ''}>2 - Game Over</span>

                        {/* Tooltip shown only when not triggerable */}
                        {!!eventTriggerConditions.triggersEvent2 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            This action is unavailable until the game is ready.
                          </div>
                        )}
                      </li>
                    </ul>
                  </div>
                )}
              </td>
              {/* Players */}
              <td className="font-bold text-center text-indigo-200 bg-slate-800 border border-indigo-300">
                <button
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => setIsViewingGamePlayers((prev) => !prev)}
                >
                  View
                </button>

                {isViewingGamePlayers && (
                  <div
                    ref={dropdownPlayersRef}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
                  >
                    <ul className="text-sm text-gray-700 max-h-60 overflow-auto">
                      {currentGamePlayers && currentGamePlayers.length > 0 ? (
                        currentGamePlayers.map((address: string, index: number) => (
                          <li key={index} className="hover:bg-gray-100 px-4 py-2 cursor-pointer">
                            {index} - {ellipseAddress(address)}{' '}
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 px-4 py-2">Lobby empty</li>
                      )}
                    </ul>
                  </div>
                )}
              </td>
              {/* Leaderboard */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300">
                <button
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => consoleLogger.info('Leaderboard:', currentGameState)}
                >
                  View
                </button>
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={8} className="relative text-center py-4 px-2 text-white">
                Game not found. Ensure Game ID is valid.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  ) : null
}

export default GameTable
