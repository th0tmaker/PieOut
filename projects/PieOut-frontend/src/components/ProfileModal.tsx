import { useWallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import BlurbPortal from './BlurbPortal'
import ProfileBlurbContent from '../blurbs/ProfileBlurb'
import { ModalInterface } from '../interfaces/modal'
import { useModal } from '../hooks/useModal'
import { useGameBoxDataCtx } from '../hooks/useGameBoxDataCtx'

interface ProfileModalInterface extends ModalInterface {}

const ProfileModal = ({ openModal, closeModal }: ProfileModalInterface) => {
  const { activeAddress } = useWallet()
  const { gameRegisterData } = useGameBoxDataCtx()
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
                <span className={gameRegisterData ? 'text-green-400' : 'text-red-400'}>
                  {gameRegisterData ? 'Registered' : 'Not Registered'}
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
                {gameRegisterData?.gameId !== undefined && gameRegisterData?.gameId !== null ? (
                  <span className="text-cyan-300">{`${gameRegisterData.gameId.toString()} #`}</span>
                ) : (
                  'N/D'
                )}
              </p>
              {/* Commit Round */}
              <p>
                Commit Round:{' '}
                {gameRegisterData?.commitRandRound !== undefined && gameRegisterData?.commitRandRound !== null ? (
                  <span className="text-cyan-300">{`${gameRegisterData?.commitRandRound} ❒`}</span>
                ) : (
                  'N/D'
                )}
              </p>
              {/* Expiry Round */}
              <p>
                Expiry Round:{' '}
                {gameRegisterData?.expiryRound !== undefined && gameRegisterData?.expiryRound !== null ? (
                  <span className="text-cyan-300">{`${gameRegisterData?.expiryRound} ❒`}</span>
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
                consoleLogger.info(gameRegisterData ? 'Unregister button clicked' : 'Register button clicked')
              }}
            >
              {gameRegisterData ? 'Unregister' : 'Register'}
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
