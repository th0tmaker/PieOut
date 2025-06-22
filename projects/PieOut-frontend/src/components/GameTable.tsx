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

const GameTable: React.FC = () => {
  const { activeAddress } = useWallet()

  const appMethods = useMemo(() => {
    if (!activeAddress) return undefined
    return new PieOutMethods(algorand, activeAddress)
  }, [algorand, activeAddress])

  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null)

  const [inputedGameId, setInputedGameId] = useState('')
  const [validatedGameId, setValidatedGameId] = useState('')
  const [userMsg, setUserMsg] = useState('')

  const [viewingAdminActions, setViewingAdminActions] = useState(false)
  const [viewingTriggerEvents, setViewingTriggerEvents] = useState(false)
  const [viewingGamePlayers, setViewingGamePlayers] = useState(false)

  const [currentGamePlayers, setCurrentGamePlayers] = useState<string[] | null>(null)

  const currentTimestamp = useCurrentTimestamp()

  const highlightTriggerEvent =
    currentGameState && currentTimestamp > Number(currentGameState.expiryTs) && currentGameState.stakingFinalized === false

  const dropdownAdminRef = useRef<HTMLDivElement>(null)
  const dropdownTriggerRef = useRef<HTMLDivElement>(null)
  const dropdownPlayersRef = useRef<HTMLDivElement>(null)

  useCollapseTableItem({
    refs: [dropdownAdminRef, dropdownTriggerRef, dropdownPlayersRef],
    conditions: [viewingAdminActions, viewingTriggerEvents, viewingGamePlayers],
    collapse: () => {
      setViewingAdminActions(false)
      setViewingTriggerEvents(false)
      setViewingGamePlayers(false)
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
  })

  // useEffect(() => {
  //   if (!validatedGameId) return

  //   const intervalId = setInterval(async () => {
  //     try {
  //       const bigIntGameId = BigInt(validatedGameId)
  //       const newGameState = await appMethods?.readGameState(1001n, activeAddress!, bigIntGameId)
  //       const newGamePlayers = await appMethods?.readGamePlayers(1001n, activeAddress!, bigIntGameId)

  //       if (newGameState && !deepEqual(currentGameState, newGameState)) {
  //         setCurrentGameState(newGameState)
  //       }

  //       if (Array.isArray(newGamePlayers) && !deepEqual(currentGamePlayers, newGamePlayers)) {
  //         setCurrentGamePlayers([...newGamePlayers])
  //       }
  //       consoleLogger.info('polled state, yay!')
  //     } catch (err) {
  //       consoleLogger.error('Polling error:', err)
  //     }
  //   }, 3000)

  //   return () => clearInterval(intervalId)
  // }, [validatedGameId, appMethods, activeAddress])

  // useEffect(() => {
  //   function handleClickOutside(event: MouseEvent) {
  //     if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
  //       setViewAdminActions(false)
  //     }
  //   }

  //   if (viewAdminActions) {
  //     document.addEventListener('mousedown', handleClickOutside)
  //   }

  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside)
  //   }
  // }, [viewAdminActions])

  useEffect(() => {
    setViewingGamePlayers(false)
  }, [validatedGameId])

  // Create a method that reads the game state
  const readBoxGameData = async (inputGameId: string) => {
    try {
      // Return from method if no activeAddress or pieOutMethods object exists
      if (!activeAddress || !appMethods) {
        consoleLogger.info('Missing wallet address or method binding')
        return
      }

      // Return from method if input game id is zero
      const bigIntGameId = BigInt(inputGameId)
      if (bigIntGameId === 0n) {
        setUserMsg('Game ID must not be zero.')
        return
      }
      await highlightTriggerIdField()
      // Simulate the readGameState call to get the box game state contents
      // Pass stored app id when migrating to TestNet
      const gameState = await appMethods.readGameState(1001n, activeAddress, bigIntGameId)
      const gamePlayers = await appMethods.readGamePlayers(1001n, activeAddress, bigIntGameId)

      consoleLogger.info('Players:', gamePlayers)
      consoleLogger.info(gameState.expiryTs.toString())

      if (!gameState) {
        setCurrentGameState(null)
        setValidatedGameId('')
        setUserMsg('App call failure!')
        return
      }

      setCurrentGameState(gameState)
      setValidatedGameId(inputGameId)
      setUserMsg('')

      setCurrentGamePlayers(Array.isArray(gamePlayers) ? [...gamePlayers] : [])
    } catch (error) {
      consoleLogger.error('Failed to fetch game state:', error)
      setCurrentGameState(null)
      setUserMsg('No matching game found.')
    }
  }

  const highlightTriggerIdField = async () => {
    consoleLogger.info('Current Timestamp (Unix, sec):', currentTimestamp) // number
    consoleLogger.info('Staking Finalized:', currentGameState?.stakingFinalized ?? 'N/A') // boolean
    consoleLogger.info('Expiry Timestamp (Unix, sec):', currentGameState?.expiryTs?.toString() ?? 'N/A') // bigint to string
  }

  // // Create a method that reads the game state
  // const readGamePlayers = async () => {
  //   try {
  //     // Return from method if no activeAddress or pieOutMethods object exists
  //     if (!activeAddress || !pieOutMethods) {
  //       consoleLogger.info('Missing wallet address or method binding')
  //       return
  //     }

  //     // // Return from method if input game id is zero
  //     // const bigIntGameId = BigInt(inputGameId)
  //     // if (bigIntGameId === 0n) {
  //     //   setUserMsg('Game ID must not be zero.')
  //     //   return
  //     // }

  //     // Simulate the readGamePlayers call to get the box game players contents
  //     // Pass stored app id when migrating to TestNet
  //     const gamePlayers = await pieOutMethods.readGamePlayers(1001n, activeAddress, BigInt(validatedGameId))
  //     consoleLogger.info(gamePlayers.toString())

  //     // Store gameState query if successful
  //     if (gameState) {
  //       setCurrentGameState(gameState)
  //       setValidatedGameId(inputGameId)
  //       setUserMsg('')
  //       // Else, display user message
  //     } else {
  //       setCurrentGameState(null)
  //       setValidatedGameId('')
  //       setUserMsg('App call failure!')
  //     }
  //   } catch (error) {
  //     consoleLogger.error('Failed to fetch game state:', error)
  //     setCurrentGameState(null)
  //     setUserMsg('No matching game found.')
  //   }
  // }

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

  // Render JSX
  return activeAddress ? (
    <div className="p-4">
      {/* Add Live Timestamp wherever relevant */}
      Current Date: {new Date(currentTimestamp * 1000).toLocaleTimeString()}
      <div className="mb-4">
        <label className="font-semibold mr-2">Game ID:</label>
        <input
          className="w-46 border border-gray-300 rounded px-2 py-1 text-center"
          type="text"
          value={inputedGameId}
          onChange={(e) => {
            const onlyDigits = e.target.value.replace(/\D/g, '')
            setInputedGameId(onlyDigits)
          }}
          maxLength={20}
          inputMode="numeric"
        />
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
          onClick={() => readBoxGameData(inputedGameId)}
        >
          Input
        </button>
        {/* Error Message */}
        {userMsg && <span className="text-red-500 text-sm ml-4">{userMsg}</span>}
      </div>
      <table className="min-w-min border border-gray-300 rounded-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-center border border-gray-300 px-4 py-2">Game ID</th>
            <th className="text-center border border-gray-300 px-4 py-2">Admin</th>
            <th className="text-center border border-gray-300 px-4 py-2">Prize Pool</th>
            <th className="text-center border border-gray-300 px-4 py-2">Status</th>
            <th className="text-center border border-gray-300 px-4 py-2">Commit</th>
            <th className="text-center border border-gray-300 px-4 py-2">Trigger</th>
            <th className="text-center border border-gray-300 px-4 py-2">Players</th>
            <th className="text-center border border-gray-300 px-4 py-2">Leaderboard</th>
          </tr>
        </thead>
        <tbody>
          {currentGameState ? (
            <tr>
              {/* Game ID */}
              <td className="text-center border border-gray-300 px-2 py-1">{validatedGameId}</td>
              {/* Admin */}
              <td className="text-center border border-gray-300 px-4 py-2 relative">
                {currentGameState.adminAddress === activeAddress ? (
                  <div ref={dropdownAdminRef}>
                    <button
                      onClick={() => setViewingAdminActions((prev) => !prev)}
                      className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    >
                      {ellipseAddress(currentGameState.adminAddress)}
                    </button>
                    {viewingAdminActions && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
                        <ul className="text-sm text-gray-700">
                          <li
                            className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                            onClick={() => {
                              // Add your admin action here
                              consoleLogger.info('Admin clicked: kick players, end game, etc.')
                              setViewingAdminActions(false)
                            }}
                          >
                            Reset Game
                          </li>

                          <li className="hover:bg-gray-100 px-4 py-2 cursor-pointer" onClick={() => setViewingAdminActions(false)}>
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
              <td className="text-center border border-gray-300 px-4 py-2">{currentGameState.prizePool.toString()}</td>
              {/* Status */}
              <td className="text-center border border-gray-300 px-4 py-2">
                <div className="font-bold flex items-center justify-center gap-1">
                  {Number(currentGameState.prizePool) === 0 ? (
                    <>Over</>
                  ) : currentGameState.stakingFinalized ? (
                    <>
                      Live /
                      <button
                        onClick={handlePlayGame}
                        className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
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
                            className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                          >
                            Join
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                {Number(currentGameState.prizePool) !== 0 && (
                  <div className="text-xs text-gray-600">{new Date(Number(currentGameState.expiryTs) * 1000).toLocaleString()}</div>
                )}{' '}
              </td>
              {/* Lock */}
              <td className="relative text-center border border-gray-300 px-4 py-2">
                <button
                  className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={handleSetBoxCommitRand}
                >
                  Lock
                </button>
              </td>
              {/* Trigger */}
              <td className="relative text-center border border-gray-300 px-4 py-2">
                <button
                  className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => setViewingTriggerEvents((prev) => !prev)}
                >
                  View
                </button>

                {viewingTriggerEvents && (
                  <div
                    ref={dropdownTriggerRef} // <-- Add this
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
                  >
                    <ul className="text-sm text-gray-700">
                      <li
                        className={`relative px-4 py-2 ${
                          highlightTriggerEvent ? 'bg-green-100 hover:bg-green-200 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-help'
                        } group`} // group is required for group-hover
                        onClick={async () => {
                          if (!highlightTriggerEvent) return
                          await appMethods?.triggerGameProg(1001n, activeAddress, BigInt(validatedGameId), 0n)
                          setViewingTriggerEvents(false)
                        }}
                      >
                        <span className={highlightTriggerEvent ? 'text-red-600 font-bold' : ''}>0 - GAME LIVE CHECK</span>

                        {/* Tooltip shown only when not triggerable */}
                        {!highlightTriggerEvent && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            This action is unavailable until the game is ready.
                          </div>
                        )}
                      </li>
                      <li
                        className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                        onClick={async () => {
                          await appMethods?.triggerGameProg(1001n, activeAddress, BigInt(validatedGameId), 2n)
                          consoleLogger.info('Trigger: Check if game is over')
                          setViewingTriggerEvents(false)
                        }}
                      >
                        2 - GAME OVER CHECK
                      </li>
                    </ul>
                  </div>
                )}
              </td>
              {/* Players */}
              <td className="relative text-center border border-gray-300 px-4 py-2">
                <button
                  className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => setViewingGamePlayers((prev) => !prev)}
                >
                  Vieww
                </button>

                {viewingGamePlayers && (
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
              <td className="text-center border border-gray-300 px-4 py-2">
                <button
                  className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => consoleLogger.info('Leaderboard:', currentGameState)}
                >
                  Viewww
                </button>
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-4 text-gray-500">
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
