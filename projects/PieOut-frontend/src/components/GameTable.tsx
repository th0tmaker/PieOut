import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { useDropdownEventListener } from '../hooks/useDropdownEventListener'
import { useCurrentTimestamp } from '../hooks/useCurrentTimestamp'
import ProfileModal from './ProfileModal'
import { useModal } from '../hooks/useModal'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { useGameBoxDataCtx } from '../hooks/useGameBoxDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { CopyAddressBtn } from './CopyAddressBtn'
import { useAppCtx } from '../hooks/useAppCtx'
import { microAlgos } from '@algorandfoundation/algokit-utils'

const GameTable: React.FC = () => {
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { appCreator, appClient } = useAppCtx()
  const [inputedGameId, setInputedGameId] = useState('')

  const { gameId, setGameId } = useGameIdCtx()
  const { gameRegisterData, gameStateData, gamePlayersData, isLoadingGameData, setIsLoadingGameData } = useGameBoxDataCtx() // Add isLoadingGameData
  const currentTimestamp = useCurrentTimestamp()
  const { handle: handleMethod, isLoading: isLoadingMethod } = useMethodHandler()

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
    if (!gameStateData) {
      return {
        canResetGame: false,
        triggersEvent0: false,
        triggersEvent2: false,
        tooltipMessage0: 'Game state data not found.',
        tooltipMessage2: 'Game state data not found.',
      }
    }

    const { expiryTs, stakingFinalized, prizePool } = gameStateData
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
  }, [gameStateData, currentTimestamp])

  const handleNumOnlyGameId = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numOnlyInput = e.target.value.replace(/\D/g, '')
    setInputedGameId(numOnlyInput)
  }

  // Match smart contract logic exactly
  const isAuthorized = activeAddress === gameStateData?.adminAddress || activeAddress === appCreator

  // Two scenarios where deletion is allowed:
  // 1. Admin is sole player (activePlayers = 1, admin is that player)
  const adminIsSolePlayer =
    Number(gameStateData?.activePlayers) === 1 && (activeAddress === gameStateData?.adminAddress || activeAddress === appCreator)
  // 2. No players and no prize pool (activePlayers = 0, prize pool = 0)
  const gameIsEmpty = Number(gameStateData?.activePlayers) === 0 && Number(gameStateData?.prizePool) === 0

  const canResetGame = gameStateData?.prizePool === 0n && activeAddress === gameStateData?.adminAddress
  const canDeleteGame = isAuthorized && (adminIsSolePlayer || gameIsEmpty)

  const deleteGameClasses = canDeleteGame
    ? 'text-lime-400 bg-slate-800 border border-lime-400 hover:bg-slate-700 cursor-pointer'
    : 'bg-slate-800 hover:bg-slate-700 text-gray-400 cursor-help'

  const handleDeleteClick = async () => {
    if (canDeleteGame && !isLoadingMethod) {
      await handleMethod('deleteGame', { gameId })
      setGameId(null)
    }
  }

  // Handle input button click
  const handleInputGameId = () => {
    const newGameId = BigInt(inputedGameId)

    // Set loading state IMMEDIATELY for valid gameIds, before updating gameId
    if (newGameId !== 0n) {
      setIsLoadingGameData(true)
    }

    setGameId(newGameId)
  }

  // Determine what to show in the table body
  const renderTableBody = () => {
    // Show validation error for invalid game IDs (handle this FIRST, before loading)
    if (gameId === 0n) {
      return (
        <tr>
          <td colSpan={8} className="relative text-center py-4 px-2 text-white">
            Invalid input. Game ID must not be zero.
          </td>
        </tr>
      )
    }

    // Show loading state when fetching new game data (only for valid gameIds)
    if (isLoadingGameData && gameId != null) {
      return (
        <tr>
          <td colSpan={8} className="text-center py-4 px-2 text-indigo-200 bg-slate-800">
            <div className="flex items-center justify-center gap-2">
              <span>Loading</span>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-200"></div>
            </div>
          </td>
        </tr>
      )
    }

    // Show "Game ID not found" only if we're not loading and have no data for the current gameId
    if (!gameStateData && gameId != null && !isLoadingGameData) {
      return (
        <tr>
          <td colSpan={8} className="relative text-center py-4 px-2 text-white">
            Game ID not found. Ensure Game ID is valid.
          </td>
        </tr>
      )
    }

    // Show the actual game data
    if (gameStateData && gameId != null) {
      return (
        <tr>
          {/* Game ID */}
          <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-2 py-1">{gameId?.toString()}</td>
          {/* Admin */}
          <td className="font-bold text-center  text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2 relative">
            {isAuthorized ? (
              <div className="flex items-center gap-2 relative">
                <button
                  ref={dropdownBtnRefs.adminActionsBtn} // Add this ref
                  onClick={() => toggleDropdown('adminActions')}
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                >
                  {ellipseAddress(gameStateData.adminAddress)}
                </button>
                <CopyAddressBtn value={gameStateData.adminAddress!} title="Copy full address" />
                {openDropdowns.adminActions && (
                  <div
                    ref={dropdownListRefs.adminActions}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
                  >
                    <ul className="text-sm text-gray-700">
                      <li
                        className={`relative px-4 py-2 ${
                          canResetGame
                            ? 'text-lime-400 bg-slate-800 border border-lime-400 hover:bg-slate-700 cursor-pointer'
                            : 'bg-slate-800 hover:bg-slate-700 text-gray-400 cursor-help'
                        } group`}
                        onClick={() => {
                          if (canResetGame && !isLoadingMethod) {
                            handleMethod('resetGame', { gameId })
                          }
                        }}
                      >
                        <span className={canResetGame ? 'text-lime-400 font-bold' : ''}>Reset Game</span>

                        {!canResetGame && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            You must be the admin and the game must be over to reset it.
                          </div>
                        )}
                      </li>

                      <li className={`relative px-4 py-2 ${deleteGameClasses} group`} onClick={handleDeleteClick}>
                        <span className={canDeleteGame ? 'text-lime-400 font-bold' : ''}>Delete Game</span>
                        {!canDeleteGame && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                            Game must have no active players or admin must be sole active player.
                          </div>
                        )}
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <span className="flex items-center gap-2">
                {ellipseAddress(gameStateData.adminAddress)}
                <CopyAddressBtn value={gameStateData.adminAddress!} title="Copy full address" />
              </span>
            )}
          </td>
          {/* Prize Pool */}
          <td className="font-bold text-center text-cyan-300 bg-slate-800 border border-indigo-300 px-4 py-2">
            {`${microAlgos(gameStateData.prizePool!).algo} Ⱥ`}
          </td>
          {/* Status */}
          <td className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
            <div className="font-bold flex items-center justify-center gap-1">
              {Number(gameStateData.prizePool) === 0 ? (
                <span className="text-red-500">Over</span>
              ) : gameStateData.stakingFinalized ? (
                <>
                  <span className="text-cyan-300">Live</span>
                  {activeAddress && gamePlayersData?.includes(activeAddress ?? '') ? (
                    <>
                      {' / '}
                      <button
                        onClick={() => handleMethod('playGame', { gameId })}
                        disabled={isLoadingMethod}
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
                  {activeAddress && activeAddress !== gameStateData.adminAddress && !gamePlayersData?.includes(activeAddress) && (
                    <>
                      {' / '}
                      <button
                        onClick={() => handleMethod('joinGame', { gameId })}
                        disabled={isLoadingMethod}
                        className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                      >
                        Join
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            {Number(gameStateData.prizePool) !== 0 && (
              <div className="text-xs text-white">{new Date(Number(gameStateData.expiryTs) * 1000).toLocaleString()}</div>
            )}{' '}
          </td>
          {/* Set */}
          <td className="font-bold text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
            {gameStateData.stakingFinalized && gameStateData.prizePool !== 0n && gameRegisterData?.gameId === 0n ? (
              <button
                className="text-lime-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                onClick={() => handleMethod('setGameCommit', { gameId })}
                disabled={isLoadingMethod}
              >
                Set
              </button>
            ) : (
              <div className="group inline-block relative">
                <span className="text-indigo-200 cursor-help">Set</span>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                  {!gameStateData.stakingFinalized
                    ? 'Unavailable: This game has not started yet.'
                    : gameStateData.prizePool === 0n
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

            {activeAddress && openDropdowns.triggerEvents && (
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
                    onClick={() => handleMethod('triggerGameEvent', { gameId: gameId, triggerId: 0n })}
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
                    onClick={() => handleMethod('triggerGameEvent', { gameId: gameId, triggerId: 2n })}
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
                    {gamePlayersData && gamePlayersData.length > 0 ? (
                      gamePlayersData.map((address: string, index: number) => (
                        <li
                          key={index}
                          className="bg-slate-800 text-indigo-200 hover:bg-slate-700 px-4 py-2 flex justify-between items-center text-center"
                        >
                          <span className="mx-auto flex items-center gap-2">
                            {ellipseAddress(address)}
                            <CopyAddressBtn value={address!} title="Copy full address" />
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
      )
    }

    // Default empty state when no gameId is selected
    return (
      <tr>
        <td colSpan={8} className="relative text-center py-4 px-2 text-white">
          {activeAddress
            ? "Enter number and click the 'Input' button to look up a game"
            : 'Please connect your wallet in order to continue.'}
        </td>
      </tr>
    )
  }

  useEffect(() => {
    const fetchActiveGames = async () => {
      consoleLogger.info('Fetching active games...')

      try {
        const activeGames = await appClient!.state.box.boxGameState.getMap()

        activeGames.forEach((value, key) => {
          consoleLogger.info('Game ID:', key.toString(), value)
        })
      } catch (err) {
        consoleLogger.error('Failed to fetch active games:', err)
      }

      consoleLogger.info('Players:', gameStateData?.activePlayers?.toString() ?? 'No active players')
    }

    if (gameId && appClient) {
      fetchActiveGames()
    }
  }, [gameId, gameStateData])

  useEffect(() => {
    consoleLogger.info('bla', gameStateData?.activePlayers?.toString() ?? 'No active players')
    consoleLogger.info(String(eventTriggerConditions.triggersEvent2))
    // consoleLogger.info(String(adminIsSolePlayer))
    // consoleLogger.info(String(gameIsEmpty))
    // consoleLogger.info(gameStateData?.activePlayers.toString() ?? 'abc')
  }, [gameId, gameStateData])

  // Render JSX
  return (
    <div>
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
          onClick={handleInputGameId}
          disabled={!inputedGameId || isLoadingGameData}
        >
          {isLoadingGameData ? 'Loading...' : 'Input'}
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
          {!activeAddress ? (
            <tr>
              <td colSpan={8} className="text-center py-4 px-2 text-white">
                Please connect your wallet in order to continue.
              </td>
            </tr>
          ) : (
            renderTableBody()
          )}
        </tbody>{' '}
      </table>
      <ProfileModal {...getModalProps('leaderboard')} />
    </div>
  )
}

export default GameTable
