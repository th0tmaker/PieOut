import { useWallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import BlurbPortal from './BlurbPortal'
import HonorsBlurbContent from '../blurbs/HonorsBlurb'
import { ModalInterface } from '../interfaces/modal'
import { useModal } from '../hooks/useModal'
import { useAppCtx } from '../hooks/useAppCtx'
import { useGameBoxDataCtx } from '../hooks/useGameBoxDataCtx'
interface HonorsModalInterface extends ModalInterface {}

const HonorsModal = ({ openModal, closeModal }: HonorsModalInterface) => {
  const { activeAddress } = useWallet()
  const { appMethodHandler } = useAppCtx()
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isHonorsBlurbOpen } = getModalProps('honorsBlurb')
  const { gameTrophyData } = useGameBoxDataCtx()

  return (
    <>
      {/* Modal */}
      <dialog id="honors_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-yellow-300 bg-slate-800">
          {/* Title */}
          <div className="mb-2 flex justify-center">
            <button
              className="tracking-wider cursor-pointer font-bold text-3xl text-pink-400 underline hover:text-lime-300 transition-colors duration-200 pb-1 px-2 text-center"
              type="button"
              onClick={() => toggleModal('honorsBlurb')}
            >
              HONORS
            </button>
          </div>

          {/* User help message */}
          <div className="text-sm text-center text-white space-y-1">
            <p>Click title for more info</p>
          </div>

          {/* Box C_ Data */}
          <div className="w-max mx-auto text-center">
            {/* Divider 1 */}
            <hr className="border-t-[2px] border-yellow-300 opacity-80 mt-2" />
            {/* High Score */}
            <div className="space-y-1 pt-2 text-indigo-200 font-bold">
              <p>
                High Score: <span className="text-yellow-300">{gameTrophyData?.athScore && `${gameTrophyData.athScore} ♕️`}</span>
              </p>
              {/* Highscorer */}
              <p className="flex items-center">
                Highscorer:
                <span className="text-yellow-300 ml-1 flex items-center">
                  {gameTrophyData ? ellipseAddress(gameTrophyData.athAddress, 4) : ''}
                  {gameTrophyData && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(gameTrophyData.athAddress)
                        consoleLogger.info('Address copied to clipboard:', activeAddress)
                      }}
                      title="Copy full address"
                      className="text-pink-400 hover:text-lime-400 ml-2"
                    >
                      🗐
                    </button>
                  )}
                </span>
              </p>
              {/* Trophy Asset ID */}
              <p>
                Trophy (Asset ID):{' '}
                <span className="text-yellow-300">{gameTrophyData?.assetId?.toString() && `${gameTrophyData.assetId.toString()} 🏆︎`}</span>
              </p>
            </div>
            {/* Divider 2 */}
            <hr className="border-t-[2px] border-yellow-300 opacity-80 mt-4" />
          </div>

          {/* User help message for method delBoxCommitRandForOther */}
          <div className="mt-2 text-center text-white space-y-1">
            {/* Unregister other message*/}
            <p>
              <span className="text-green-400 font-bold mb-2">To claim Trophy asset in a transfer:</span>
              <br />● You must Opt-In
              <br />● You must be Highscorer address
            </p>
            {/* Unregister other button*/}
            <button
              onClick={() => consoleLogger.info('Unregister another account clicked')}
              className="font-bold text-pink-400 underline hover:text-lime-300 transition-colors duration-200"
            >
              OPT-IN HERE
            </button>
          </div>

          {/* Claim Button */}
          <div className="modal-action flex justify-center gap-2">
            <button
              className="bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={() => appMethodHandler?.handle('claimTrophy')}
            >
              Claim
            </button>
            {/* Close Button */}
            <button
              className="flex justify-end bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </form>
      </dialog>
      {/* Honors Blurb */}
      {isHonorsBlurbOpen && <BlurbPortal title="About Honors" text={HonorsBlurbContent()} onClose={() => toggleModal('honorsBlurb')} />}
    </>
  )
}

export default HonorsModal
