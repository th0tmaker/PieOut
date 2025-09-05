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

// Create a reusable ProfileData component that will display the profile game register data
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

// Create a modal component that displays the user game register box data
const ProfileModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { activeAddress } = useWallet()
  const { gameRegisterData, gamePlayersData } = useGameDataCtx()
  const { handle: handleMethod } = useMethodHandler()
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isProfileBlurbOpen } = getModalProps('profileBlurb')

  // States
  const [expectedRegState, setExpectedRegState] = useState<boolean | null>(null)

  // Computed values: Account States
  const accountStates = useMemo(() => {
    const isRegistered = !!gameRegisterData
    const isInActiveGame =
      gameRegisterData?.gameId !== undefined &&
      gameRegisterData.gameId !== 0n &&
      gamePlayersData?.some((player) => player === activeAddress)
    const isHostingGame = gameRegisterData?.hostingGame === true

    return {
      isRegistered,
      isInActiveGame,
      isHostingGame,
      canUnregister: isRegistered && !isInActiveGame && !isHostingGame,
    }
  }, [gameRegisterData, gamePlayersData, activeAddress])

  // Computed values: Processing State
  const processingStates = useMemo(() => {
    const isProcessing = expectedRegState !== null
    const isRegisterButtonDisabled = isProcessing || (accountStates.isRegistered && !accountStates.canUnregister)

    return {
      isProcessing,
      isRegisterButtonDisabled,
    }
  }, [expectedRegState, accountStates])

  // Computed values: Set unregister button title element text
  const setUnregisterTitleText = useMemo(() => {
    if (accountStates.isHostingGame) {
      return 'You must delete your game instance first in order to unregister'
    }
    if (accountStates.isInActiveGame) {
      return 'Cannot unregister while in an active game'
    }
    return undefined
  }, [accountStates.isHostingGame, accountStates.isInActiveGame])

  // Handlers
  // Define a method that handles logic on register or unregister button click
  const handleRegisterAction = useCallback(
    // Define two possible button actions, either 'register' or 'unregister'
    async (action: 'register' | 'unregister') => {
      // Try block
      try {
        // Set the expected registration state default to be 'register'
        setExpectedRegState(action === 'register')

        // If action is 'register'
        if (action === 'register') {
          // Log
          // consoleLogger.info('Register button clicked')

          // Use methodHandler to call and await the smart cotnract `getBoxGameRegister` method
          await handleMethod('getBoxGameRegister')
          // Else, action is equal to 'unregister'
        } else {
          // Log
          // consoleLogger.info('Unregister button clicked')

          // Use methodHandler to call and await the smart cotnract `delBoxGameRegisterForSelf` method
          await handleMethod('delBoxGameRegisterForSelf')
        }
        // Catch error
      } catch (error) {
        // Log
        consoleLogger.error(`${action} failed`, error)

        // In case of error, set the expected registration state to null
        setExpectedRegState(null)
      }
    },
    [handleMethod],
  )

  // Define a method that handles logic on the unregister other button click
  const handleUnregisterOtherClick = useCallback(() => {
    // On click, toggle unregister modal
    toggleModal('unregister')
  }, [toggleModal])

  // Effects
  useEffect(() => {
    // If `expectedRegState` is null, return early
    if (expectedRegState === null) return

    // Determine current registration state (true if registered, false if not)
    const isNowRegistered = !!gameRegisterData

    // Clear `expectedRegState` if the actual state matches the expected one
    if (isNowRegistered === expectedRegState) {
      setExpectedRegState(null)
    }
  }, [gameRegisterData, expectedRegState])

  // Get account and processing states and their computed values
  const { isRegistered } = accountStates
  const { isProcessing, isRegisterButtonDisabled } = processingStates

  // Render JSX
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

          {/* Help Message */}
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
              handleUnregisterToggle={handleUnregisterOtherClick}
            />
          </div>

          {/* Register/Unregister & Close Buttons */}
          <div className="modal-action flex justify-center">
            <AppBaseBtn
              onClick={() => handleRegisterAction(isRegistered ? 'unregister' : 'register')}
              disabled={isRegisterButtonDisabled}
              title={isRegistered && setUnregisterTitleText ? setUnregisterTitleText : undefined}
            >
              {isRegistered ? 'Unregister' : 'Register'}
            </AppBaseBtn>
            <AppBaseBtn onClick={closeModal} disabled={isProcessing}>
              Close
            </AppBaseBtn>
          </div>
        </form>
      </dialog>

      {/* Profile Modal About Portal */}
      <UnregisterModal {...getModalProps('unregister')} />
      {isProfileBlurbOpen && <AboutPortal title="About Profile" text={ProfileAboutContent()} onClose={() => toggleModal('profileBlurb')} />}
    </>
  )
})

ProfileModal.displayName = 'ProfileModal'

export default ProfileModal
