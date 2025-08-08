import React from 'react'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'
import { AppBaseBtn } from '../buttons/AppBaseBtn'

// Player entry component
const PlayerEntry = ({ address, index }: { address: string; index: number }) => (
  <div className="flex items-center justify-between px-2 py-0.5 rounded bg-slate-700 border border-slate-600 hover:bg-slate-600 transition-colors duration-200">
    <span className="font-mono text-xs text-indigo-200">
      {index + 1}. {ellipseAddress(address, 6)}
    </span>
    <CopyAddressBtn className="text-sm" value={address} title="Copy full address" />
  </div>
)

// Create a modal component that displays the active players for a game instance
const ActivePlayersModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { gameStateData, gamePlayersData } = useGameDataCtx()

  // Early return if no necessary data
  if (!gameStateData || !gamePlayersData) return null

  // Conditions
  const hasPlayers = gamePlayersData.length > 0

  // Render JSX
  return (
    <dialog id="active_players_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-xs p-3 rounded-xl bg-slate-800 border-2 border-purple-300">
        {/* Title */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg text-purple-300">Active Players</h3>
          <span className="font-semibold text-xs text-slate-400">
            Player total: {gameStateData.activePlayers.toString()}/{gameStateData.maxPlayers.toString()}
          </span>
        </div>

        {/* Players */}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {hasPlayers ? (
            gamePlayersData.map((address: string, index: number) => <PlayerEntry key={index} address={address} index={index} />)
          ) : (
            <div className="py-2 text-xs text-center text-slate-400">Lobby empty</div>
          )}
        </div>

        {/* Button */}
        <div className="modal-action flex justify-center mt-4">
          <AppBaseBtn onClick={closeModal} size="md" textSize="xs">
            Close
          </AppBaseBtn>
        </div>
      </form>
    </dialog>
  )
})

ActivePlayersModal.displayName = 'ActivePlayersModal'

export default ActivePlayersModal
