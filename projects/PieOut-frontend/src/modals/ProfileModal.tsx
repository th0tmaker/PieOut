import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ProfileAboutContent from '../abouts/ProfileAbout'
import { AppBaseBtn } from '../buttons/AppBaseBtn'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import AboutPortal from '../components/AboutPortal'
import { GameRegister } from '../contracts/Pieout'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'
import UnregisterModal from './UnregisterModal'

// Profile data display component
const ProfileData = ({
  registerData,
  activeAddress,
  isRegistered,
}: {
  registerData: GameRegister | undefined
  activeAddress: string
  isRegistered: boolean
}) => (
  <div className="w-max mx-auto text-center">
    <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-2" />
    <div className="space-y-1 pt-2 text-indigo-200 font-bold">
      <p>
        Status: <span className={isRegistered ? 'text-green-400' : 'text-red-400'}>{isRegistered ? 'Registered' : 'Not Registered'}</span>
      </p>
      <p className="flex items-center">
        Account:
        <span className="text-cyan-300 ml-1 flex items-center">
          {ellipseAddress(activeAddress)}
          <CopyAddressBtn value={activeAddress} title="Copy full address" />
        </span>
      </p>
      {registerData && (
        <>
          <p>
            Hosting Game: <span className="text-cyan-300">{registerData.hostingGame.toString()}</span>
          </p>
          <p>
            Game ID: <span className="text-cyan-300">{`${registerData.gameId.toString()}`}</span>
          </p>
          <p>
            Best Score: <span className="text-cyan-300">{`${registerData.bestScore.toString()} ☆`}</span>
          </p>
          <p>
            Commit Round: <span className="text-cyan-300">{`${registerData.commitRandRound.toString()} ❒`}</span>
          </p>
          <p>
            Expiry Round: <span className="text-cyan-300">{`${registerData.expiryRound.toString()} ❒`}</span>
          </p>
        </>
      )}
    </div>
    <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-4" />
  </div>
)

// Unregister other section
const UnregisterOtherSection = ({
  isProcessing,
  isUnregisterOtherBtnDisabled,
  handleUnregisterToggle,
}: {
  isProcessing: boolean
  isUnregisterOtherBtnDisabled: boolean
  handleUnregisterToggle: () => void
}) => {
  if (isProcessing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-gray-400">PROCESSING...</span>
        <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
      </span>
    )
  }

  return (
    <AppBaseBtn variant="text" disabled={isUnregisterOtherBtnDisabled} onClick={handleUnregisterToggle}>
      CLICK HERE
    </AppBaseBtn>
  )
}

// Main modal component
const ProfileModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks - ALL hooks must be called before any conditional returns
  const { activeAddress } = useWallet()
  const { gameRegisterData, gamePlayersData } = useGameDataCtx()
  const { handle: handleMethod } = useMethodHandler()
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isProfileBlurbOpen } = getModalProps('profileBlurb')

  // States
  const [expectedRegState, setExpectedRegState] = useState<boolean | null>(null)

  // Memos
  const accountStates = useMemo(() => {
    const isRegistered = !!gameRegisterData
    const isInActiveGame =
      gameRegisterData?.gameId !== undefined &&
      gameRegisterData.gameId !== 0n &&
      gamePlayersData?.some((player) => player === activeAddress)

    return {
      isRegistered,
      isInActiveGame,
      canUnregister: isRegistered && !isInActiveGame,
    }
  }, [gameRegisterData, gamePlayersData, activeAddress])

  const processingStates = useMemo(() => {
    const isProcessing = expectedRegState !== null
    const isRegisterButtonDisabled = isProcessing || (accountStates.isRegistered && !accountStates.canUnregister)

    return {
      isProcessing,
      isRegisterButtonDisabled,
    }
  }, [expectedRegState, accountStates])

  // Handlers
  const handleRegisterAction = useCallback(
    async (action: 'register' | 'unregister') => {
      try {
        setExpectedRegState(action === 'register')
        if (action === 'register') {
          consoleLogger.info('Register button clicked')
          await handleMethod('getBoxGameRegister')
        } else {
          consoleLogger.info('Unregister button clicked')
          await handleMethod('delBoxGameRegisterForSelf')
        }
      } catch (error) {
        consoleLogger.error(`${action} failed`, error)
        setExpectedRegState(null)
      }
    },
    [handleMethod],
  )

  const handleUnregisterClick = useCallback(() => {
    toggleModal('unregister')
  }, [toggleModal])

  // Effects
  useEffect(() => {
    if (expectedRegState === null) return
    const isNowRegistered = !!gameRegisterData
    if (isNowRegistered === expectedRegState) {
      setExpectedRegState(null)
    }
  }, [gameRegisterData, expectedRegState])

  // Conditions
  const { isRegistered } = accountStates
  const { isProcessing, isRegisterButtonDisabled } = processingStates

  // Render
  return (
    <>
      <dialog id="profile_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-cyan-300 bg-slate-800">
          {/* Title */}
          <div className="mb-2 flex justify-center">
            <AppBaseBtn variant="text" textSize="xl3" onClick={() => toggleModal('profileBlurb')} disabled={isProcessing}>
              PROFILE
            </AppBaseBtn>
          </div>

          {/* Help */}
          <div className="text-sm text-center text-white space-y-1">
            <p>Click title for more info</p>
          </div>

          {/* Profile Info */}
          <ProfileData registerData={gameRegisterData} activeAddress={activeAddress!} isRegistered={isRegistered} />

          {/* Unregister Other Section */}
          <div className="mt-2 text-center text-white space-y-1">
            <p>
              Want to unregister
              <br />
              another account?
            </p>
            <UnregisterOtherSection
              isProcessing={isProcessing}
              isUnregisterOtherBtnDisabled={isProcessing}
              handleUnregisterToggle={handleUnregisterClick}
            />
          </div>

          {/* Action Buttons */}
          <div className="modal-action flex justify-center">
            <AppBaseBtn onClick={() => handleRegisterAction(isRegistered ? 'unregister' : 'register')} disabled={isRegisterButtonDisabled}>
              {isRegistered ? 'Unregister' : 'Register'}
            </AppBaseBtn>
            <AppBaseBtn onClick={closeModal} disabled={isProcessing}>
              Close
            </AppBaseBtn>
          </div>
        </form>
      </dialog>
      <UnregisterModal {...getModalProps('unregister')} />
      {isProfileBlurbOpen && <AboutPortal title="About Profile" text={ProfileAboutContent()} onClose={() => toggleModal('profileBlurb')} />}
    </>
  )
})

ProfileModal.displayName = 'ProfileModal'

export default ProfileModal
