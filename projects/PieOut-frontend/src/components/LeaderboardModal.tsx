import { ellipseAddress } from '../utils/ellipseAddress'
import { ModalInterface } from '../interfaces/modal'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { CopyAddressBtn } from '../components/CopyAddressBtn'
import React, { useMemo, useCallback } from 'react'

interface LeaderboardInterface extends ModalInterface {}

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

const LeaderboardItem = ({
  place,
  medal,
  score,
  address,
  color,
}: {
  place: number
  medal: string
  score: bigint | null
  address: string | undefined
  color: string
}) => (
  <div className="bg-slate-700 border border-slate-600 rounded px-3 py-2 hover:bg-slate-600 transition-colors duration-200">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">{medal}</span>
        <div className="flex flex-col">
          <span className={`font-bold text-sm ${color}`}>#{place}</span>
          <span className="text-xs text-slate-300">
            Score: <span className="font-mono text-teal-400">{score?.toString()}</span>
          </span>
        </div>
      </div>
      {address && (
        <div className="flex items-center gap-1">
          <span className="text-sm text-slate-300 font-mono">{ellipseAddress(address, 4)}</span>
          <CopyAddressBtn className="text-sm" value={address} title="Copy full address" />
        </div>
      )}
    </div>
  </div>
)

const LeaderboardModal = React.memo(({ openModal, closeModal }: LeaderboardInterface) => {
  const { gameTrophyData, isGameDataLoading, gameStateData } = useGameDataCtx()

  // Memoized game data to prevent re-renders
  const gameData = useMemo(
    () => ({
      gameTrophyData,
      isGameDataLoading,
      gameStateData,
    }),
    [gameTrophyData?.assetId, isGameDataLoading, gameStateData],
  )

  // Memoized leaderboard data
  const leaderboardInfo = useMemo(() => {
    const leaderboardData = [
      {
        place: 1,
        medal: '🥇',
        score: gameData.gameStateData?.firstPlaceScore,
        address: gameData.gameStateData?.firstPlaceAddress,
        color: 'text-yellow-400',
      },
      {
        place: 2,
        medal: '🥈',
        score: gameData.gameStateData?.secondPlaceScore,
        address: gameData.gameStateData?.secondPlaceAddress,
        color: 'text-gray-300',
      },
      {
        place: 3,
        medal: '🥉',
        score: gameData.gameStateData?.thirdPlaceScore,
        address: gameData.gameStateData?.thirdPlaceAddress,
        color: 'text-amber-600',
      },
    ].filter((player) => player.score !== null && player.address !== undefined)

    return {
      leaderboardData,
      hasData: leaderboardData.length > 0,
    }
  }, [gameData.gameStateData])

  // Memoized render functions
  const renderLeaderboardSection = useCallback(
    () => (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-teal-400">Rank</h3>
        </div>

        {gameData.isGameDataLoading ? (
          <div className="text-center text-slate-400 py-3 text-sm">Processing...</div>
        ) : leaderboardInfo.hasData ? (
          <div className="space-y-2">
            {leaderboardInfo.leaderboardData.map((player) => (
              <LeaderboardItem
                key={player.place}
                place={player.place}
                medal={player.medal}
                score={player.score ? BigInt(player.score) : null}
                address={player.address}
                color={player.color}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-3 text-sm">No data.</div>
        )}
      </div>
    ),
    [gameData.isGameDataLoading, leaderboardInfo],
  )

  if (!gameData.gameTrophyData?.assetId) return null

  return (
    <dialog id="leaderboard_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box border-2 rounded-xl border-teal-400 bg-slate-800 max-w-xs p-4">
        {/* Title */}
        <div className="mb-4">
          <div className="mb-2 flex justify-center">
            <h3 className="tracking-wider cursor-pointer font-bold text-3xl text-pink-400 underline hover:text-lime-300 transition-colors duration-200 pb-1 px-2 text-center">
              LEADERBOARD
            </h3>
          </div>
          <p className="text-sm text-center text-white">Click title for more info</p>
        </div>

        <hr className="border-t-2 border-teal-400 opacity-80 my-2" />

        {/* Leaderboard Section */}
        {renderLeaderboardSection()}

        {/* Close Button */}
        <div className="modal-action flex justify-center mt-2">
          <ModalButton onClick={closeModal}>Close</ModalButton>
        </div>
      </form>
    </dialog>
  )
})

export default LeaderboardModal
