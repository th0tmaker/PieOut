import React, { useEffect, useRef, useState } from 'react'
import { PieOutMethods } from '../methods'
import { useWallet } from '@txnlab/use-wallet-react'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { GameState } from '../contracts/Pieout'
import { algorand } from '../utils/network/getAlgorandClient'
import { ellipseAddress } from '../utils/ellipseAddress'

import deepEqual from 'fast-deep-equal'

const GameTable: React.FC = () => {
  const { activeAddress } = useWallet()

  const appMethods = activeAddress ? new PieOutMethods(algorand, activeAddress) : undefined

  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null)

  const [inputedGameId, setInputedGameId] = useState('')
  const [validatedGameId, setValidatedGameId] = useState('')

  const [userMsg, setUserMsg] = useState('')

  const [viewAdminActions, setViewAdminActions] = useState(false)
  const [viewTriggerEvents, setViewTriggerEvents] = useState(false)

  const [viewPlayers, setViewPlayers] = useState(false)
  const [currentGamePlayers, setCurrentGamePlayers] = useState<string[] | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!validatedGameId) return

    const intervalId = setInterval(async () => {
      try {
        const bigIntGameId = BigInt(validatedGameId)
        const newGameState = await appMethods?.readGameState(1001n, activeAddress!, bigIntGameId)
        const newGamePlayers = await appMethods?.readGamePlayers(1001n, activeAddress!, bigIntGameId)

        if (newGameState && !deepEqual(currentGameState, newGameState)) {
          setCurrentGameState(newGameState)
        }

        if (Array.isArray(newGamePlayers) && !deepEqual(currentGamePlayers, newGamePlayers)) {
          setCurrentGamePlayers([...newGamePlayers])
        }
        consoleLogger.info('polled state, yay!')
      } catch (err) {
        consoleLogger.error('Polling error:', err)
      }
    }, 3000)

    return () => clearInterval(intervalId)
  }, [validatedGameId, appMethods, activeAddress])
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setViewAdminActions(false)
      }
    }

    if (viewAdminActions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [viewAdminActions])

  useEffect(() => {
    setViewPlayers(false)
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
                  <div ref={dropdownRef}>
                    <button
                      onClick={() => setViewAdminActions((prev) => !prev)}
                      className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    >
                      {ellipseAddress(currentGameState.adminAddress)}
                    </button>
                    {viewAdminActions && (
                      <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
                        <ul className="text-sm text-gray-700">
                          <li
                            className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                            onClick={() => {
                              // Add your admin action here
                              consoleLogger.info('Admin clicked: kick players, end game, etc.')
                              setViewAdminActions(false)
                            }}
                          >
                            Reset Game
                          </li>

                          <li className="hover:bg-gray-100 px-4 py-2 cursor-pointer" onClick={() => setViewAdminActions(false)}>
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
                      Lobby /
                      <button
                        onClick={handleJoinGame}
                        className="text-blue-600 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                      >
                        Join
                      </button>
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
                  onClick={() => setViewTriggerEvents((prev) => !prev)}
                >
                  View
                </button>

                {viewTriggerEvents && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10">
                    <ul className="text-sm text-gray-700 max-h-60 overflow-auto">
                      <li
                        className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                        onClick={async () => {
                          await appMethods?.triggerGameProg(1001n, activeAddress, BigInt(validatedGameId), 0n)
                          setViewTriggerEvents(false)
                        }}
                      >
                        0 - GAME LIVE CHECK
                      </li>
                      <li
                        className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                        onClick={async () => {
                          await appMethods?.triggerGameProg(1001n, activeAddress, BigInt(validatedGameId), 2n)
                          consoleLogger.info('Trigger: Check if game is over')
                          setViewTriggerEvents(false)
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
                  onClick={() => setViewPlayers((prev) => !prev)}
                >
                  Vieww
                </button>

                {viewPlayers && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10">
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
