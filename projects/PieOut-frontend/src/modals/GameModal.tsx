//src/modals/GameModal.tsx
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import GameAboutContent from '../abouts/GameAbout'
import { AppBaseBtn } from '../buttons/AppBaseBtn'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import AboutPortal from '../components/AboutPortal'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'
import { useWallet } from '@txnlab/use-wallet-react'
import { GameRegister } from '../contracts/Pieout'

// Constants
const GAMES_PER_PAGE = 5 // Total active games displayed per page in the modal
const MAX_PLAYERS_BOT_BOUND = 3 // Max players upon game creation can be no less than 3
const MAX_PLAYERS_TOP_BOUND = 16 // Max players upon game creation can be no more than 16

// Create utility method to validate and parse the `maxPlayers` user input string
const parseMaxPlayersInput = (maxPlayers: string): string => {
  // Constrict `maxPlayers` user input string to only allow numerical chars
  const maxPlayersNumInput = maxPlayers.replace(/\D/g, '')

  // If no numerical chars exist, return and empty string
  if (!maxPlayersNumInput) return ''

  // Use the `parseInt` utility method to safely convert the `maxPlayersNumInput` string into a number type
  const numValue = parseInt(maxPlayersNumInput)

  // Return allowed values, from 3–9, or if input equals '1', from 10–16 (otherwise strip last digit)
  return maxPlayersNumInput === '1' || (numValue >= MAX_PLAYERS_BOT_BOUND && numValue <= MAX_PLAYERS_TOP_BOUND)
    ? maxPlayersNumInput
    : maxPlayers.slice(0, -1)
}

// Create a simple load animation with text and animate-spin indicator
const CapLoadSpinner = React.memo(() => (
  <div className="flex justify-center py-2">
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-400">PROCESSING...</span>
      <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" />
    </span>
  </div>
))

// Create a reusable Pagination component with navigation to previous or next page
const Pagination = React.memo(
  ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (direction: 'next' | 'prev') => void
  }) => (
    <div className="flex justify-between items-center mt-3 text-xs">
      <button
        onClick={() => onPageChange('prev')}
        disabled={currentPage === 0}
        className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      <span className="text-slate-400">
        {currentPage + 1}/{totalPages}
      </span>
      <button
        onClick={() => onPageChange('next')}
        disabled={currentPage === totalPages - 1}
        className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  ),
)

// Create a reusable UserStatusMsg component that notifies the user of their current app related status
const UserStatusMsg = React.memo(
  ({ gameRegisterData, userHostedGameId }: { gameRegisterData: GameRegister | undefined; userHostedGameId: bigint | null }) => {
    if (!gameRegisterData) {
      return <p className="text-yellow-400">⚠️ Profile registration required!</p>
    }

    if (gameRegisterData.hostingGame && userHostedGameId) {
      return <p className="text-green-400">You are hosting Game ID: {userHostedGameId.toString()}</p>
    }

    return undefined
  },
)

// Create a reusable GameEntry component with click handler
const GameEntry = React.memo(({ gameId, adminAddress, onClick }: { gameId: bigint; adminAddress: string; onClick?: () => void }) => (
  <div
    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 hover:bg-slate-600 transition-colors duration-200 cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-2 text-xs text-slate-300">
      <div className="flex items-center gap-1">
        <span className="font-medium text-green-300">Game ID:</span>
        <span className="font-mono">{gameId.toString()}</span>
      </div>
      <span className="text-white">•</span>
      <div className="flex items-center gap-1">
        <span className="font-medium text-orange-300">Admin:</span>
        <span className="font-mono">{ellipseAddress(adminAddress, 6)}</span>
        <CopyAddressBtn className="text-sm align-middle" value={adminAddress} title="Copy full address" />
      </div>
    </div>
  </div>
))

