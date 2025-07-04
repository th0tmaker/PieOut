import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react'
import { useBoxCommitRand } from '../contexts/BoxCommitRandContext'
import { ellipseAddress } from '../utils/ellipseAddress'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import InfoPortal from './InfoPortal'
import ProfileText from './UserMsgText'
import { ModalInterface } from '../interfaces/modal'
import { hasBoxCommitRand } from '../conditions/conditions'

interface LeaderboardModalInterface extends ModalInterface {}

const LeaderboardModal = ({ openModal, closeModal }: LeaderboardModalInterface) => {
  const { activeAddress } = useWallet()
  const { boxCommitRand } = useBoxCommitRand()
  const hasBoxC_ = hasBoxCommitRand(boxCommitRand)
  const [isProfileInfoPortalOpen, setIsProfileInfoPortalOpen] = useState(false)

  return (
    <>
      {/* Modal */}
      <dialog id="leaderboard_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-cyan-300 bg-slate-800">
          {/* Profile */}
          <div className="mb-2 flex justify-center">
            <button
              className="tracking-wider cursor-pointer font-bold text-3xl text-pink-400 underline hover:text-lime-300 transition-colors duration-200 pb-1 px-2 text-center"
              type="button"
              onClick={() => setIsProfileInfoPortalOpen(true)}
            >
              PROFILE
            </button>
          </div>

          {/* User help message */}
          <div className="text-sm text-center text-white space-y-1">
            <p>Click title for more info</p>
          </div>

          {/* Box C_ Data */}
          <div className="w-max mx-auto text-center">
            {/* Divider 1 */}
            <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-2" />
            {/* Status */}
            <div className="space-y-1 pt-2 text-indigo-200 font-bold">
              <p>
                Status: <span className={hasBoxC_ ? 'text-green-400' : 'text-red-400'}>{hasBoxC_ ? 'Registered' : 'Not Registered'}</span>
              </p>
              {/* Account */}
              <p>
                Account:{' '}
                {hasBoxC_ ? (
                  <span className="text-cyan-300 ml-1 flex items-center justify-center">
                    {ellipseAddress(activeAddress ?? '')}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeAddress ?? '')
                        consoleLogger.info('Address copied to clipboard:', activeAddress)
                      }}
                      title="Copy full address"
                      className="text-pink-400 hover:text-lime-400 ml-2"
                    >
                      🗐
                    </button>
                  </span>
                ) : (
                  <span className="ml-1">N/D</span>
                )}
              </p>
              {/* Game ID */}
              <p>
                Game ID:{' '}
                {boxCommitRand?.gameId !== undefined && boxCommitRand?.gameId !== null ? (
                  <span className="text-cyan-300">{`${boxCommitRand.gameId.toString()} #`}</span>
                ) : (
                  'N/D'
                )}
              </p>
              {/* Commit Round */}
              <p>
                Commit Round:{' '}
                {boxCommitRand?.commitRound !== undefined && boxCommitRand?.commitRound !== null ? (
                  <span className="text-cyan-300">{`${boxCommitRand.commitRound} ❒`}</span>
                ) : (
                  'N/D'
                )}
              </p>
              {/* Expiry Round */}
              <p>
                Expiry Round:{' '}
                {boxCommitRand?.expiryRound !== undefined && boxCommitRand?.expiryRound !== null ? (
                  <span className="text-cyan-300">{`${boxCommitRand.expiryRound} ❒`}</span>
                ) : (
                  'N/D'
                )}
              </p>
            </div>
            {/* Divider 2 */}
            <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-4" />
          </div>

          {/* User help message for method delBoxCommitRandForOther */}
          <div className="mt-2 text-center text-white space-y-1">
            {/* Unregister other message*/}
            <p>
              Want to unregister
              <br />
              another account?
            </p>
            {/* Unregister other button*/}
            <button
              onClick={() => consoleLogger.info('Unregister another account clicked')}
              className="font-bold text-pink-400 underline hover:text-lime-300 transition-colors duration-200"
            >
              CLICK HERE
            </button>
          </div>

          {/* Register/Unregister Button */}
          <div className="modal-action flex justify-center">
            <button
              className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={() => {
                consoleLogger.info(hasBoxC_ ? 'Unregister button clicked' : 'Register button clicked')
              }}
            >
              {hasBoxC_ ? 'Unregister' : 'Register'}
            </button>
            {/* Close Modal Button */}
            <button
              className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </form>
      </dialog>
      {/* Display Profile Message Box */}
      {isProfileInfoPortalOpen && (
        <InfoPortal title="About Profile" text={ProfileText()} onClose={() => setIsProfileInfoPortalOpen(false)} />
      )}
    </>
  )
}

export default LeaderboardModal
