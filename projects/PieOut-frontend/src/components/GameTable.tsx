//src/components/GameTable.tsx
import { microAlgos } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import { TableBtn } from '../buttons/TableBtn'
import { Tooltip } from '../components/Tooltip'
import { useAppCtx } from '../hooks/useAppCtx'
import { useCurrentTimestamp } from '../hooks/useCurrentTimestamp'
import { useDropdownEventListener } from '../hooks/useDropdownEventListener'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { useLastRound } from '../hooks/useLastRound'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { useGameIdSanitizer } from '../hooks/useSanitizeInputs'
import ActivePlayersModal from '../modals/ActivePlayersModal'
import LeaderboardModal from '../modals/LeaderboardModal'
import { ellipseAddress } from '../utils/ellipseAddress'
import { algorand } from '../utils/network/getAlgorandClient'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

// Create a reusable styled <td> component that will represent the table cell
const TableCell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const baseClasses = 'font-bold text-center bg-slate-800 border border-indigo-300 px-4 py-2'
  const textColor = /\btext-(?:\w+)-\d{3}\b/.test(className) ? '' : 'text-indigo-200'
  return <td className={`${baseClasses} ${textColor} ${className}`}>{children}</td>
}

// Create a simple load animation with text and animate-spin indicator
const LoadSpinner = () => (
  <div className="flex items-center justify-center gap-2">
    <span>Processing...</span>
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-200" />
  </div>
)

// Create a dropdown option item with optional load state and tooltip
const DropdownOption = ({
  enabled,
  onClick,
  children,
  loading,
  tooltipMessage,
}: {
  enabled: boolean
  onClick: () => void
  children: React.ReactNode
  loading?: boolean
  tooltipMessage?: string
}) => (
  <li
    className={`relative px-4 py-2 group ${
      enabled && !loading
        ? 'text-lime-400 bg-slate-800 border border-lime-400 hover:bg-slate-700 cursor-pointer'
        : 'bg-slate-800 hover:bg-slate-700 text-gray-400 cursor-help'
    }`}
    onClick={() => enabled && !loading && onClick()}
  >
    <span className={enabled && !loading ? 'text-lime-400 font-bold' : ''}>
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-200" />
        </div>
      ) : (
        children
      )}
    </span>
    {(!enabled || loading) && tooltipMessage && (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
        {tooltipMessage}
      </div>
    )}
  </li>
)

