//src/modals/Leaderboard.tsx
import React, { useMemo } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { ModalInterface } from '../interfaces/modal'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import { AppBaseBtn } from '../buttons/AppBaseBtn'

// Leaderboard entry component
const LeaderboardEntry = ({
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
  <div className="px-3 py-2 rounded bg-slate-700 border border-slate-600 hover:bg-slate-600 transition-colors duration-200 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-2xl">{medal}</span>
      <div>
        <div className={`font-bold text-lg text-bold ${color}`}># {place}</div>
        <div className="text-base text-slate-300">
          Score: <span className="font-mono text-lg text-teal-400">{score?.toString()}</span>
        </div>
      </div>
    </div>
    {address && (
      <div className="flex items-center gap-1">
        <span className="font-mono text-base text-slate-300">{ellipseAddress(address, 4)}</span>
        <CopyAddressBtn className="text-base" value={address} title="Copy full address" />
      </div>
    )}
  </div>
)

// Create a modal component that displays the leaderboard for a game instance
const LeaderboardModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { gameTrophyData, isGameDataLoading, gameStateData } = useGameDataCtx()

  // Memos
  const leaderboard = useMemo(() => {
    if (!gameStateData) {
      return { data: [], hasData: false }
    }
    const data = [
      {
        place: 1,
        medal: '🥇',
        score: gameStateData.firstPlaceScore,
        address: gameStateData.firstPlaceAddress,
        color: 'text-yellow-400',
      },
      {
        place: 2,
        medal: '🥈',
        score: gameStateData.secondPlaceScore,
        address: gameStateData.secondPlaceAddress,
        color: 'text-gray-300',
      },
      {
        place: 3,
        medal: '🥉',
        score: gameStateData.thirdPlaceScore,
        address: gameStateData.thirdPlaceAddress,
        color: 'text-amber-600',
      },
    ].filter((player) => player.score !== null && player.address !== undefined)

    return {
      data,
      hasData: data.length > 0,
    }
  }, [gameStateData])

  // Early return if no necessary data
  if (!gameTrophyData || !gameStateData) return null

  // Render JSX
  return (
    <dialog id="leaderboard_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-xs p-4 rounded-xl bg-slate-800 border-2 border-teal-400">
        {/* Title */}
        <div className="mb-2 flex justify-center">
          <h3 className="pb-1 px-2 font-bold text-2xl text-center text-teal-400">LEADERBOARD</h3>
        </div>
        <hr className="my-2 border-t-2 border-teal-400 opacity-80" />

        {/* Leaderboard */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-teal-400">Rank</h3>
          </div>

          {isGameDataLoading ? (
            <div className="text-center text-slate-400 py-3 text-sm">Processing...</div>
          ) : leaderboard.hasData ? (
            <div className="space-y-2">
              {leaderboard.data.map((player) => (
                <LeaderboardEntry
                  key={player.place}
                  place={player.place}
                  medal={player.medal}
                  score={player.score !== null ? BigInt(player.score) : null}
                  address={player.address}
                  color={player.color}
                />
              ))}
            </div>
          ) : (
            <div className="py-3 text-sm text-center text-slate-400">Data not found.</div>
          )}
        </div>

        {/* Button */}
        <div className="modal-action flex justify-center mt-2">
          <AppBaseBtn onClick={closeModal}>Close</AppBaseBtn>
        </div>
      </form>
    </dialog>
  )
})

LeaderboardModal.displayName = 'LeaderboardModal'

export default LeaderboardModal