// Create a reusable GameOptions component that handles game creation and reset params inputed by the user
const GameOptions = React.memo(
  ({
    quickPlayEnabled,
    setQuickPlayEnabled,
    inputMaxPlayers,
    handleMaxPlayersInput,
    isValidMaxPlayers,
  }: {
    quickPlayEnabled: boolean
    setQuickPlayEnabled: (enabled: boolean) => void
    inputMaxPlayers: string
    handleMaxPlayersInput: (e: React.ChangeEvent<HTMLInputElement>) => void
    isValidMaxPlayers: boolean
  }) => (
    <div className="flex flex-col items-center gap-2">
      {/* Quick Play Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-indigo-200">Quick Play:</label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={quickPlayEnabled}
            onChange={(e) => setQuickPlayEnabled(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500 border border-slate-500 peer-checked:border-green-400" />
        </label>
      </div>

      {/* Max Players */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-semibold text-indigo-200">Max Players:</label>
        <input
          className={`w-14 h-6 text-sm font-bold text-center text-white bg-slate-800 border-2 ${
            isValidMaxPlayers ? 'border-green-400' : 'border-pink-400'
          } rounded px-2 py-1 focus:bg-slate-700 ${
            inputMaxPlayers ? 'bg-slate-700' : ''
          } hover:bg-slate-700 focus:outline-none focus:border-lime-400 transition-colors`}
          type="text"
          min={MAX_PLAYERS_BOT_BOUND}
          max={MAX_PLAYERS_TOP_BOUND}
          maxLength={2}
          value={inputMaxPlayers}
          onChange={handleMaxPlayersInput}
          inputMode="numeric"
          placeholder={`${MAX_PLAYERS_BOT_BOUND}-${MAX_PLAYERS_TOP_BOUND}`}
        />
      </div>
    </div>
  ),
)

// Create a modal component that displays the application honors
const GameModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { activeAddress } = useWallet()
  const {
    gameTrophyData,
    gameRegisterData,
    isGameDataLoading,
    activeGames,
    userHostedGameId,
    userHostedGameStateData,
    getUserHostedGameStateData,
  } = useGameDataCtx()
  const { handle: handleMethod, isMethodLoading } = useMethodHandler()
  const { getModalProps, toggleModal } = useModal()
  const { openModal: isGameBlurbOpen } = getModalProps('gameBlurb')

  // States
  const [inputMaxPlayers, setInputMaxPlayers] = useState('')
  const [quickPlayEnabled, setQuickPlayEnabled] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [expectedProcessingState, setExpectedProcessingState] = useState(false)

  // Computed values: Game Info
  const gameInfo = useMemo(() => {
    const totalGames = activeGames?.length || 0
    const totalPages = Math.max(1, Math.ceil(totalGames / GAMES_PER_PAGE))
    const sortedActiveGames = activeGames?.sort((a, b) => Number(a[0]) - Number(b[0])) || []
    const startIndex = currentPage * GAMES_PER_PAGE
    const currentGames = sortedActiveGames.slice(startIndex, startIndex + GAMES_PER_PAGE)
    const maxPlayersNum = parseInt(inputMaxPlayers, 10)
    const isValidMaxPlayers = !isNaN(maxPlayersNum) && maxPlayersNum >= MAX_PLAYERS_BOT_BOUND && maxPlayersNum <= MAX_PLAYERS_TOP_BOUND

    return {
      totalGames,
      totalPages,
      currentGames,
      maxPlayersNum: isNaN(maxPlayersNum) ? 0 : maxPlayersNum,
      isValidMaxPlayers,
    }
  }, [activeGames, currentPage, inputMaxPlayers])

  // Computed values: Processing State
  const processingStates = useMemo(() => {
    const isProcessing = expectedProcessingState || isMethodLoading
    const isAuthorized = activeAddress === userHostedGameStateData?.adminAddress
    const isAdminSolePlayer = userHostedGameStateData?.activePlayers === 1 && userHostedGameStateData?.adminAddress === activeAddress
    const gameIsEmpty = userHostedGameStateData?.activePlayers === 0 && userHostedGameStateData?.prizePool === 0n

    return {
      isProcessing,
      isCreateDisabled:
        isProcessing || !inputMaxPlayers || !gameInfo.isValidMaxPlayers || !gameRegisterData || gameRegisterData.hostingGame,
      isResetDisabled: isProcessing || !userHostedGameId || !gameIsEmpty,
      isDeleteDisabled: isProcessing || !userHostedGameId || !isAuthorized || (!gameIsEmpty && !isAdminSolePlayer),
      isCloseDisabled: isProcessing,
    }
  }, [
    expectedProcessingState,
    isMethodLoading,
    inputMaxPlayers,
    gameInfo.isValidMaxPlayers,
    gameRegisterData,
    userHostedGameId,
    userHostedGameStateData,
    activeAddress,
  ])

  // Handlers
  // Parse `maxPlayers` user input string and set the value in local state
  const handleMaxPlayersInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMaxPlayers(parseMaxPlayersInput(e.target.value))
  }, [])

  // Helper method to reset local state values
  const resetLocalState = useCallback(() => {
    setInputMaxPlayers('')
    setQuickPlayEnabled(true)
    setCurrentPage(0)
  }, [])

  // Handle page navigation
  const handlePageNavigation = useCallback(
    // Accept direction arg that indicates moving forward "next" or backward "prev"
    (direction: 'next' | 'prev') => {
      // Update the current page state based on navigation direction
      setCurrentPage((prev) => {
        const maxPage = gameInfo.totalPages - 1
        // If moving forward, increment but clamp to the last available page
        if (direction === 'next') return Math.min(prev + 1, maxPage)
        // If moving backward, decrement but clamp to the first page
        if (direction === 'prev') return Math.max(prev - 1, 0)
        // Fallback: keep the page unchanged
        return prev
      })
    },
    [gameInfo.totalPages],
  )

  // Handle game create, reset and delete actions
  const handleGameDeployment = useCallback(
    async (action: () => Promise<void>, errorMessage: string) => {
      // Try block
      try {
        // Set expected processing state flag to true
        setExpectedProcessingState(true)

        // Await the promise of the incoming action method call
        await action()

        // Reset local state
        resetLocalState()

        // Get a fresh value for `userHostedGameStateData` after action method call has been executed
        await getUserHostedGameStateData()

        // Catch error
      } catch (error) {
        // Log
        consoleLogger.error(errorMessage, error)
      } finally {
        // Set expected processing flag to false
        setExpectedProcessingState(false)
      }
    },
    [resetLocalState, getUserHostedGameStateData],
  )

  // Handle game creation
  const handleCreateGame = useCallback(async () => {
    // If the `maxPlayers` user input string value is not valid based on the `isValidMaxPlayers` boolean, return early
    if (!gameInfo.isValidMaxPlayers) return

    // Call game deplyoment handler
    await handleGameDeployment(
      () =>
        // Use the methodHandler to call the contract `newGame` abimethod
        handleMethod('newGame', {
          quickPlayEnabled, // Pass the `quickPlayEnabled` boolean value
          maxPlayers: BigInt(gameInfo.maxPlayersNum), // Pass the `gameInfo.maxPlayersNum` value as the `maxPlayers` arg
        }) as Promise<void>,
      'Create game failed',
    )
  }, [gameInfo.isValidMaxPlayers, gameInfo.maxPlayersNum, quickPlayEnabled, handleMethod, handleGameDeployment])

  // Handle game reset
  const handleResetGame = useCallback(async () => {
    // If `userHostedGameId` or `userHostedGameStateDat` values don't exist, return early
    if (!userHostedGameId || !userHostedGameStateData) return

    // Call game deployment handler
    await handleGameDeployment(async () => {
      // Use current `maxPlayers` input if valid, otherwise fallback to using the existing value
      const newMaxPlayers = gameInfo.isValidMaxPlayers ? gameInfo.maxPlayersNum : userHostedGameStateData.maxPlayers

      // Determine if the max players setting needs to change compared to the existing value
      const changeMaxPlayers = userHostedGameStateData.maxPlayers !== gameInfo.maxPlayersNum

      // Determine if the quick play option has been toggled compared to the existing value
      const changeQuickPlay = userHostedGameStateData.quickPlayEnabled !== quickPlayEnabled

      // Use the methodHandler to call the contract `resetGame` abimethod
      await handleMethod('resetGame', {
        gameId: userHostedGameId,
        changeQuickPlay,
        changeMaxPlayers,
        newMaxPlayers: BigInt(newMaxPlayers),
      })
    }, 'Reset game failed')
  }, [userHostedGameId, userHostedGameStateData, gameInfo, quickPlayEnabled, handleMethod, handleGameDeployment])

  // Handle game deletion
  const handleDeleteGame = useCallback(async () => {
    // If `userHostedGameId` values don't exist, nothing to delete, return early
    if (!userHostedGameId) return

    // Call game deployment handler
    await handleGameDeployment(async () => {
      // Use the methodHandler to call the contract `deleteGame` abimethod
      await handleMethod('deleteGame', { gameId: userHostedGameId })
    }, 'Delete game failed')
  }, [userHostedGameId, handleMethod, handleGameDeployment])

  // Potential future feature where paginated game entries can be joined by clicking on them
  const handleGameEntryClick = useCallback(() => {
    // Add functionality to join game or show game details
    // This is a placeholder for future implementation
    consoleLogger.info('Game entry clicked')
  }, [])

  // Effects
  // Reset expected processing state flag if the processing state or `activeGames` change
  useEffect(() => {
    if (expectedProcessingState && activeGames) {
      setExpectedProcessingState(false)
    }
  }, [activeGames, expectedProcessingState])

  // Reset page if it exceeds available pages
  useEffect(() => {
    if (currentPage >= gameInfo.totalPages && gameInfo.totalPages > 0) {
      setCurrentPage(Math.max(0, gameInfo.totalPages - 1))
    }
  }, [currentPage, gameInfo.totalPages])

  // If game trophy asset id doesn't exist, do not render this modal component, return early
  if (!gameTrophyData?.assetId) return null

  // Get processed states and their values
  const { isProcessing, isCreateDisabled, isCloseDisabled, isResetDisabled, isDeleteDisabled } = processingStates

  // Render JSX
  return (
    <>
      <dialog id="game_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-green-300 bg-slate-800 max-w-xs p-4">
          {/* Title */}
          <div className="mb-4">
            <div className="mb-2 flex justify-center">
              <AppBaseBtn variant="text" textSize="xl3" onClick={() => toggleModal('gameBlurb')} disabled={isProcessing}>
                GAME
              </AppBaseBtn>
            </div>
            <p className="text-sm text-center text-white">Click title for more info</p>
          </div>
          <hr className="border-t-2 border-green-300 opacity-80 my-2" />

          {/* New Game Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-green-300 mb-2 text-left">Game Options</h3>
            {/* Load animation spinner if processing */}
            {isProcessing ? (
              <CapLoadSpinner />
            ) : (
              <div className="flex flex-col justify-center gap-3 text-sm text-center">
                {/* Display User Status Message */}
                <UserStatusMsg gameRegisterData={gameRegisterData} userHostedGameId={userHostedGameId} />
                {/* User interactive Game Options */}
                <GameOptions
                  quickPlayEnabled={quickPlayEnabled}
                  setQuickPlayEnabled={setQuickPlayEnabled}
                  inputMaxPlayers={inputMaxPlayers}
                  handleMaxPlayersInput={handleMaxPlayersInput}
                  isValidMaxPlayers={gameInfo.isValidMaxPlayers}
                />
                {/* Create, Delete, Reset Game Buttons */}
                <div className="flex justify-center gap-2">
                  <AppBaseBtn onClick={handleCreateGame} disabled={isCreateDisabled} textSize="sm" variant="regular">
                    Create
                  </AppBaseBtn>
                  <AppBaseBtn onClick={handleResetGame} disabled={isResetDisabled} textSize="sm" variant="regular">
                    Reset
                  </AppBaseBtn>
                  <AppBaseBtn onClick={handleDeleteGame} disabled={isDeleteDisabled} textSize="sm" variant="regular">
                    Delete
                  </AppBaseBtn>
                </div>
              </div>
            )}
          </div>
          <hr className="border-t-2 border-green-300 opacity-80 my-2" />

          {/* Active Games Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-green-300">Active Games</h3>
              <span className="font-semibold text-xs text-slate-400">Total games: {gameInfo.totalGames}</span>
            </div>
            {isGameDataLoading ? (
              <div className="text-center text-slate-400 py-3 text-sm">Processing...</div>
            ) : gameInfo.totalGames > 0 ? (
              <>
                <div className="max-h-40 overflow-y-auto pr-1">
                  <div className="space-y-0.5">
                    {/* Map Each Game Entry */}
                    {gameInfo.currentGames.map(([gameId, adminAddress]) => (
                      <GameEntry key={gameId.toString()} gameId={gameId} adminAddress={adminAddress} onClick={handleGameEntryClick} />
                    ))}
                  </div>
                </div>
                {/* Pagination component */}
                {gameInfo.totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={gameInfo.totalPages} onPageChange={handlePageNavigation} />
                )}
              </>
            ) : (
              <div className="text-center text-slate-400 py-3 text-sm">No active games found.</div>
            )}
          </div>

          {/* Close Modal Button */}
          <div className="modal-action flex justify-center mt-2">
            <AppBaseBtn onClick={closeModal} disabled={isCloseDisabled} textSize="base" variant="regular">
              Close
            </AppBaseBtn>
          </div>
        </form>
      </dialog>
      {/* Game Modal About Portal */}
      {isGameBlurbOpen && <AboutPortal title="About Game" text={GameAboutContent()} onClose={() => toggleModal('gameBlurb')} />}
    </>
  )
})

GameEntry.displayName = 'GameEntry'
CapLoadSpinner.displayName = 'ProcessingSpinner'
Pagination.displayName = 'Pagination'
GameOptions.displayName = 'GameSettings'
UserStatusMsg.displayName = 'UserMsg'
GameModal.displayName = 'GameModal'

export default GameModal