const GameTable: React.FC = React.memo(() => {
  // Hooks
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { appMethods, appClient, appCreator, isLoading: appIsLoading } = useAppCtx()
  const { handle: handleMethod, isLoading: isLoadingMethod } = useMethodHandler()
  const { lastRound } = useLastRound(algorand.client.algod)
  const currentTimestamp = useCurrentTimestamp()
  const { gameId, setGameId } = useGameIdCtx()
  const { gameRegisterData, gameStateData, gamePlayersData, isGameDataLoading, setIsGameDataLoading } = useGameDataCtx()

  // Create a safe setter that ensures the value is always a string
  const safeSetInputedGameId = useCallback((val: string | null | undefined) => {
    setInputedGameId(val ?? '') // always fallback to empty string
  }, [])
  const sanitizeGameIdInput = useGameIdSanitizer(safeSetInputedGameId)

  // States
  const [inputedGameId, setInputedGameId] = useState<string>('')
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

  // Memos
  const accState = useMemo(() => {
    const isAuthorized = activeAddress === gameStateData?.adminAddress || activeAddress === appCreator
    const isAdminSolePlayer = Number(gameStateData?.activePlayers) === 1 && isAuthorized
    const gameIsEmpty = Number(gameStateData?.activePlayers) === 0 && Number(gameStateData?.prizePool) === 0
    const canResetGame = gameStateData?.prizePool === 0n && activeAddress === gameStateData?.adminAddress && !isLoadingMethod
    const canDeleteGame = isAuthorized && (isAdminSolePlayer || gameIsEmpty) && !isLoadingMethod

    return { isAuthorized, canResetGame, canDeleteGame, isAdminSolePlayer }
  }, [activeAddress, gameStateData, appCreator, isLoadingMethod])

  const eventTriggerConditions = useMemo(() => {
    // If no game state data found, return early
    if (!gameStateData)
      return {
        triggersEvent0: false,
        triggersEvent2: false,
        tooltipMessage0: 'Game state data not found.',
        tooltipMessage2: 'Game state data not found.',
      }

    // Get relevant data from game state box
    const { expiryTs, stakingFinalized, prizePool } = gameStateData
    const TIMING_BUFFER_SECONDS = 10 // Add a 10 second buffer to compensate for blockchain delay

    // Define boolean conditions for when phase has expired and game is over
    const isExpired = currentTimestamp > Number(expiryTs) + TIMING_BUFFER_SECONDS
    const gameEnded = prizePool === 0n // Game is over when prize pool amount is 0

    return {
      triggersEvent0: isExpired && !stakingFinalized && !gameEnded,
      triggersEvent2: isExpired && stakingFinalized && !gameEnded,
      tooltipMessage0: gameEnded
        ? 'Unavailable. Game already ended.'
        : !isExpired
          ? 'Unavailable. Game phase timer must first expire.'
          : stakingFinalized
            ? 'Unavailable. Game already progressed beyond this phase.'
            : accState.isAdminSolePlayer
              ? 'Will transition directly to game over as sole player.'
              : 'Will transition game to live phase.',
      tooltipMessage2: gameEnded
        ? 'Unavailable. Game already ended.'
        : !isExpired
          ? 'Unavailable. Game phase timer must first expire.'
          : !stakingFinalized
            ? 'Unavailable. Game must be live first.'
            : 'Will end the game and distribute prizes.',
    }
  }, [gameStateData, currentTimestamp, accState.isAdminSolePlayer])

  // Callbacks
  // Reset all expected state flags to false
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

  // Update a specific expected state flag by key
  const updateExpectedState = useCallback((key: keyof typeof expectedStates, value: boolean) => {
    setExpectedStates((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Close all dropdown menus
  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns({ adminActions: false, triggerEvents: false, gamePlayers: false })
  }, [])

  // Toggle a specific dropdown menu while closing others
  const toggleDropdown = useCallback((name: keyof typeof openDropdowns) => {
    setOpenDropdowns((prev) => ({
      adminActions: name === 'adminActions' ? !prev[name] : false,
      triggerEvents: name === 'triggerEvents' ? !prev[name] : false,
      gamePlayers: name === 'gamePlayers' ? !prev[name] : false,
    }))
  }, [])

  // Handlers
  // Handle game ID input and update state
  const handleGameIdInput = useCallback(() => {
    const newGameId = BigInt(inputedGameId ?? '0')
    if (newGameId !== 0n) setIsGameDataLoading(true)
    setGameId(newGameId)
  }, [inputedGameId, setIsGameDataLoading, setGameId])

  // Handle join game transaction method call
  const handleJoinGameTxn = useCallback(async () => {
    if (!activeAddress) return
    try {
      updateExpectedState('join', true)
      await handleMethod('joinGame', { gameId })
    } catch (error) {
      updateExpectedState('join', false)
      throw error
    }
  }, [handleMethod, gameId, activeAddress, updateExpectedState])

  // Handle play game transaction method call
  const handlePlayGameTxn = useCallback(async () => {
    try {
      updateExpectedState('play', true)
      await handleMethod('playGame', { gameId })
    } catch (error) {
      updateExpectedState('play', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  // Handle set commit game transaction method call
  const handleSetCommitGameTxn = useCallback(async () => {
    try {
      updateExpectedState('set', true)
      await handleMethod('setGameCommit', { gameId })
    } catch (error) {
      updateExpectedState('set', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  // Handle reset game transaction method call
  const handleResetGameTxn = useCallback(async () => {
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

  // Handle delete game transaction method call
  const handleDeleteGameTxn = useCallback(async () => {
    if (accState.canDeleteGame && !isLoadingMethod) {
      await handleMethod('deleteGame', { gameId })
      setGameId(null)
    }
  }, [accState.canDeleteGame, isLoadingMethod, handleMethod, gameId, setGameId])

  // Handle trigger game event transaction method call for event 0
  const handleTriggerGameLive = useCallback(async () => {
    if (!appMethods || !appClient || !activeAddress || !gameId) return
    try {
      updateExpectedState('gameLive', true)
      await handleMethod('triggerGameEvent', { gameId, triggerId: 0n })
    } catch (error) {
      updateExpectedState('gameLive', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  // Handle trigger game event transaction method call for event 2
  const handleTriggerGameOver = useCallback(async () => {
    try {
      updateExpectedState('gameOver', true)
      await handleMethod('triggerGameEvent', { gameId, triggerId: 2n })
    } catch (error) {
      updateExpectedState('gameOver', false)
      throw error
    }
  }, [handleMethod, gameId, updateExpectedState])

  // Effects
  // Reset expected states when active address changes
  useEffect(() => resetExpectedStates(), [activeAddress, resetExpectedStates])

  // Reset inputedGameId when wallet disconnects to prevent controlled/uncontrolled input warning
  useEffect(() => {
    if (!activeAddress) {
      safeSetInputedGameId('')
    }
  }, [activeAddress, safeSetInputedGameId])

  // Reset join state once player successfully joins
  useEffect(() => {
    if (expectedStates.join && activeAddress && gamePlayersData?.includes(activeAddress)) {
      updateExpectedState('join', false)
    }
  }, [expectedStates.join, activeAddress, gamePlayersData, updateExpectedState])

  // Reset play state once prize pool reaches 0
  useEffect(() => {
    if (expectedStates.play && gameStateData && Number(gameStateData.prizePool) === 0) {
      updateExpectedState('play', false)
    }
  }, [expectedStates.play, gameStateData, updateExpectedState])

  // Reset set state once game commit is registered and check commit round status
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

  // Clear `waitingForCommitRound` once commit round is reached
  useEffect(() => {
    if (expectedStates.waitingForCommitRound && gameRegisterData && lastRound) {
      const wasCommitRandRoundReached = typeof lastRound === 'number' && BigInt(lastRound) >= gameRegisterData.commitRandRound
      if (wasCommitRandRoundReached) {
        updateExpectedState('waitingForCommitRound', false)
      }
    }
  }, [expectedStates.waitingForCommitRound, gameRegisterData, lastRound, updateExpectedState])

  // Reset "reset" state once reset conditions are met
  useEffect(() => {
    if (expectedStates.reset && gameStateData) {
      const isResetComplete = Number(gameStateData.activePlayers) === 1 && !gameStateData.stakingFinalized
      if (isResetComplete) {
        updateExpectedState('reset', false)
      }
    }
  }, [expectedStates.reset, gameStateData, updateExpectedState])

  // Reset "gameLive" state once game goes live or prize pool reaches 0
  useEffect(() => {
    if (expectedStates.gameLive && gameStateData) {
      // Clear loading state when:
      // 1. Game becomes live (stakingFinalized = true) for normal multi-player cases
      // 2. Game ends (prizePool = 0) for sole admin cases where triggerId: 0n skips live phase
      const gameEnded = Number(gameStateData.prizePool) === 0
      const gameBecameLive = gameStateData.stakingFinalized

      if (gameBecameLive || gameEnded) {
        updateExpectedState('gameLive', false)
      }
    }
  }, [expectedStates.gameLive, gameStateData, updateExpectedState])

  // Reset "gameOver" state once prize pool reaches 0
  useEffect(() => {
    if (expectedStates.gameOver && gameStateData && Number(gameStateData.prizePool) === 0) {
      updateExpectedState('gameOver', false)
    }
  }, [expectedStates.gameOver, gameStateData, updateExpectedState])

  // Use the dropdown event listener hook to listen to dropdown item related events
  useDropdownEventListener({
    dropdownListRefs: Object.values(dropdownListRefs),
    dropdownBtnRefs: Object.values(dropdownBtnRefs),
    isOpen: Object.values(openDropdowns),
    onClose: closeAllDropdowns,
    listenEscape: true,
  })

  // Render the admin table cell dropdown item
  const renderAdminDropdown = useCallback(() => {
    // Only show dropdown if adminActions is open and activeAddress exists, else return null
    if (!openDropdowns.adminActions || !activeAddress) return null

    // Determine boolean conditions for loading states of buttons
    const isResetLoading = expectedStates.reset
    const isDeleteLoading = isLoadingMethod && !isResetLoading

    return (
      <div
        ref={dropdownListRefs.adminActions}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
      >
        <ul className="text-sm text-gray-700">
          <DropdownOption
            enabled={accState.canResetGame}
            loading={isResetLoading}
            onClick={handleResetGameTxn}
            tooltipMessage={isResetLoading ? 'Processing game reset...' : 'You must be the admin and the game must be over to reset it.'}
          >
            Reset Game
          </DropdownOption>
          <DropdownOption
            enabled={accState.canDeleteGame}
            loading={isDeleteLoading}
            onClick={handleDeleteGameTxn}
            tooltipMessage={
              isDeleteLoading ? 'Processing game deletion...' : 'Game must have no active players or admin must be sole active player.'
            }
          >
            Delete Game
          </DropdownOption>
        </ul>
      </div>
    )
  }, [openDropdowns.adminActions, accState, expectedStates.reset, isLoadingMethod, handleResetGameTxn, handleDeleteGameTxn])

  // Render the trigger table cell dropdown item
  const renderTriggerDropdown = useCallback(() => {
    // Only show dropdown if adminActions is open and activeAddres exists, else return null
    if (!openDropdowns.triggerEvents || !activeAddress) return null

    // Determine boolean conditions for loading states of buttons
    const isGameLiveLoading = expectedStates.gameLive
    const isGameOverLoading = expectedStates.gameOver

    return (
      <div
        ref={dropdownListRefs.triggerEvents}
        className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
      >
        <ul className="text-sm text-gray-700">
          <DropdownOption
            enabled={eventTriggerConditions.triggersEvent0}
            loading={isGameLiveLoading}
            onClick={handleTriggerGameLive}
            tooltipMessage={isGameLiveLoading ? 'Processing game live trigger...' : eventTriggerConditions.tooltipMessage0}
          >
            0 - Game Live
          </DropdownOption>
          <DropdownOption
            enabled={eventTriggerConditions.triggersEvent2}
            loading={isGameOverLoading}
            onClick={handleTriggerGameOver}
            tooltipMessage={isGameOverLoading ? 'Processing game over trigger...' : eventTriggerConditions.tooltipMessage2}
          >
            2 - Game Over
          </DropdownOption>
        </ul>
      </div>
    )
  }, [
    openDropdowns.triggerEvents,
    activeAddress,
    eventTriggerConditions,
    expectedStates.gameLive,
    expectedStates.gameOver,
    handleTriggerGameLive,
    handleTriggerGameOver,
  ])

  // Render the phase table cell content
  const renderPhaseContent = useCallback(() => {
    // Only render content if game state data and activeAddres exists, else return null
    if (!gameStateData || !activeAddress) return null

    // Boolean conditions
    const isPlayerInGame = gamePlayersData?.includes(activeAddress) || false
    const isAdmin = activeAddress === gameStateData.adminAddress
    const hasGameRegisterData = gameRegisterData !== undefined
    const isGameOver = Number(gameStateData.prizePool) === 0

    // If game is over, display red text 'Over'
    if (isGameOver) return <span className="text-red-500">Over</span>

    // Buffer 10 rounds to ensure VRF output is available
    const vrfRoundWaitBuffer = 10n

    // A helper method to check if VRF commit rand round has been reached
    const wasCommitRandRoundReached = (lastRound: number | null, commitRandRound: bigint) =>
      typeof lastRound === 'number' && lastRound !== null && BigInt(lastRound) >= commitRandRound + vrfRoundWaitBuffer

    if (gameStateData.stakingFinalized) {
      // LIVE/PLAY PHASE

      // Boolean conditions determining if the user can click play
      const canPlay =
        gameRegisterData?.gameId === gameId &&
        gameStateData.stakingFinalized &&
        isPlayerInGame &&
        hasGameRegisterData &&
        currentTimestamp <= Number(gameStateData.expiryTs) &&
        wasCommitRandRoundReached(lastRound, gameRegisterData.commitRandRound)

      // Boolean conditions determining if the play button click should display the loading animation
      const isPlayLoading = isLoadingMethod || expectedStates.play || expectedStates.set || expectedStates.waitingForCommitRound

      // Define the tooltip message based on what condition is met
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
                onClick={handlePlayGameTxn}
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

      // Boolean conditions determining if the user can click join
      const canJoin =
        !gameStateData.stakingFinalized && !isPlayerInGame && hasGameRegisterData && currentTimestamp <= Number(gameStateData.expiryTs)

      // Boolean conditions determining if the join button click should display the loading animation
      const isJoinLoading = isLoadingMethod || expectedStates.join

      // Define the tooltip message based on what condition is met
      const joinTooltipMessage = !hasGameRegisterData
        ? 'Unavailable: Profile registration required.'
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
                onClick={handleJoinGameTxn}
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
    handleJoinGameTxn,
    handlePlayGameTxn,
    expectedStates,
    isLoadingMethod,
    gameId,
  ])

  // Render the set table cell content
  const renderSetContent = useCallback(() => {
    // Only render content if game state data and activeAddres exists, else return null
    if (!gameStateData || !activeAddress) return null

    // Boolean conditiond determining if player is in game or not
    const isPlayerInGame = gamePlayersData?.includes(activeAddress) || false

    // Boolean conditions determining if the user can click join
    const canSet =
      gameStateData.stakingFinalized &&
      isPlayerInGame &&
      gameRegisterData !== undefined &&
      gameRegisterData.gameId === 0n &&
      currentTimestamp <= Number(gameStateData.expiryTs)

    // Boolean conditions determining if the set button click should display the loading animation
    const isSetLoading = isLoadingMethod || expectedStates.set

    // Define the tooltip message based on what condition is met
    const tooltipMessage = !gameStateData.stakingFinalized
      ? 'Unavailable: Game has not started yet.'
      : !isPlayerInGame
        ? 'Unavailable: You are not an active player in this game.'
        : gameRegisterData === undefined
          ? 'Unavailable: Profile registration data not available.'
          : gameRegisterData.gameId !== 0n
            ? 'Unavailable: Prior commitment unresolved.'
            : 'Unavailable: Commitment set deadline expired.'

    if (canSet && !isSetLoading) {
      return <TableBtn onClick={handleSetCommitGameTxn}>Set</TableBtn>
    }

    if (isSetLoading) {
      return (
        <TableBtn onClick={() => {}} disabled>
          Set
        </TableBtn>
      )
    }

    return <Tooltip message={tooltipMessage}>Set</Tooltip>
  }, [
    gameStateData,
    gameRegisterData,
    gamePlayersData,
    activeAddress,
    handleSetCommitGameTxn,
    expectedStates.set,
    isLoadingMethod,
    currentTimestamp,
  ])

  // Render the table body
  const renderTableBody = useCallback(() => {
    // If Game ID equals zero
    if (gameId === 0n) {
      return (
        <tr>
          <td colSpan={9} className="relative text-center py-4 px-2 text-white">
            Invalid input. Game ID must not be zero.
          </td>
        </tr>
      )
    }
    // If Game ID does not equal zero and game data is loading
    if (gameId !== null && isGameDataLoading) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-4 px-2 text-indigo-200 bg-slate-800">
            <LoadSpinner />
          </td>
        </tr>
      )
    }
    // If Game ID does not equal zero and game data is not loading and game state data doesn't exist
    if (gameId != null && !isGameDataLoading && !gameStateData) {
      return (
        <tr>
          <td colSpan={9} className="relative text-center py-4 px-2 text-white">
            Game ID not found. Ensure Game ID is valid.
          </td>
        </tr>
      )
    }

    // If Game ID does not equal zero and game state data exists
    if (gameId != null && gameStateData) {
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

    // If none of the above
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

  if (!activeAddress || appIsLoading) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-4">
          <label className="font-bold text-indigo-200">Look Up Game by ID:</label>
          <input
            className="w-54 font-bold text-center text-white bg-slate-800 border-2 border-pink-400 rounded px-3 py-1 opacity-50"
            type="text"
            disabled
            placeholder="Game ID"
          />
          <span className="font-bold text-indigo-200">:</span>
          <button className="bg-slate-800 text-gray-400 border-2 border-gray-500 px-3 py-1 rounded font-semibold" disabled>
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
        {typeof activeAddress === 'string' && (
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
        )}
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
