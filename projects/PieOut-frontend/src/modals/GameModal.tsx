import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import React, { useEffect, useMemo, useState } from 'react'
import GameAboutContent from '../abouts/GameAbout'
import { AppBaseBtn } from '../buttons/AppBaseBtn'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import AboutPortal from '../components/AboutPortal'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'

// Game entry component
const GameEntry = ({ gameId, adminAddress }: { gameId: bigint; adminAddress: string }) => (
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

// Processing spinner component
const ProcessingSpinner = () => (
  <div className="flex justify-center py-2">
    <span className="inline-flex items-center gap-1">
      <span className="text-gray-400">PROCESSING...</span>
      <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
    </span>
  </div>
)

// Pagination component
const Pagination = ({
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
      className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Previous
    </button>
    <span className="text-slate-400">
      {currentPage + 1}/{totalPages}
    </span>
    <button
      onClick={() => onPageChange('next')}
      disabled={currentPage === totalPages - 1}
      className="px-2 py-1 bg-slate-700 text-slate-300 rounded border border-slate-600 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Next
    </button>
  </div>
)

// Create a modal component that displays all active games and the game create section
const GameModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { gameTrophyData, gameRegisterData, isGameDataLoading, activeGames } = useGameDataCtx()
  const { handle: handleMethod, isLoading: isMethodLoading } = useMethodHandler()
  const { getModalProps, toggleModal } = useModal()
  const { openModal: isGameBlurbOpen } = getModalProps('gameBlurb')

  // States
  const [inputMaxPlayers, setInputMaxPlayers] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [expectedProcessingState, setExpectedProcessingState] = useState(false)

  // Constants
  const GAMES_PER_PAGE = 5

  // Memos
  const gameInfo = useMemo(() => {
    const totalGames = activeGames?.length || 0
    const totalPages = Math.ceil(totalGames / GAMES_PER_PAGE)
    const sortedActiveGames = activeGames?.sort((a, b) => Number(a[0]) - Number(b[0])) || []
    const startIndex = currentPage * GAMES_PER_PAGE
    const currentGames = sortedActiveGames.slice(startIndex, startIndex + GAMES_PER_PAGE)

    const maxPlayersNum = parseInt(inputMaxPlayers)
    const isValidMaxPlayersRange = maxPlayersNum >= 3 && maxPlayersNum <= 16

    return {
      sortedActiveGames,
      totalGames,
      totalPages,
      currentGames,
      maxPlayersNum,
      isValidMaxPlayersRange,
    }
  }, [activeGames, currentPage, inputMaxPlayers])

  const processingStates = useMemo(
    () => ({
      isProcessing: expectedProcessingState || isMethodLoading,
      isCreateDisabled:
        expectedProcessingState ||
        isMethodLoading ||
        !inputMaxPlayers ||
        !gameInfo.isValidMaxPlayersRange ||
        !gameRegisterData ||
        Boolean(gameRegisterData?.hostingGame),
      isCloseDisabled: expectedProcessingState || isMethodLoading,
    }),
    [expectedProcessingState, isMethodLoading, inputMaxPlayers, gameInfo.isValidMaxPlayersRange, gameRegisterData?.hostingGame],
  )

  // Effects
  useEffect(() => {
    if (expectedProcessingState && activeGames) {
      setExpectedProcessingState(false)
    }
  }, [activeGames, expectedProcessingState])

  // Early return after all hooks
  if (!gameTrophyData?.assetId) return null

  // Conditions
  const { isProcessing, isCreateDisabled, isCloseDisabled } = processingStates

  // Handlers
  const handleCreateGame = async () => {
    if (!gameInfo.isValidMaxPlayersRange) return

    try {
      setExpectedProcessingState(true)
      await handleMethod('newGame', { maxPlayers: BigInt(gameInfo.maxPlayersNum) })
      setInputMaxPlayers('')
    } catch (error) {
      consoleLogger.error('Create game failed', error)
      setExpectedProcessingState(false)
    }
  }

  const handlePageMove = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < gameInfo.totalPages - 1) {
      setCurrentPage(currentPage + 1)
    } else if (direction === 'prev' && currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleMaxPlayersInputParse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numOnlyInput = e.target.value.replace(/\D/g, '')

    if (numOnlyInput === '') {
      setInputMaxPlayers('')
      return
    }

    const numValue = parseInt(numOnlyInput)
    if (numOnlyInput === '1' || (numValue >= 3 && numValue <= 16)) {
      setInputMaxPlayers(numOnlyInput)
    }
  }

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
            <h3 className="text-lg font-semibold text-green-300 mb-2 text-left">New Game</h3>

            {isProcessing ? (
              <ProcessingSpinner />
            ) : (
              <div className="flex flex-col justify-center gap-2 text-yellow-400 text-sm text-center">
                {!gameRegisterData && <p>⚠️ Profile registration required!</p>}
                {gameRegisterData?.hostingGame && <p>⚠️ You are already hosting a game!</p>}
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
                      onChange={handleMaxPlayersInputParse}
                      inputMode="numeric"
                      placeholder="3-16"
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <AppBaseBtn onClick={handleCreateGame} disabled={isCreateDisabled} textSize="sm">
                    Create
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
                    {gameInfo.currentGames.map(([gameId, adminAddress]) => (
                      <GameEntry key={gameId.toString()} gameId={gameId} adminAddress={adminAddress} />
                    ))}
                  </div>
                </div>

                {gameInfo.totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={gameInfo.totalPages} onPageChange={handlePageMove} />
                )}
              </>
            ) : (
              <div className="text-center text-slate-400 py-3 text-sm">No active games found.</div>
            )}
          </div>

          {/* Close Button */}
          <div className="modal-action flex justify-center mt-2">
            <AppBaseBtn onClick={closeModal} disabled={isCloseDisabled} textSize="base">
              Close
            </AppBaseBtn>
          </div>
        </form>
      </dialog>

      {isGameBlurbOpen && <AboutPortal title="About Game" text={GameAboutContent()} onClose={() => toggleModal('gameBlurb')} />}
    </>
  )
})

GameModal.displayName = 'GameModal'

export default GameModal
