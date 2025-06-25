import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GameState } from '../contracts/Pieout'
import { PieOutMethods } from '../methods'
import { ellipseAddress } from '../utils/ellipseAddress'
import { algorand } from '../utils/network/getAlgorandClient'

import { useBoxCommitRand } from '../contexts/BoxCommitRandContext'
import { useCollapseTableItem2 } from '../hooks/useCollapseTableItem2'
import { useCurrentTimestamp } from '../hooks/useCurrentTimestamp'
import { usePollGameData } from '../hooks/usePollGameData'

const GameTable: React.FC = () => {
  const { activeAddress } = useWallet()
  // const { appClient } = useAppClient()

  const appMethods = useMemo(() => (activeAddress ? new PieOutMethods(algorand, activeAddress) : undefined), [activeAddress])

  const { boxCommitRand, setBoxCommitRand } = useBoxCommitRand()

  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null)

  const [inputedGameId, setInputedGameId] = useState('')
  const [userMsg, setUserMsg] = useState('')

  const [validatedGameId, setValidatedGameId] = useState<bigint | undefined>(undefined)

  const [currentGamePlayers, setCurrentGamePlayers] = useState<string[] | null>(null)

  const currentTimestamp = useCurrentTimestamp()

  const [openDropdowns, setOpenDropdowns] = useState({
    adminActions: false,
    triggerEvents: false,
    gamePlayers: false,
    // add more as needed
  })

  // Create refs for each dropdown (useRef is fine here since refs don't change)
  const dropdownRefs = {
    adminActions: useRef<HTMLDivElement>(null),
    triggerEvents: useRef<HTMLDivElement>(null),
    gamePlayers: useRef<HTMLDivElement>(null),
    // add more as needed
  }

  // Collapse function closes all dropdowns
  const collapseAll = () =>
    setOpenDropdowns({
      adminActions: false,
      triggerEvents: false,
      gamePlayers: false,
      // reset others too
    })

  useCollapseTableItem2({
    refs: Object.values(dropdownRefs),
    conditions: Object.values(openDropdowns),
    collapse: collapseAll,
    listenEscape: true,
  })

  // Example toggle handler
  const toggleDropdown = (name: keyof typeof openDropdowns) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [name]: !prev[name],
    }))
  }
  const eventTriggerConditions = useMemo(
    () => ({
      triggersEvent0: currentGameState && currentTimestamp > Number(currentGameState.expiryTs) && !currentGameState.stakingFinalized,
      triggersEvent2: currentGameState && currentTimestamp > Number(currentGameState.expiryTs) && currentGameState.stakingFinalized,
    }),
    [currentGameState, currentTimestamp],
  )

  usePollGameData({
    appMethods,
    validatedGameId: validatedGameId !== undefined ? validatedGameId : 0n,
    activeAddress: activeAddress ?? undefined,
    currentGameState,
    setCurrentGameState,
    currentGamePlayers,
    setCurrentGamePlayers,
    setBoxCommitRand,
  })

  useEffect(() => {
    consoleLogger.info('bla', currentGameState?.activePlayers?.toString() ?? 'No active players')
    // setIsViewingGamePlayers(false)
  }, [validatedGameId, currentGameState])

  const readBoxGameData = async (inputGameId: string) => {
    if (!activeAddress || !appMethods) {
      setUserMsg('Wallet not connected or methods unavailable.')
      return
    }

    let bigIntGameId: bigint
    try {
      bigIntGameId = BigInt(inputGameId)
    } catch {
      setUserMsg('Invalid Game ID format.')
      return
    }

    try {
      const gameState = await appMethods.readGameState(1001n, activeAddress, bigIntGameId)
      const gamePlayers = await appMethods.readGamePlayers(1001n, activeAddress, bigIntGameId)

      setValidatedGameId(bigIntGameId)
      setCurrentGameState(gameState)
      setCurrentGamePlayers(gamePlayers ?? [])
      setUserMsg('')
    } catch (error) {
      consoleLogger.error('Failed to fetch game state:', error)
      setCurrentGameState(null)
      setCurrentGamePlayers([])
      setUserMsg('Game not found or could not be loaded.')
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
    if (!activeAddress || !appMethods || !eventTriggerConditions || !validatedGameId) return
    try {
      await appMethods.triggerGameProg(1001n, activeAddress, validatedGameId, triggerId)
      // setIsViewingTriggerEvents(false)
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
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-2 py-1">
                {validatedGameId?.toString()}
              </td>
              {/* Admin */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2 relative">
                {currentGameState.adminAddress === activeAddress ? (
                  <div>
                    <button
                      onClick={() => toggleDropdown('adminActions')}
                      className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    >
                      {ellipseAddress(currentGameState.adminAddress)}
                    </button>
                    {openDropdowns.adminActions && (
                      <div
                        ref={dropdownRefs.adminActions}
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10"
                      >
                        <ul className="text-sm text-gray-700">
                          <li
                            className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                            onClick={() => {
                              // Add your admin action here
                              consoleLogger.info('Admin clicked: kick players, end game, etc.')
                            }}
                          >
                            Reset Game
                          </li>
                          <li className="hover:bg-gray-100 px-4 py-2 cursor-pointer" onClick={() => consoleLogger.info('delete game')}>
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
                      Live
                      {currentGamePlayers?.includes(activeAddress ?? '') ? (
                        <>
                          {' / '}
                          <button
                            onClick={handlePlayGame}
                            className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                          >
                            Play
                          </button>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      Lobby
                      {activeAddress !== currentGameState.adminAddress && (
                        <>
                          {' / '}
                          {currentGamePlayers?.includes(activeAddress ?? '') === true ? (
                            <span className="text-cyan-300 font-bold">Joined</span>
                          ) : (
                            <button
                              onClick={handleJoinGame}
                              className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                            >
                              Join
                            </button>
                          )}
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
                  onClick={() => toggleDropdown('triggerEvents')}
                >
                  Check
                </button>

                {openDropdowns.triggerEvents && (
                  <div
                    ref={dropdownRefs.triggerEvents}
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
                        <span className={eventTriggerConditions.triggersEvent0 ? 'text-lime-400 font-bold hover:bg-slate-700' : ''}>
                          0 - Game Live
                        </span>

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
                  onClick={() => toggleDropdown('gamePlayers')}
                >
                  View
                </button>

                {openDropdowns.gamePlayers && (
                  <div
                    ref={dropdownRefs.gamePlayers}
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
                {validatedGameId === 0n && currentGameState === null
                  ? 'Invalid input. Game ID must not be zero.'
                  : 'Game not found. Ensure Game ID is valid.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  ) : null
}

export default GameTable
