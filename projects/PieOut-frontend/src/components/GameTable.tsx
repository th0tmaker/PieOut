// FOR SOME REASON, IF DROPDOWNMENU TRIGGER IS OPEN AND THE CURRENT TIMESTAMP IS GREATER THAN EXPIRY TIMESTAMP, IT REJECTS
// NEW COMPONENT THAT IS A LIST OF DATA FROM ALGORAND APP SUBSCRIBER, SHOULD SORT BY GAME ID
import { microAlgos } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppCtx } from '../hooks/useAppCtx'
import { useCurrentTimestamp } from '../hooks/useCurrentTimestamp'
import { useDropdownEventListener } from '../hooks/useDropdownEventListener'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { useLastRound } from '../hooks/useLastRound'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import ActivePlayersModal from '../modals/ActivePlayersModal'
import LeaderboardModal from '../modals/LeaderboardModal'
import { ellipseAddress } from '../utils/ellipseAddress'
import { algorand } from '../utils/network/getAlgorandClient'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import { useGameIdSanitizer } from '../hooks/useSanitizeInputs'
import { Tooltip } from '../components/Tooltip'
import { TableBtn } from '../buttons/TableBtn'

// Reusable components
const TableCell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const baseClasses = 'font-bold text-center bg-slate-800 border border-indigo-300 px-4 py-2'
  const textColor = /\btext-(?:\w+)-\d{3}\b/.test(className) ? '' : 'text-indigo-200'
  return <td className={`${baseClasses} ${textColor} ${className}`}>{children}</td>
}

const DropdownItem = ({
  enabled,
  onClick,
  children,
  tooltipMessage,
}: {
  enabled: boolean
  onClick: () => void
  children: React.ReactNode
  tooltipMessage?: string
}) => (
  <li
    className={`relative px-4 py-2 group ${
      enabled
        ? 'text-lime-400 bg-slate-800 border border-lime-400 hover:bg-slate-700 cursor-pointer'
        : 'bg-slate-800 hover:bg-slate-700 text-gray-400 cursor-help'
    }`}
    onClick={() => enabled && onClick()}
  >
    <span className={enabled ? 'text-lime-400 font-bold' : ''}>{children}</span>
    {!enabled && tooltipMessage && (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
        {tooltipMessage}
      </div>
    )}
  </li>
)

const LoadingSpinner = () => (
  <div className="flex items-center justify-center gap-2">
    <span>Processing...</span>
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-200" />
  </div>
)

