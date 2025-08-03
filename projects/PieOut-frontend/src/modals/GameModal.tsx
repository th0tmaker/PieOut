import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import GameBlurbContent from '../blurbs/GameBlurb'
import BlurbPortal from '../components/BlurbPortal'
import { CopyAddressBtn } from '../components/CopyAddressBtn'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'

interface GameModalInterface extends ModalInterface {}

// Reusable components outside the main component
const ModalButton = ({
  onClick,
  disabled = false,
  children,
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}) => (
  <button
    className={`px-3 py-1 rounded font-semibold transition-colors duration-200 border-2 text-sm ${className} ${
      disabled
        ? 'bg-gray-700 text-gray-300 border-gray-500 cursor-not-allowed pointer-events-none'
        : 'bg-slate-800 text-pink-300 border-pink-400 hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200'
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
)

const GameItem = ({ gameId, adminAddress }: { gameId: bigint; adminAddress: string }) => (
  <div className="bg-slate-700 border border-slate-600 rounded px-2 py-1 hover:bg-slate-600 transition-colors duration-200 cursor-pointer">
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
)

const GameModal = React.memo(({ openModal, closeModal }: GameModalInterface) => {
  const { gameTrophyData, gameRegisterData, isGameDataLoading, activeGames } = useGameDataCtx()

  const { getModalProps, toggleModal } = useModal()
  const { openModal: isGameBlurbOpen } = getModalProps('gameBlurb')
  const { handle: handleMethod, isLoading: isMethodLoading } = useMethodHandler()

  // Local state
  const [inputMaxPlayers, setInputMaxPlayers] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [expectedProcessingState, setExpectedProcessingState] = useState(false)

  const GAMES_PER_PAGE = 5

  // Memoized game data to prevent re-renders
  const gameData = useMemo(
    () => ({
      gameTrophyData,
      gameRegisterData,
      isGameDataLoading,
      activeGames,
    }),
    [gameTrophyData?.assetId, gameRegisterData?.hostingGame, isGameDataLoading, activeGames?.length],
  )

  // Reset processing state when activeGames changes (new game created)
  useEffect(() => {
    if (expectedProcessingState && gameData.activeGames) {
      setExpectedProcessingState(false)
    }
  }, [gameData.activeGames, expectedProcessingState])

  // Memoized computed states
  const gameInfo = useMemo(() => {
    const sortedActiveGames = gameData.activeGames?.sort((a, b) => Number(a[0]) - Number(b[0])) || []
    const totalGames = gameData.activeGames?.length || 0
    const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE)
    const startIndex = currentPage * GAMES_PER_PAGE
    const currentGames = sortedActiveGames.slice(startIndex, startIndex + GAMES_PER_PAGE)

    const maxPlayersNum = parseInt(inputMaxPlayers)
    const isValidInput = maxPlayersNum >= 3 && maxPlayersNum <= 16

    return {
      sortedActiveGames,
      totalGames,
      totalPages,
      currentGames,
      maxPlayersNum,
      isValidInput,
    }
  }, [gameData.activeGames, currentPage, inputMaxPlayers])

  // Processing states
  const isProcessing = expectedProcessingState || isMethodLoading
  const isCreateDisabled = isProcessing || !inputMaxPlayers || !gameInfo.isValidInput || gameData.gameRegisterData?.hostingGame
  const isCloseDisabled = isProcessing

  // Memoized handlers
  const handleCreateGame = useCallback(async () => {
    if (!gameInfo.isValidInput) return

    try {
      setExpectedProcessingState(true)
      await handleMethod('newGame', { maxPlayers: BigInt(gameInfo.maxPlayersNum) })
      setInputMaxPlayers('')
    } catch (error) {
      consoleLogger.error('Create game failed', error)
      setExpectedProcessingState(false)
    }
  }, [gameInfo.isValidInput, gameInfo.maxPlayersNum, handleMethod])

  const handlePageChange = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next' && currentPage < gameInfo.totalPages - 1) {
        setCurrentPage(currentPage + 1)
      } else if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(currentPage - 1)
      }
    },
    [currentPage, gameInfo.totalPages],
  )

  const handleMaxPlayersInputRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    const numOnlyInput = e.target.value.replace(/\D/g, '')

    // Allow empty input for user to type
    if (numOnlyInput === '') {
      setInputMaxPlayers('')
      return
    }

    // Convert to number for range checking
    const numValue = parseInt(numOnlyInput)

    // Allow single digit "1" as user might be typing "10-16"
    // Also allow valid range 3-16
    if (numOnlyInput === '1' || (numValue >= 3 && numValue <= 16)) {
      setInputMaxPlayers(numOnlyInput)
    }
    // If user types a number outside range, don't update the input
    // This prevents invalid values from appearing in the field
  }

  const renderNewGameSection = useCallback(
    () => (
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-green-300 mb-2 text-left">New Game</h3>

        {isProcessing ? (
          <div className="flex justify-center py-2">
            <span className="inline-flex items-center gap-1">
              <span className="text-gray-400">PROCESSING...</span>
              <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {gameData.gameRegisterData?.hostingGame && (
              <div className="flex justify-center">
                <p className="text-red-400 text-sm text-center">You are already hosting a game.</p>
              </div>
            )}
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-indigo-200">Max Players:</label>
                <input
                  className={`w-14 h-6 text-sm font-bold text-center text-white bg-slate-800 border-2 border-pink-400 rounded px-2 py-1 focus:bg-slate-700 ${
                    inputMaxPlayers ? 'bg-slate-700' : ''
                  } hover:bg-slate-700 focus:outline-none focus:border-lime-400`}
                  type="text"
                  min="3"
                  max="16"
                  maxLength={2}
                  value={inputMaxPlayers}
                  onChange={handleMaxPlayersInputRange}
                  inputMode="numeric"
                  placeholder="3-16"
                />
              </div>
            </div>

            <div className="flex justify-center">
              <ModalButton onClick={handleCreateGame} disabled={isCreateDisabled}>
                Create
              </ModalButton>
            </div>
          </div>
        )}
      </div>
    ),
    [isProcessing, inputMaxPlayers, isCreateDisabled, handleCreateGame, ModalButton],
  )

  const renderActiveGamesSection = useCallback(
    () => (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-green-300">Active Games</h3>
          <span className="text-xs text-slate-400">Total games: {gameInfo.totalGames}</span>
        </div>

        {gameData.isGameDataLoading ? (
          <div className="text-center text-slate-400 py-3 text-sm">Processing...</div>
        ) : gameInfo.totalGames > 0 ? (
          <>
            <div className="max-h-40 overflow-y-auto pr-1">
              <div className="space-y-0.5">
                {gameInfo.currentGames.map(([gameId, adminAddress]) => (
                  <GameItem key={gameId.toString()} gameId={gameId} adminAddress={adminAddress} />
                ))}
              </div>
            </div>

            {gameInfo.totalPages > 1 && (
              <div className="flex justify-between items-center mt-3 text-xs">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage === 0}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-slate-400">
                  {currentPage + 1}/{gameInfo.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={currentPage === gameInfo.totalPages - 1}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-400 py-3 text-sm">No active games found</div>
        )}
      </div>
    ),
    [gameData.isGameDataLoading, gameInfo, currentPage, handlePageChange, GameItem],
  )

  if (!gameData.gameTrophyData?.assetId) return null

  return (
    <>
      <dialog id="game_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-green-300 bg-slate-800 max-w-xs p-4">
          {/* Title */}
          <div className="mb-4">
            <div className="mb-2 flex justify-center">
              <button
                className="tracking-wider cursor-pointer font-bold text-3xl text-pink-400 underline hover:text-lime-300 transition-colors duration-200 pb-1 px-2 text-center"
                type="button"
                onClick={() => toggleModal('gameBlurb')}
              >
                GAME
              </button>
            </div>
            <p className="text-sm text-center text-white">Click title for more info</p>
          </div>

          <hr className="border-t-2 border-green-300 opacity-80 my-2" />

          {/* New Game Section */}
          {renderNewGameSection()}

          <hr className="border-t-2 border-green-300 opacity-80 my-2" />

          {/* Active Games Section */}
          {renderActiveGamesSection()}

          {/* Close Button */}
          <div className="modal-action flex justify-center mt-2">
            <ModalButton onClick={closeModal} disabled={isCloseDisabled}>
              Close
            </ModalButton>
          </div>
        </form>
      </dialog>

      {isGameBlurbOpen && <BlurbPortal title="About Game" text={GameBlurbContent()} onClose={() => toggleModal('gameBlurb')} />}
    </>
  )
})

export default GameModal
