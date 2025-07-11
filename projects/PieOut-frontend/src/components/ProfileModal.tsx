import { useWallet } from '@txnlab/use-wallet-react'
import { useBoxCommitRandData } from '../hooks/useBoxCommitRandData'
import { ellipseAddress } from '../utils/ellipseAddress'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import BlurbPortal from './BlurbPortal'
import ProfileBlurbContent from '../blurbs/ProfileBlurb'
import { ModalInterface } from '../interfaces/modal'
import { hasBoxCommitRand } from '../conditions/conditions'
import { useModal } from '../hooks/useModal'

interface ProfileModalInterface extends ModalInterface {}

const ProfileModal = ({ openModal, closeModal }: ProfileModalInterface) => {
  const { activeAddress } = useWallet()
  const { boxCommitRandData } = useBoxCommitRandData()
  const hasBoxCommitRandData = hasBoxCommitRand(boxCommitRandData)
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isProfileBlurbOpen } = getModalProps('profileBlurb')

  return (
    <>
      {/* Modal */}
      <dialog id="profile_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-cyan-300 bg-slate-800">
          {/* Title */}
          <div className="mb-2 flex justify-center">
            <button
              className="tracking-wider cursor-pointer font-bold text-3xl text-pink-400 underline hover:text-lime-300 transition-colors duration-200 pb-1 px-2 text-center"
              type="button"
              onClick={() => toggleModal('profileBlurb')}
            >
              PROFILE
            </button>
          </div>

          {/* User notification */}
          <div className="text-sm text-center text-white space-y-1">
            <p>Click title for more info</p>
          </div>

          {/* Box Commit Rand Data */}
          <div className="w-max mx-auto text-center">
            {/* Divider 1 */}
            <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-2" />
            {/* Status */}
            <div className="space-y-1 pt-2 text-indigo-200 font-bold">
              <p>
                Status:{' '}
                <span className={hasBoxCommitRandData ? 'text-green-400' : 'text-red-400'}>
                  {hasBoxCommitRandData ? 'Registered' : 'Not Registered'}
                </span>
              </p>
              {/* Account */}
              <p>
                Account:{' '}
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
              </p>
              {/* Game ID */}
              <p>
                Game ID:{' '}
                {boxCommitRandData?.gameId !== undefined && boxCommitRandData?.gameId !== null ? (
                  <span className="text-cyan-300">{`${boxCommitRandData.gameId.toString()} #`}</span>
                ) : (
                  'N/D'
                )}
              </p>
              {/* Commit Round */}
              <p>
                Commit Round:{' '}
                {boxCommitRandData?.commitRound !== undefined && boxCommitRandData?.commitRound !== null ? (
                  <span className="text-cyan-300">{`${boxCommitRandData.commitRound} ❒`}</span>
                ) : (
                  'N/D'
                )}
              </p>
              {/* Expiry Round */}
              <p>
                Expiry Round:{' '}
                {boxCommitRandData?.expiryRound !== undefined && boxCommitRandData?.expiryRound !== null ? (
                  <span className="text-cyan-300">{`${boxCommitRandData.expiryRound} ❒`}</span>
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
          <div className="modal-action flex justify-center gap-2">
            <button
              className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={() => {
                consoleLogger.info(hasBoxCommitRandData ? 'Unregister button clicked' : 'Register button clicked')
              }}
            >
              {hasBoxCommitRandData ? 'Unregister' : 'Register'}
            </button>
            {/* Close Button */}
            <button
              className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </form>
      </dialog>
      {/* Profile Blurb */}
      {isProfileBlurbOpen && <BlurbPortal title="About Profile" text={ProfileBlurbContent()} onClose={() => toggleModal('profileBlurb')} />}
    </>
  )
}

export default ProfileModal