const GameTable: React.FC = React.memo(() => {
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { appCreator } = useAppCtx()
  const [inputedGameId, setInputedGameId] = useState('')
  const { lastRound } = useLastRound(algorand.client.algod)
  const { gameId, setGameId } = useGameIdCtx()
  const { gameRegisterData, gameStateData, gamePlayersData, isGameDataLoading, setIsGameDataLoading } = useGameDataCtx()
  const sanitizeGameIdInput = useGameIdSanitizer(setInputedGameId)
  const currentTimestamp = useCurrentTimestamp()
  const { handle: handleMethod, isLoading: isLoadingMethod } = useMethodHandler()

  // Expected states for optimistic UI updates
  const [expectedStates, setExpectedStates] = useState({
    join: false,
    play: false,
    set: false,
    waitingForCommitRound: false,
    reset: false,
    gameLive: false,
    gameOver: false,
  })

  const [openDropdowns, setOpenDropdowns] = useState({
    adminActions: false,
    triggerEvents: false,
    gamePlayers: false,
  })

  // Refs for dropdown handling
  const dropdownListRefs = {
    adminActions: useRef<HTMLDivElement>(null),
    triggerEvents: useRef<HTMLDivElement>(null),
    gamePlayers: useRef<HTMLDivElement>(null),
  }

  const dropdownBtnRefs = {
    adminActionsBtn: useRef<HTMLButtonElement>(null),
    triggerEventsBtn: useRef<HTMLButtonElement>(null),
    gamePlayersBtn: useRef<HTMLButtonElement>(null),
  }

  // Computed states
  const accState = useMemo(() => {
    const isAuthorized = activeAddress === gameStateData?.adminAddress || activeAddress === appCreator
    const isAdminSolePlayer = Number(gameStateData?.activePlayers) === 1 && isAuthorized
    const gameIsEmpty = Number(gameStateData?.activePlayers) === 0 && Number(gameStateData?.prizePool) === 0
    const canResetGame = gameStateData?.prizePool === 0n && activeAddress === gameStateData?.adminAddress
    const canDeleteGame = isAuthorized && (isAdminSolePlayer || gameIsEmpty)

    return { isAuthorized, canResetGame, canDeleteGame }
  }, [activeAddress, gameStateData, appCreator])

  const eventTriggerConditions = useMemo(() => {
    if (!gameStateData)
      return {
        triggersEvent0: false,
        triggersEvent2: false,
        tooltipMessage0: 'Game state data not found.',
        tooltipMessage2: 'Game state data not found.',
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

  // Helper functions
  const resetExpectedStates = useCallback(() => {
    setExpectedStates({
      join: false,
      play: false,
      set: false,
      waitingForCommitRound: false,
      reset: false,
      gameLive: false,
      gameOver: false,
    })
  }, [])

  const updateExpectedState = useCallback((key: keyof typeof expectedStates, value: boolean) => {
    setExpectedStates((prev) => ({ ...prev, [key]: value }))
  }, [])

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns({ adminActions: false, triggerEvents: false, gamePlayers: false })
  }, [])

  const toggleDropdown = useCallback((name: keyof typeof openDropdowns) => {
    setOpenDropdowns((prev) => ({
      adminActions: name === 'adminActions' ? !prev[name] : false,
      triggerEvents: name === 'triggerEvents' ? !prev[name] : false,
      gamePlayers: name === 'gamePlayers' ? !prev[name] : false,
    }))
  }, [])

  // Action handlers
  const handleGameIdInput = useCallback(() => {
    const newGameId = BigInt(inputedGameId)
    if (newGameId !== 0n) setIsGameDataLoading(true)
    setGameId(newGameId)
  }, [inputedGameId, setIsGameDataLoading, setGameId])

  const handleJoinTxn = useCallback(async () => {
    if (!activeAddress) return
    try {
      updateExpectedState('join', true)
      await handleMethod('joinGame', { gameId })
    } catch (error) {
      updateExpectedState('join', false)
      throw error
    }
  }, [handleMethod, gameId, activeAddress, updateExpectedState])

  const handlePlayTxn = useCallback(async () => {
    try {
      updateExpectedState('play', true)
      await handleMethod('playGame', { gameId })
    } catch (error) {
      updateExpectedState('play', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  const handleSetTxn = useCallback(async () => {
    try {
      updateExpectedState('set', true)
      await handleMethod('setGameCommit', { gameId })
    } catch (error) {
      updateExpectedState('set', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  const handleDeleteTxn = useCallback(async () => {
    if (accState.canDeleteGame && !isLoadingMethod) {
      await handleMethod('deleteGame', { gameId })
      setGameId(null)
    }
  }, [accState.canDeleteGame, isLoadingMethod, handleMethod, gameId, setGameId])

  const handleResetTxn = useCallback(async () => {
    if (accState.canResetGame && !isLoadingMethod) {
      try {
        updateExpectedState('reset', true)
        await handleMethod('resetGame', { gameId })
      } catch (error) {
        updateExpectedState('reset', false)
        throw error
      }
    }
  }, [accState.canResetGame, isLoadingMethod, handleMethod, gameId, updateExpectedState])

  const handleTriggerGameLive = useCallback(async () => {
    try {
      updateExpectedState('gameLive', true)
      await handleMethod('triggerGameEvent', { gameId, triggerId: 0n })
    } catch (error) {
      updateExpectedState('gameLive', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  const handleTriggerGameOver = useCallback(async () => {
    try {
      updateExpectedState('gameOver', true)
      await handleMethod('triggerGameEvent', { gameId, triggerId: 2n })
    } catch (error) {
      updateExpectedState('gameOver', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  // Effects for state management
  useEffect(() => resetExpectedStates(), [activeAddress, resetExpectedStates])

  useEffect(() => {
    if (expectedStates.join && activeAddress && gamePlayersData?.includes(activeAddress)) {
      updateExpectedState('join', false)
    }
  }, [expectedStates.join, activeAddress, gamePlayersData, updateExpectedState])

  useEffect(() => {
    if (expectedStates.play && gameStateData && Number(gameStateData.prizePool) === 0) {
      updateExpectedState('play', false)
    }
  }, [expectedStates.play, gameStateData, updateExpectedState])

  useEffect(() => {
    if (expectedStates.set && gameRegisterData && gameRegisterData.gameId !== 0n) {
      updateExpectedState('set', false)
      const wasCommitRandRoundReached =
        typeof lastRound === 'number' && lastRound !== null && BigInt(lastRound) >= gameRegisterData.commitRandRound
      if (!wasCommitRandRoundReached) {
        updateExpectedState('waitingForCommitRound', true)
      }
    }
  }, [expectedStates.set, gameRegisterData, lastRound, updateExpectedState])

  useEffect(() => {
    if (expectedStates.waitingForCommitRound && gameRegisterData && lastRound) {
      const wasCommitRandRoundReached = typeof lastRound === 'number' && BigInt(lastRound) >= gameRegisterData.commitRandRound
      if (wasCommitRandRoundReached) {
        updateExpectedState('waitingForCommitRound', false)
      }
    }
  }, [expectedStates.waitingForCommitRound, gameRegisterData, lastRound, updateExpectedState])

  // New effects for reset, gameLive, and gameOver expected states
  useEffect(() => {
    if (expectedStates.reset && gameStateData) {
      const isResetComplete = Number(gameStateData.activePlayers) === 1 && !gameStateData.stakingFinalized
      if (isResetComplete) {
        updateExpectedState('reset', false)
      }
    }
  }, [expectedStates.reset, gameStateData, updateExpectedState])

  useEffect(() => {
    if (expectedStates.gameLive && gameStateData && gameStateData.stakingFinalized) {
      updateExpectedState('gameLive', false)
    }
  }, [expectedStates.gameLive, gameStateData, updateExpectedState])

  useEffect(() => {
    if (expectedStates.gameOver && gameStateData && Number(gameStateData.prizePool) === 0) {
      updateExpectedState('gameOver', false)
    }
  }, [expectedStates.gameOver, gameStateData, updateExpectedState])

  // Dropdown event listener
  useDropdownEventListener({
    dropdownListRefs: Object.values(dropdownListRefs),
    dropdownBtnRefs: Object.values(dropdownBtnRefs),
    isOpen: Object.values(openDropdowns),
    onClose: closeAllDropdowns,
    listenEscape: true,
  })

  // Render functions
  const renderAdminDropdown = useCallback(() => {
    if (!openDropdowns.adminActions) return null

    const isResetLoading = isLoadingMethod || expectedStates.reset

    return (
      <div
        ref={dropdownListRefs.adminActions}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
      >
        <ul className="text-sm text-gray-700">
          <DropdownItem
            enabled={accState.canResetGame && !isResetLoading}
            onClick={handleResetTxn}
            tooltipMessage="You must be the admin and the game must be over to reset it."
          >
            {isResetLoading ? <LoadingSpinner /> : 'Reset Game'}
          </DropdownItem>
          <DropdownItem
            enabled={accState.canDeleteGame}
            onClick={handleDeleteTxn}
            tooltipMessage="Game must have no active players or admin must be sole active player."
          >
            {isLoadingMethod ? <LoadingSpinner /> : 'Delete Game'}
          </DropdownItem>
        </ul>
      </div>
    )
  }, [openDropdowns.adminActions, accState, isLoadingMethod, expectedStates.reset, handleResetTxn, handleDeleteTxn])

  const renderTriggerDropdown = useCallback(() => {
    if (!openDropdowns.triggerEvents || !activeAddress) return null

    const isGameLiveLoading = isLoadingMethod || expectedStates.gameLive
    const isGameOverLoading = isLoadingMethod || expectedStates.gameOver

    return (
      <div
        ref={dropdownListRefs.triggerEvents}
        className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
      >
        <ul className="text-sm text-gray-700">
          <DropdownItem
            enabled={eventTriggerConditions.triggersEvent0 && !isGameLiveLoading}
            onClick={handleTriggerGameLive}
            tooltipMessage={eventTriggerConditions.tooltipMessage0}
          >
            {isGameLiveLoading ? <LoadingSpinner /> : '0 - Game Live'}
          </DropdownItem>
          <DropdownItem
            enabled={eventTriggerConditions.triggersEvent2 && !isGameOverLoading}
            onClick={handleTriggerGameOver}
            tooltipMessage={eventTriggerConditions.tooltipMessage2}
          >
            {isGameOverLoading ? <LoadingSpinner /> : '2 - Game Over'}
          </DropdownItem>
        </ul>
      </div>
    )
  }, [
    openDropdowns.triggerEvents,
    activeAddress,
    eventTriggerConditions,
    expectedStates.gameLive,
    expectedStates.gameOver,
    isLoadingMethod,
    handleTriggerGameLive,
    handleTriggerGameOver,
  ])

  const renderPhaseContent = useCallback(() => {
    if (!gameStateData || !activeAddress) return null

    const isGameOver = Number(gameStateData.prizePool) === 0
    const isPlayerInGame = gamePlayersData?.includes(activeAddress) || false
    const isAdmin = activeAddress === gameStateData.adminAddress
    const hasGameRegisterData = gameRegisterData !== undefined

    if (isGameOver) return <span className="text-red-500">Over</span>

    const wasCommitRandRoundReached = (lastRound: number | null, commitRandRound: bigint) =>
      typeof lastRound === 'number' && lastRound !== null && BigInt(lastRound) >= commitRandRound

    if (gameStateData.stakingFinalized) {
      // LIVE PHASE
      const canPlay =
        gameRegisterData?.gameId === gameId &&
        gameStateData.stakingFinalized &&
        isPlayerInGame &&
        hasGameRegisterData &&
        currentTimestamp <= Number(gameStateData.expiryTs) &&
        wasCommitRandRoundReached(lastRound, gameRegisterData.commitRandRound)

      const isPlayLoading = isLoadingMethod || expectedStates.play || expectedStates.set || expectedStates.waitingForCommitRound

      const playTooltipMessage = !hasGameRegisterData
        ? 'Unavailable: Registration required for use.'
        : !isPlayerInGame
          ? 'Unavailable: You are not an active player in this game.'
          : !gameStateData.stakingFinalized
            ? 'Unavailable: This game has not started yet.'
            : currentTimestamp > Number(gameStateData.expiryTs)
              ? 'Unavailable: Live phase has ended. Pending game over trigger...'
              : !wasCommitRandRoundReached(lastRound, gameRegisterData.commitRandRound)
                ? 'Unavailable: Randomness commitment round not yet reached'
                : 'Unavailable: A commit must be set first in order to play.'

      return (
        <>
          <span className="text-cyan-300">Live</span>
          {isPlayerInGame && (
            <>
              {' / '}
              <TableBtn
                onClick={handlePlayTxn}
                disabled={!canPlay || isPlayLoading}
                tooltipMessage={!canPlay && !isPlayLoading ? playTooltipMessage : undefined}
              >
                Play
              </TableBtn>
            </>
          )}
        </>
      )
    } else {
      // QUEUE/JOIN PHASE
      const canJoin =
        !gameStateData.stakingFinalized && !isPlayerInGame && hasGameRegisterData && currentTimestamp <= Number(gameStateData.expiryTs)
      const isJoinLoading = isLoadingMethod || expectedStates.join

      const joinTooltipMessage = !hasGameRegisterData
        ? 'Unavailable: Game register profile required.'
        : gameStateData.stakingFinalized
          ? 'Unavailable: This game has already started.'
          : isPlayerInGame
            ? 'Unavailable: You are already in this game.'
            : currentTimestamp > Number(gameStateData.expiryTs)
              ? 'Unavailable: Queue phase timer expired.'
              : 'Unavailable: Transaction is processing.'

      return (
        <>
          <span className="text-cyan-300 font-bold">Queue</span>
          {activeAddress && !isAdmin && !isPlayerInGame && (
            <>
              {' / '}
              <TableBtn
                onClick={handleJoinTxn}
                disabled={!canJoin || isJoinLoading}
                tooltipMessage={!canJoin && !isJoinLoading ? joinTooltipMessage : undefined}
              >
                Join
              </TableBtn>
            </>
          )}
        </>
      )
    }
  }, [
    gameStateData,
    currentTimestamp,
    activeAddress,
    gamePlayersData,
    gameRegisterData,
    lastRound,
    handleJoinTxn,
    handlePlayTxn,
    expectedStates,
    isLoadingMethod,
    gameId,
  ])

  const renderSetContent = useCallback(() => {
    if (!gameStateData || !activeAddress) return null

    const isPlayerInGame = gamePlayersData?.includes(activeAddress) || false
    const canSet =
      gameStateData.stakingFinalized &&
      isPlayerInGame &&
      gameRegisterData !== undefined &&
      gameRegisterData.gameId === 0n &&
      currentTimestamp <= Number(gameStateData.expiryTs)

    const isSetLoading = isLoadingMethod || expectedStates.set
    const tooltipMessage = !gameStateData.stakingFinalized
      ? 'Unavailable: Game has not started yet.'
      : !isPlayerInGame
        ? 'Unavailable: You are not an active player in this game.'
        : gameRegisterData === undefined
          ? 'Unavailable: Game register data not available.'
          : gameRegisterData.gameId !== 0n
            ? 'Unavailable: Prior commitment unresolved.'
            : 'Unavailable: Commitment set deadline expired.'

    if (canSet && !isSetLoading) {
      return <TableBtn onClick={handleSetTxn}>Set</TableBtn>
    }

    if (isSetLoading) {
      return (
        <TableBtn onClick={() => {}} disabled>
          Set
        </TableBtn>
      )
    }

    return <Tooltip message={tooltipMessage}>Set</Tooltip>
  }, [gameStateData, gameRegisterData, gamePlayersData, activeAddress, handleSetTxn, expectedStates.set, isLoadingMethod, currentTimestamp])

  const renderTableBody = useCallback(() => {
    if (gameId === 0n) {
      return (
        <tr>
          <td colSpan={9} className="relative text-center py-4 px-2 text-white">
            Invalid input. Game ID must not be zero.
          </td>
        </tr>
      )
    }

    if (isGameDataLoading && gameId != null) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-4 px-2 text-indigo-200 bg-slate-800">
            <LoadingSpinner />
          </td>
        </tr>
      )
    }

    if (!gameStateData && gameId != null && !isGameDataLoading) {
      return (
        <tr>
          <td colSpan={9} className="relative text-center py-4 px-2 text-white">
            Game ID not found. Ensure Game ID is valid.
          </td>
        </tr>
      )
    }

    if (gameStateData && gameId != null) {
      return (
        <tr>
          <TableCell>{gameId?.toString()}</TableCell>

          <TableCell className="relative">
            {accState.isAuthorized ? (
              <div className="flex items-center gap-2 relative">
                <button
                  ref={dropdownBtnRefs.adminActionsBtn}
                  onClick={() => toggleDropdown('adminActions')}
                  className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
                >
                  {ellipseAddress(gameStateData.adminAddress)}
                </button>
                <CopyAddressBtn value={gameStateData.adminAddress!} title="Copy full address" />
                {renderAdminDropdown()}
              </div>
            ) : (
              <span className="flex items-center gap-2">
                {ellipseAddress(gameStateData.adminAddress)}
                <CopyAddressBtn value={gameStateData.adminAddress} title="Copy full address" />
              </span>
            )}
          </TableCell>

          <TableCell className="text-cyan-300">{`${microAlgos(gameStateData.prizePool!).algo} Ⱥ`}</TableCell>

          <TableCell className="text-indigo-200">
            <div className="font-bold flex items-center justify-center gap-1">{renderPhaseContent()}</div>
            {Number(gameStateData.prizePool) !== 0 && (
              <div className="text-xs text-white">{new Date(Number(gameStateData.expiryTs) * 1000).toLocaleString()}</div>
            )}
          </TableCell>

          <TableCell>{renderSetContent()}</TableCell>

          <TableCell className="relative">
            <button
              ref={dropdownBtnRefs.triggerEventsBtn}
              className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
              onClick={() => toggleDropdown('triggerEvents')}
            >
              Check
            </button>
            {renderTriggerDropdown()}
          </TableCell>

          <TableCell>
            <button
              className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
              onClick={() => toggleModal('activePlayers')}
            >
              Open
            </button>
          </TableCell>

          <TableCell>
            <button
              className="text-pink-400 font-bold hover:underline hover:decoration-2 hover:underline-offset-2 focus:outline-none"
              onClick={() => toggleModal('leaderboard')}
            >
              Open
            </button>
          </TableCell>

          <TableCell className="text-indigo-200">
            <div className="font-bold flex items-center justify-center gap-1">
              <span className="text-cyan-300">{gameStateData.topScore.toString()}</span>
            </div>
            <div className="text-xs text-white flex items-center gap-1">
              <span>{ellipseAddress(gameStateData.topscorerAddress, 6)}</span>
              <CopyAddressBtn className="text-sm" value={gameStateData.topscorerAddress} title="Copy full address" />
            </div>
          </TableCell>
        </tr>
      )
    }

    return (
      <tr>
        <td colSpan={9} className="relative text-center py-4 px-2 text-white">
          {activeAddress ? "Enter Game ID and click 'Input' to look up game state" : 'Wallet connection required.'}
        </td>
      </tr>
    )
  }, [
    gameId,
    isGameDataLoading,
    gameStateData,
    accState,
    activeAddress,
    renderAdminDropdown,
    renderPhaseContent,
    renderSetContent,
    renderTriggerDropdown,
    toggleDropdown,
    toggleModal,
  ])

  if (!activeAddress) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-4">
          <label className="font-bold text-indigo-200">Look Up Game by ID:</label>
          <input
            className="w-54 font-bold text-center text-white bg-slate-800 border-2 border-pink-400 rounded px-3 py-1 opacity-50 cursor-help"
            type="text"
            disabled
            placeholder="Game ID"
          />
          <span className="font-bold text-indigo-200">:</span>
          <button className="bg-slate-800 text-gray-400 border-2 border-gray-500 px-3 py-1 rounded cursor-help font-semibold" disabled>
            Input
          </button>
        </div>
        <table className="min-w-min border border-indigo-300 rounded-md">
          <thead className="bg-gray-100">
            <tr>
              {['Game ID', 'Admin', 'Prize Pool', 'Phase', 'Commit', 'Trigger', 'Players', 'Leaderboard', 'Top Score'].map((header) => (
                <th key={header} className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={9} className="text-center py-4 px-2 text-white">
                Please connect your wallet in order to continue.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

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
          onChange={sanitizeGameIdInput}
          maxLength={20}
          inputMode="numeric"
          placeholder="Game ID"
        />
        <span className="font-bold text-indigo-200">:</span>
        <button
          className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={handleGameIdInput}
          disabled={!inputedGameId || isGameDataLoading}
        >
          {isGameDataLoading ? 'Loading...' : 'Input'}
        </button>
      </div>

      <table className="min-w-min border border-indigo-300 rounded-md">
        <thead className="bg-gray-100">
          <tr>
            {['Game ID', 'Admin', 'Prize Pool', 'Phase', 'Commit', 'Trigger', 'Players', 'Leaderboard', 'Top Score'].map((header) => (
              <th key={header} className="text-center text-indigo-200 bg-slate-800 border border-indigo-300 px-4 py-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderTableBody()}</tbody>
      </table>

      <ActivePlayersModal {...getModalProps('activePlayers')} />
      <LeaderboardModal {...getModalProps('leaderboard')} />
    </div>
  )
})

export default GameTable
