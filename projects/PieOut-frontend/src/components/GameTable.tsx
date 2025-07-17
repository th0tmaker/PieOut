import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { GameState } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'
import { ellipseAddress } from '../utils/ellipseAddress'
import { algorand } from '../utils/network/getAlgorandClient'

import { useDropdownEventListener } from '../hooks/useDropdownEventListener'
import { useCurrentTimestamp } from '../hooks/useCurrentTimestamp'
import ProfileModal from './ProfileModal'
import { useModal } from '../hooks/useModal'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { useGameBoxDataCtx } from '../hooks/useGameBoxDataCtx'

const GameTable: React.FC = () => {
  const { activeAddress } = useWallet()
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [openLeaderboardModal, setOpenLeaderboardModal] = useState<boolean>(false)
  const { modal, toggleModal, openModal, getModalProps } = useModal()

  const appMethods = useMemo(() => (activeAddress ? new PieoutMethods(algorand, activeAddress) : undefined), [activeAddress])

  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null)
  const [currentGamePlayers, setCurrentGamePlayers] = useState<string[] | null>(null)

  const [inputedGameId, setInputedGameId] = useState('')
  const [userMsg, setUserMsg] = useState('')
  const [isGameIdZero, setIsGameIdZero] = useState(false)

  // const [validatedGameId, setValidatedGameId] = useState<bigint | undefined>(undefined)
  const { gameId, setGameId } = useGameIdCtx()
  const { gameRegisterData } = useGameBoxDataCtx()

  const currentTimestamp = useCurrentTimestamp()

  const toggleLeaderboardModal = () => {
    setOpenLeaderboardModal(!openLeaderboardModal)
  }
  const [openDropdowns, setOpenDropdowns] = useState({
    adminActions: false,
    triggerEvents: false,
    gamePlayers: false,
    // add more as needed
  })

  // Create refs for each dropdown (useRef is fine here since refs don't change)
  const dropdownListRefs = {
    adminActions: useRef<HTMLDivElement>(null),
    triggerEvents: useRef<HTMLDivElement>(null),
    gamePlayers: useRef<HTMLDivElement>(null),
    // add more as needed
  }

  // Add button refs alongside your dropdown refs
  const dropdownBtnRefs = {
    adminActionsBtn: useRef<HTMLButtonElement>(null),
    triggerEventsBtn: useRef<HTMLButtonElement>(null),
    gamePlayersBtn: useRef<HTMLButtonElement>(null),
  }

  // Function closes all dropdowns
  const closeAll = () =>
    setOpenDropdowns({
      adminActions: false,
      triggerEvents: false,
      gamePlayers: false,
      // reset others too
    })

  useDropdownEventListener({
    dropdownListRefs: Object.values(dropdownListRefs),
    dropdownBtnRefs: Object.values(dropdownBtnRefs),
    isOpen: Object.values(openDropdowns), // or just a single boolean
    onClose: closeAll,
    listenEscape: true,
  })

  // Example toggle handler
  const toggleDropdown = (name: keyof typeof openDropdowns) => {
    setOpenDropdowns((prev) => {
      const isCurrentlyOpen = prev[name]

      if (isCurrentlyOpen) {
        // If clicking the same button, close it
        return {
          adminActions: false,
          triggerEvents: false,
          gamePlayers: false,
        }
      } else {
        // If opening a different dropdown, close all others and open this one
        return {
          adminActions: name === 'adminActions',
          triggerEvents: name === 'triggerEvents',
          gamePlayers: name === 'gamePlayers',
        }
      }
    })
  }

  const eventTriggerConditions = useMemo(() => {
    if (!currentGameState) {
      return {
        triggersEvent0: false,
        triggersEvent2: false,
        tooltipMessage0: 'Game data not available yet.',
        tooltipMessage2: 'Game data not available yet.',
      }
    }

    const { expiryTs, stakingFinalized, prizePool } = currentGameState
    const isExpired = currentTimestamp > Number(expiryTs)
    const gameEnded = prizePool === 0n

    return {
      triggersEvent0: isExpired && !stakingFinalized && !gameEnded,
      triggersEvent2: isExpired && stakingFinalized && !gameEnded,

      tooltipMessage0: gameEnded
        ? 'Action unavailable. Game already ended.'
        : !isExpired
          ? 'Action unavailable. Game phase timer must first expire.'
          : 'Action unavailable. Game already progressed beyond this phase.',

      tooltipMessage2: gameEnded
        ? 'Action unavailable. Game already ended.'
        : stakingFinalized && !isExpired
          ? 'Action unavailable. Game phase timer must first expire.'
          : 'Action unavailable. Game has yet to reach this phase.',
    }
  }, [currentGameState, currentTimestamp])

  useEffect(() => {
    consoleLogger.info('bla', currentGameState?.activePlayers?.toString() ?? 'No active players')
    // setIsViewingGamePlayers(false)
  }, [gameId, currentGameState])

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

    if (bigIntGameId === 0n) {
      setIsGameIdZero(true)
      setCurrentGameState(null)
      setCurrentGamePlayers([])
      return
    }

    try {
      const gameState = await appMethods.readBoxGameState(1001n, activeAddress, bigIntGameId)
      const gamePlayers = await appMethods.readBoxGamePlayers(1001n, activeAddress, bigIntGameId)

      setGameId(bigIntGameId)
      setCurrentGameState(gameState)
      setCurrentGamePlayers(gamePlayers ?? [])
      setIsGameIdZero(false)
    } catch (error) {
      consoleLogger.error('Failed to fetch game state:', error)
      setCurrentGameState(null)
      setCurrentGamePlayers([])
      setIsGameIdZero(false)
    }
  }

  const handleJoinGame = () => {
    if (!appMethods || !activeAddress || !gameId) return

    appMethods.joinGame(1001n, activeAddress, BigInt(gameId))
  }

  const handlePlayGame = async () => {
    if (!appMethods || !activeAddress || !gameId) return

    try {
      await appMethods.playGame(1001n, activeAddress, BigInt(gameId))
    } catch (err) {
      consoleLogger.error('Error during play sequence:', err)
    }
  }

  const handleSetBoxCommitRand = async () => {
    if (!appMethods || !activeAddress || !gameId) return

    try {
      await appMethods.setGameCommit(1001n, activeAddress, BigInt(gameId))
    } catch (err) {
      consoleLogger.error('Error during set box commit rand sequence:', err)
    }
  }

  const handleNumOnlyGameId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numOnlyInput = e.target.value.replace(/\D/g, '')
    setInputedGameId(numOnlyInput)
  }

  const handleTrigGameEvent = async (triggerId: bigint) => {
    if (!activeAddress || !appMethods || !eventTriggerConditions || !gameId) return
    try {
      await appMethods.triggerGameProg(1001n, activeAddress, gameId, triggerId)
      // setIsViewingTriggerEvents(false)
    } catch (err) {
      consoleLogger.error('Error during trigger game event:', err)
    }
  }

  // Render JSX
  return activeAddress ? (
    <div className="">
      {/* <div className="mb-2 font-bold text-indigo-200">
        Current Local Time: <span className="text-cyan-300">{new Date(currentTimestamp * 1000).toLocaleTimeString()}</span>
      </div> */}

      <div className="mb-4 flex items-center gap-4">
        {/* <button
          className="bg-slate-800 text-lime-300 border-2 border-lime-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={() => readBoxGameData(inputedGameId)}
        >
          Create New Game
        </button>
        <span className="font-bold text-indigo-200">|———|</span> */}
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
      </div>
      <table className="min-w-min border border-indigo-300 rounded-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Game ID</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Admin</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Prize Pool</th>
            <th className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">Phase</th>
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
                {gameId?.toString()}
              </td>
              {/* Admin */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2 relative">
                {currentGameState.adminAddress === activeAddress ? (
                  <div className="flex items-center gap-2 relative">
                    <button
                      ref={dropdownBtnRefs.adminActionsBtn} // Add this ref
                      onClick={() => toggleDropdown('adminActions')}
                      className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    >
                      {ellipseAddress(currentGameState.adminAddress)}
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentGameState.adminAddress)
                        consoleLogger.info('Address copied to clipboard:', currentGameState.adminAddress)
                      }}
                      title="Copy full address"
                      className="text-pink-400 hover:text-lime-400 ml-1 text-lg"
                    >
                      🗐
                    </button>

                    {openDropdowns.adminActions && (
                      <div
                        ref={dropdownListRefs.adminActions}
                        className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10"
                      >
                        <ul className="text-sm text-gray-700">
                          <li
                            className="hover:bg-gray-100 px-4 py-2 cursor-pointer"
                            onClick={() => {
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
                  <span className="flex items-center gap-2">
                    {ellipseAddress(currentGameState.adminAddress)}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentGameState.adminAddress)
                        consoleLogger.info('Address copied to clipboard:', currentGameState.adminAddress)
                      }}
                      title="Copy full address"
                      className="text-pink-400 hover:text-lime-400 ml-1 text-lg"
                    >
                      🗐
                    </button>
                  </span>
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
                    <span className="text-red-500">Over</span>
                  ) : currentGameState.stakingFinalized ? (
                    <>
                      <span className="text-cyan-300">Live</span>
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
                      <span className="text-cyan-300 font-bold">Queue</span>
                      {activeAddress !== currentGameState.adminAddress && !currentGamePlayers?.includes(activeAddress ?? '') && (
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
                {currentGameState.stakingFinalized && currentGameState.prizePool !== 0n && gameRegisterData?.gameId === 0n ? (
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
                  ref={dropdownBtnRefs.triggerEventsBtn} // Add this ref
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => toggleDropdown('triggerEvents')}
                >
                  Check
                </button>

                {openDropdowns.triggerEvents && (
                  <div
                    ref={dropdownListRefs.triggerEvents}
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
                  >
                    <ul className="text-sm text-gray-700">
                      <li
                        className={`relative px-4 py-2 ${
                          eventTriggerConditions.triggersEvent0
                            ? 'text-indigo-200 bg-slate-800 border hover:bg-slate-700 border-lime-400 cursor-pointer'
                            : 'bg-slate-800 hover:bg-slate-700 text-gray-400 cursor-help'
                        } group`} // group is required for group-hover
                        onClick={() => handleTrigGameEvent(0n)}
                      >
                        <span className={eventTriggerConditions.triggersEvent0 ? 'text-lime-400 font-bold hover:bg-slate-700' : ''}>
                          0 - Game Live
                        </span>

                        {/* Tooltip shown only when not triggerable */}
                        {!eventTriggerConditions.triggersEvent0 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            {eventTriggerConditions.tooltipMessage0}
                          </div>
                        )}
                      </li>
                      <li
                        className={`relative px-4 py-2 ${
                          eventTriggerConditions.triggersEvent2
                            ? 'text-indigo-200 bg-slate-800 border border-lime-400 cursor-pointer'
                            : 'bg-slate-800 text-gray-400 cursor-help hover:bg-slate-700'
                        } group`} // group is required for group-hover
                        onClick={() => handleTrigGameEvent(2n)}
                      >
                        <span className={eventTriggerConditions.triggersEvent2 ? 'text-lime-400 font-bold' : ''}>2 - Game Over</span>

                        {/* Tooltip shown only when not triggerable */}
                        {!eventTriggerConditions.triggersEvent2 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            {eventTriggerConditions.tooltipMessage2}
                          </div>
                        )}
                      </li>
                    </ul>
                  </div>
                )}
              </td>
              {/* Players */}
              <td className="font-bold text-center text-indigo-200 bg-slate-800 border border-indigo-300">
                <div className="relative inline-block">
                  <button
                    ref={dropdownBtnRefs.gamePlayersBtn} // Add this ref
                    className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                    onClick={() => toggleDropdown('gamePlayers')}
                  >
                    View
                  </button>

                  {openDropdowns.gamePlayers && (
                    <div
                      ref={dropdownListRefs.gamePlayers}
                      className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
                    >
                      <ul className="text-sm text-gray-700">
                        {currentGamePlayers && currentGamePlayers.length > 0 ? (
                          currentGamePlayers.map((address: string, index: number) => (
                            <li
                              key={index}
                              className="bg-slate-800 text-indigo-200 hover:bg-slate-700 px-4 py-2 flex justify-between items-center text-center"
                            >
                              <span className="mx-auto flex items-center gap-2">
                                {ellipseAddress(address)}
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(address)
                                    consoleLogger.info('Copied player address:', address)
                                  }}
                                  title="Copy full address"
                                  className="text-pink-400 hover:text-lime-400 ml-1"
                                >
                                  🗐
                                </button>
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-500 px-4 py-2 text-center">Lobby empty</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </td>

              {/* Leaderboard */}
              <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300">
                <button
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                  onClick={() => toggleModal('leaderboard')}
                >
                  Open
                </button>
              </td>
            </tr>
          ) : (
            <tr>
              <td colSpan={8} className="relative text-center py-4 px-2 text-white">
                {isGameIdZero ? 'Invalid input. Game ID must not be zero.' : 'Game not found. Ensure Game ID is valid.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <ProfileModal {...getModalProps('leaderboard')} />
    </div>
  ) : null
}

export default GameTable
