// HANDLE UNREGISTER LOGIC FOR SELF AND OTHER
// IMPLEMENT ANIMATE-SPIN PROCESSING INTO DROP DOWN 'ADMIN' + 'TRIGGER' MENUS
// ADD ANIMATION TO CHECK IF -> currentTimestamp > Number(gameStateData?.expiryTs)
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
import { CopyAddressBtn } from './CopyAddressBtn'

// Reusable components
const ActionButton = ({
  onClick,
  disabled = false,
  children,
  className = '',
  tooltipMessage,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
  tooltipMessage?: string
}) => {
  // Show tooltip for disabled (non-loading) buttons
  if (disabled && tooltipMessage) {
    return (
      <Tooltip message={tooltipMessage}>
        <span className="text-gray-400">{children}</span>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-bold focus:outline-none ${className} ${
        disabled
          ? 'text-lime-400'
          : disabled
            ? 'text-gray-400 cursor-help'
            : 'text-lime-400 hover:underline hover:decoration-2 hover:underline-offset-2'
      }`}
    >
      {disabled ? (
        <div className="inline-flex items-center gap-1">
          {/* <span>Processing...</span> */}
          <div className="w-3 h-3 border-2 border-t-transparent border-lime-400 rounded-full animate-spin"></div>
        </div>
      ) : (
        children
      )}
    </button>
  )
}

export const Tooltip = ({ children, message }: { children: React.ReactNode; message: React.ReactNode }) => (
  <div className="group inline-block relative">
    <span className="text-gray-400 cursor-help">{children}</span>
    <div className="absolute left-full top-full -ml-10 mt-2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
      {message}
    </div>
  </div>
)

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

const TableCell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const defaultClasses = 'font-bold text-center bg-slate-800 border border-indigo-300 px-4 py-2'
  const hasTextColor = /\btext-(?:\w+)-\d{3}\b/.test(className)
  const textClass = hasTextColor ? '' : 'text-indigo-200'

  return <td className={`${defaultClasses} ${textClass} ${className}`}>{children}</td>
}

const GameTable: React.FC = React.memo(() => {
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { appCreator } = useAppCtx()
  const [inputedGameId, setInputedGameId] = useState('')
  const { lastRound } = useLastRound(algorand.client.algod)
  const { gameId, setGameId } = useGameIdCtx()
  const { gameRegisterData, gameStateData, gamePlayersData, isGameDataLoading, setIsGameDataLoading } = useGameDataCtx()

  const currentTimestamp = useCurrentTimestamp()
  const { handle: handleMethod, isLoading: isLoadingMethod } = useMethodHandler()

  // Expected state management for buttons
  const [expectedJoinState, setExpectedJoinState] = useState(false)
  const [expectedPlayState, setExpectedPlayState] = useState(false)
  const [expectedSetState, setExpectedSetState] = useState(false)
  const [waitingForCommitRound, setWaitingForCommitRound] = useState(false)

  const [openDropdowns, setOpenDropdowns] = useState({
    adminActions: false,
    triggerEvents: false,
    gamePlayers: false,
  })

  // Memoized refs - fix the undefined error
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

  // Memoized computed states
  const accState = useMemo(() => {
    const isAuthorized = activeAddress === gameStateData?.adminAddress || activeAddress === appCreator
    const isAdminSolePlayer =
      Number(gameStateData?.activePlayers) === 1 && (activeAddress === gameStateData?.adminAddress || activeAddress === appCreator)
    const gameIsEmpty = Number(gameStateData?.activePlayers) === 0 && Number(gameStateData?.prizePool) === 0
    const canResetGame = gameStateData?.prizePool === 0n && activeAddress === gameStateData?.adminAddress
    const canDeleteGame = isAuthorized && (isAdminSolePlayer || gameIsEmpty)
    const gameEnded = Number(gameStateData?.prizePool) === 0

    return {
      isAuthorized,
      canResetGame,
      canDeleteGame,
      gameEnded,
    }
  }, [activeAddress, gameStateData, appCreator, currentTimestamp])

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

  // Memoized handlers
  const closeAll = useCallback(
    () =>
      setOpenDropdowns({
        adminActions: false,
        triggerEvents: false,
        gamePlayers: false,
      }),
    [],
  )

  const toggleDropdown = useCallback((name: keyof typeof openDropdowns) => {
    setOpenDropdowns((prev) => {
      const isCurrentlyOpen = prev[name]
      if (isCurrentlyOpen) {
        return { adminActions: false, triggerEvents: false, gamePlayers: false }
      } else {
        return {
          adminActions: name === 'adminActions',
          triggerEvents: name === 'triggerEvents',
          gamePlayers: name === 'gamePlayers',
        }
      }
    })
  }, [])

  const handleNumOnlyGameId = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numOnlyInput = e.target.value.replace(/\D/g, '')
    setInputedGameId(numOnlyInput)
  }, [])

  const handleDeleteClick = useCallback(async () => {
    if (accState.canDeleteGame && !isLoadingMethod) {
      await handleMethod('deleteGame', { gameId })
      setGameId(null)
    }
  }, [accState.canDeleteGame, isLoadingMethod, handleMethod, gameId, setGameId])

  const handleInputClick = useCallback(() => {
    const newGameId = BigInt(inputedGameId)
    if (newGameId !== 0n) {
      setIsGameDataLoading(true)
    }
    setGameId(newGameId)
  }, [inputedGameId, setIsGameDataLoading, setGameId])

  // Enhanced method handlers with expected state
  const handleJoinClick = useCallback(async () => {
    if (!activeAddress) return
    try {
      setExpectedJoinState(true)
      await handleMethod('joinGame', { gameId })
    } catch (error) {
      // Reset expected state on error
      setExpectedJoinState(false)
      throw error
    }
  }, [handleMethod, gameId, activeAddress])

  const handlePlayClick = useCallback(async () => {
    try {
      setExpectedPlayState(true)
      await handleMethod('playGame', { gameId })
    } catch (error) {
      // Reset expected state on error
      setExpectedPlayState(false)
      throw error
    }
  }, [handleMethod, gameId])

  const handleSetClick = useCallback(async () => {
    try {
      setExpectedSetState(true)
      await handleMethod('setGameCommit', { gameId })
    } catch (error) {
      // Reset expected state on error
      setExpectedSetState(false)
      throw error
    }
  }, [handleMethod, gameId])

  // Reset all expected states when active address changes
  useEffect(() => {
    setExpectedJoinState(false)
    setExpectedPlayState(false)
    setExpectedSetState(false)
    setWaitingForCommitRound(false)
  }, [activeAddress])

  // Reset expected states based on actual game state changes, not just loading states
  useEffect(() => {
    if (!expectedJoinState || !activeAddress) return

    // Reset join state when player actually appears in the game
    if (gamePlayersData?.includes(activeAddress)) {
      setExpectedJoinState(false)
    }

    // Fallback timeout to prevent infinite spinning (30 seconds)
    const timeout = setTimeout(() => {
      setExpectedJoinState(false)
    }, 30000)

    return () => clearTimeout(timeout)
  }, [expectedJoinState, activeAddress, gamePlayersData])

  useEffect(() => {
    if (!expectedPlayState || !gameStateData) return

    // Reset play state when game actually ends (prize pool becomes 0)
    if (Number(gameStateData.prizePool) === 0) {
      setExpectedPlayState(false)
    }

    // Fallback timeout to prevent infinite spinning (30 seconds)
    const timeout = setTimeout(() => {
      setExpectedPlayState(false)
    }, 30000)

    return () => clearTimeout(timeout)
  }, [expectedPlayState, gameStateData])

  useEffect(() => {
    if (!expectedSetState || !gameRegisterData) return

    // When set state is expected and commit is actually set (gameId is no longer 0)
    if (gameRegisterData.gameId !== 0n) {
      setExpectedSetState(false)
      // Only start waiting for commit round if the round hasn't been reached yet
      const wasCommitRandRoundReached =
        typeof lastRound === 'number' && lastRound !== null && BigInt(lastRound) >= gameRegisterData.commitRandRound
      if (!wasCommitRandRoundReached) {
        setWaitingForCommitRound(true)
      }
    }

    // Fallback timeout to prevent infinite spinning (30 seconds)
    const timeout = setTimeout(() => {
      setExpectedSetState(false)
      setWaitingForCommitRound(false)
    }, 30000)

    return () => clearTimeout(timeout)
  }, [expectedSetState, gameRegisterData, lastRound])

  // Reset waiting for commit round when the round is actually reached
  useEffect(() => {
    if (!waitingForCommitRound || !gameRegisterData || !lastRound) return

    const wasCommitRandRoundReached = (lastRound: number | null, commitRandRound: bigint) =>
      typeof lastRound === 'number' && lastRound !== null && BigInt(lastRound) >= commitRandRound

    if (wasCommitRandRoundReached(lastRound, gameRegisterData.commitRandRound)) {
      setWaitingForCommitRound(false)
    }

    // Fallback timeout (60 seconds for round to be reached)
    const timeout = setTimeout(() => {
      setWaitingForCommitRound(false)
    }, 60000)

    return () => clearTimeout(timeout)
  }, [waitingForCommitRound, gameRegisterData, lastRound])

  useDropdownEventListener({
    dropdownListRefs: Object.values(dropdownListRefs),
    dropdownBtnRefs: Object.values(dropdownBtnRefs),
    isOpen: Object.values(openDropdowns),
    onClose: closeAll,
    listenEscape: true,
  })

  // Render functions
  const renderAdminDropdown = useCallback(() => {
    if (!openDropdowns.adminActions) return null

    return (
      <div
        ref={dropdownListRefs.adminActions}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
      >
        <ul className="text-sm text-gray-700">
          <DropdownItem
            enabled={accState.canResetGame}
            onClick={() => !isLoadingMethod && handleMethod('resetGame', { gameId })}
            tooltipMessage="You must be the admin and the game must be over to reset it."
          >
            Reset Game
          </DropdownItem>
          <DropdownItem
            enabled={accState.canDeleteGame}
            onClick={handleDeleteClick}
            tooltipMessage="Game must have no active players or admin must be sole active player."
          >
            Delete Game
          </DropdownItem>
        </ul>
      </div>
    )
  }, [openDropdowns.adminActions, accState, isLoadingMethod, handleMethod, gameId, handleDeleteClick])

  const renderTriggerDropdown = useCallback(() => {
    if (!openDropdowns.triggerEvents || !activeAddress) return null

    return (
      <div
        ref={dropdownListRefs.triggerEvents}
        className="absolute left-1/2 -translate-x-1/2 mt-2 w-60 bg-white border border-gray-200 rounded shadow-lg z-10"
      >
        <ul className="text-sm text-gray-700">
          <DropdownItem
            enabled={eventTriggerConditions.triggersEvent0}
            onClick={() => handleMethod('triggerGameEvent', { gameId: gameId, triggerId: 0n })}
            tooltipMessage={eventTriggerConditions.tooltipMessage0}
          >
            0 - Game Live
          </DropdownItem>
          <DropdownItem
            enabled={eventTriggerConditions.triggersEvent2}
            onClick={() => handleMethod('triggerGameEvent', { gameId: gameId, triggerId: 2n })}
            tooltipMessage={eventTriggerConditions.tooltipMessage2}
          >
            2 - Game Over
          </DropdownItem>
        </ul>
      </div>
    )
  }, [openDropdowns.triggerEvents, activeAddress, eventTriggerConditions, handleMethod, gameId])

  const renderPhaseContent = useCallback(() => {
    if (!gameStateData || !activeAddress) return null

    const isGameOver = Number(gameStateData.prizePool) === 0
    const isPlayerInGame = gamePlayersData?.includes(activeAddress) || false
    const isAdmin = activeAddress === gameStateData.adminAddress
    const hasGameRegisterData = gameRegisterData !== undefined

    if (isGameOver) {
      return <span className="text-red-500">Over</span>
    }

    if (gameStateData.stakingFinalized) {
      // LIVE PHASE - Play conditions
      const wasCommitRandRoundReached = (lastRound: number | null, commitRandRound: bigint) =>
        typeof lastRound === 'number' && lastRound !== null && BigInt(lastRound) >= commitRandRound

      const canPlay = gameRegisterData?.gameId === gameId
      gameStateData.stakingFinalized &&
        isPlayerInGame &&
        hasGameRegisterData &&
        currentTimestamp <= Number(gameStateData?.expiryTs) &&
        wasCommitRandRoundReached(lastRound, gameRegisterData.commitRandRound)

      // Updated loading condition - keep spinning until either method is loading OR we expect a state change
      // Also disable when Set is in progress since Set must complete before Play can be used
      // Keep spinning until the commit round condition is properly evaluated
      const isPlayLoading = isLoadingMethod || expectedPlayState || expectedSetState || waitingForCommitRound

      const playTooltipMessage = !hasGameRegisterData
        ? 'Unavailable: Game register profile required.'
        : !isPlayerInGame
          ? 'Unavailable: You are not an active player in this game.'
          : !gameStateData.stakingFinalized
            ? 'Unavailable: This game has not started yet.'
            : currentTimestamp > Number(gameStateData?.expiryTs)
              ? 'Unavailable: Live phase timer expired.'
              : !wasCommitRandRoundReached(lastRound, gameRegisterData.commitRandRound)
                ? 'Unavailable: Randomness commitment round not yet reached'
                : 'Unavailable: Transaction is processing.'

      return (
        <>
          <span className="text-cyan-300">Live</span>
          {isPlayerInGame && (
            <>
              {' / '}
              <ActionButton
                onClick={handlePlayClick}
                disabled={!canPlay || isPlayLoading}
                tooltipMessage={!canPlay && !isPlayLoading ? playTooltipMessage : undefined}
              >
                Play
              </ActionButton>
            </>
          )}
        </>
      )
    } else {
      // QUEUE/JOIN PHASE - Join conditions
      const canJoin =
        !gameStateData.stakingFinalized && !isPlayerInGame && hasGameRegisterData && currentTimestamp <= Number(gameStateData?.expiryTs)

      // Updated loading condition - keep spinning until either method is loading OR we expect a state change
      const isJoinLoading = isLoadingMethod || expectedJoinState

      const joinTooltipMessage = !hasGameRegisterData
        ? 'Unavailable: Game register profile required.'
        : gameStateData.stakingFinalized
          ? 'Unavailable: This game has already started.'
          : isPlayerInGame
            ? 'Unavailable: You are already in this game.'
            : currentTimestamp > Number(gameStateData?.expiryTs)
              ? 'Unavailable: Queue phase timer expired.'
              : 'Unavailable: Transaction is processing.'

      return (
        <>
          <span className="text-cyan-300 font-bold">Queue</span>
          {activeAddress && !isAdmin && !isPlayerInGame && (
            <>
              {' / '}
              <ActionButton
                onClick={handleJoinClick}
                disabled={!canJoin || isJoinLoading}
                tooltipMessage={!canJoin && !isJoinLoading ? joinTooltipMessage : undefined}
              >
                Join
              </ActionButton>
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
    handleJoinClick,
    handlePlayClick,
    expectedJoinState,
    expectedPlayState,
    isLoadingMethod,
  ])

  const renderSetContent = useCallback(() => {
    if (!gameStateData || !activeAddress) return null

    const isPlayerInGame = gamePlayersData?.includes(activeAddress) || false

    // Set is available if:
    // 1. Game is live (stakingFinalized is true)
    // 2. Player is in the game
    // 3. gameRegisterData.gameId equals 0 (commit not set yet)
    const canSet =
      gameStateData.stakingFinalized &&
      isPlayerInGame &&
      gameRegisterData !== undefined &&
      gameRegisterData.gameId === 0n &&
      currentTimestamp <= Number(gameStateData.expiryTs)

    // Updated loading condition
    const isSetLoading = isLoadingMethod || expectedSetState

    const tooltipMessage = !gameStateData.stakingFinalized
      ? 'Unavailable: Game has not started yet.'
      : !isPlayerInGame
        ? 'Unavailable: You are not an active player in this game.'
        : gameRegisterData === undefined
          ? 'Unavailable: Game register data not available.'
          : gameRegisterData.gameId !== 0n
            ? 'Unavailable: Commit already set for this game.'
            : 'Unavailable: Transaction is processing.'

    if (canSet && !isSetLoading) {
      return (
        <ActionButton onClick={handleSetClick} disabled={false}>
          Set
        </ActionButton>
      )
    }

    if (isSetLoading) {
      return (
        <ActionButton onClick={() => {}} disabled={true}>
          Set
        </ActionButton>
      )
    }

    return <Tooltip message={tooltipMessage}>Set</Tooltip>
  }, [gameStateData, gameRegisterData, gamePlayersData, activeAddress, handleSetClick, expectedSetState, isLoadingMethod])

  const renderTableBody = useCallback(() => {
    // Validation error for invalid game IDs
    if (gameId === 0n) {
      return (
        <tr>
          <td colSpan={9} className="relative text-center py-4 px-2 text-white">
            Invalid input. Game ID must not be zero.
          </td>
        </tr>
      )
    }

    // Loading state
    if (isGameDataLoading && gameId != null) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-4 px-2 text-indigo-200 bg-slate-800">
            <div className="flex items-center justify-center gap-2">
              <span>Processing...</span>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-200"></div>
            </div>
          </td>
        </tr>
      )
    }

    // Game not found
    if (!gameStateData && gameId != null && !isGameDataLoading) {
      return (
        <tr>
          <td colSpan={9} className="relative text-center py-4 px-2 text-white">
            Game ID not found. Ensure Game ID is valid.
          </td>
        </tr>
      )
    }

    // Game data
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

    // Default empty state
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

  // Early return if no active wallet
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
          onChange={handleNumOnlyGameId}
          maxLength={20}
          inputMode="numeric"
          placeholder="Game ID"
        />
        <span className="font-bold text-indigo-200">:</span>
        <button
          className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={handleInputClick}
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
