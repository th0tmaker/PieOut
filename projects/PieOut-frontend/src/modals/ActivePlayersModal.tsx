import { CopyAddressBtn } from '../components/CopyAddressBtn'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'

const ActivePlayersModal = ({ openModal, closeModal }: ModalInterface) => {
  const { gameStateData, gamePlayersData } = useGameDataCtx()
  if (!gameStateData || !gamePlayersData) return null

  return (
    <dialog id="active_players_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box border-2 rounded-xl border-purple-300 bg-slate-800 max-w-xs p-3">
        {/* Title aligned left */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-purple-300">Active Players</h3>
            <span className="text-xs text-slate-400">
              Player count: {gameStateData?.activePlayers.toString()}/{gameStateData?.maxPlayers.toString()}
            </span>
          </div>
        </div>
        {/* Player List */}
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {gamePlayersData && gamePlayersData.length > 0 ? (
            gamePlayersData.map((address: string, index: number) => (
              <div
                key={index}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 flex items-center justify-between hover:bg-slate-600 transition-colors duration-200"
              >
                <span className="text-xs text-indigo-200 font-mono">
                  {index + 1}. {ellipseAddress(address, 6)}
                </span>
                <CopyAddressBtn className="text-sm" value={address} title="Copy full address" />
              </div>
            ))
          ) : (
            <div className="text-center text-slate-400 py-2 text-xs">Lobby empty</div>
          )}
        </div>

        {/* Close Button */}
        <div className="modal-action flex justify-center mt-2">
          <button
            className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold text-xs"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default ActivePlayersModal
