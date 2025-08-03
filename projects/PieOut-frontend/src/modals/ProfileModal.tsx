import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ProfileBlurbContent from '../blurbs/ProfileBlurb'
import BlurbPortal from '../components/BlurbPortal'
import { CopyAddressBtn } from '../components/CopyAddressBtn'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'

interface ProfileModalInterface extends ModalInterface {}

const ProfileModal = React.memo(({ openModal, closeModal }: ProfileModalInterface) => {
  const { activeAddress } = useWallet()
  const { gameRegisterData, gameStateData, gamePlayersData } = useGameDataCtx()
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isProfileBlurbOpen } = getModalProps('profileBlurb')
  const { handle: handleMethod } = useMethodHandler()

  // Processing state tracking
  const [expectedRegisterState, setExpectedRegisterState] = useState(false)

  // Memoize Profile modal data and relevant account related boolean states
  const data = useMemo(
    () => ({
      gameRegisterData,
      gameStateData,
      gamePlayersData,
    }),
    [gameRegisterData, gameStateData, gamePlayersData],
  )

  const accState = useMemo(() => {
    const isRegistered = !!data.gameRegisterData
    const isInActiveGame =
      data.gameRegisterData?.gameId !== undefined &&
      data.gameRegisterData.gameId !== 0n &&
      data.gamePlayersData?.some((player) => player === activeAddress)

    return {
      isRegistered,
      isInActiveGame,
      canUnregister: isRegistered && !isInActiveGame,
      displayData: data.gameRegisterData
        ? {
            hostingGame: data.gameRegisterData.hostingGame?.toString() ?? 'N/D',
            gameId: (data.gameRegisterData.gameId?.toString() ?? 'N/D') + (data.gameRegisterData.gameId !== undefined ? ' #' : ''),
            bestScore: (data.gameRegisterData.bestScore?.toString() ?? 'N/D') + (data.gameRegisterData.bestScore !== undefined ? ' ☆' : ''),
            commitRound:
              (data.gameRegisterData.commitRandRound?.toString() ?? 'N/D') +
              (data.gameRegisterData.commitRandRound !== undefined ? ' ❒' : ''),
            expiryRound:
              (data.gameRegisterData.expiryRound?.toString() ?? 'N/D') + (data.gameRegisterData.expiryRound !== undefined ? ' ❒' : ''),
          }
        : null,
    }
  }, [data, activeAddress])

  // Reset processing state when gameRegisterData changes (indicating transaction complete)
  useEffect(() => {
    if (expectedRegisterState && accState.isRegistered && expectedRegisterState) {
      // Reset when registration state actually changes
      setExpectedRegisterState(false)
    }
  }, [gameRegisterData, expectedRegisterState])

  // Memoized handlers
  const handleRegisterBtnToggle = useCallback(async () => {
    try {
      setExpectedRegisterState(true)
      if (accState.isRegistered) {
        consoleLogger.info('Unregister button clicked')
        await handleMethod('delBoxGameRegisterForSelf', { gameId: gameRegisterData?.gameId })
      } else {
        consoleLogger.info('Register button clicked')
        await handleMethod('getBoxGameRegister')
      }
    } catch (error) {
      consoleLogger.error('Register/Unregister failed', error)
      setExpectedRegisterState(false)
    }
  }, [accState.isRegistered, handleMethod])

  const handleUnregisterClick = useCallback(() => {
    consoleLogger.info('Unregister another account clicked')
  }, [])

  // Reusable components
  const DataRow = useCallback(
    ({ label, value, className = 'text-cyan-300' }: { label: string; value: React.ReactNode; className?: string }) => (
      <p>
        {label}: <span className={className}>{value}</span>
      </p>
    ),
    [],
  )

  const ActionButton = useCallback(
    ({
      onClick,
      disabled,
      children,
      className = 'font-bold underline transition-colors duration-200',
    }: {
      onClick: () => void
      disabled: boolean
      children: React.ReactNode
      className?: string
    }) => (
      <button
        className={`${className} ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-pink-400 hover:text-lime-300'}`}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    ),
    [],
  )

  const ModalButton = useCallback(
    ({ onClick, disabled = false, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
      <button
        className={`px-3 py-1 rounded font-semibold transition-colors duration-200 border-2 ${
          disabled
            ? 'bg-gray-700 text-gray-300 border-gray-500 cursor-not-allowed pointer-events-none'
            : 'bg-slate-800 text-pink-300 border-pink-400 hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200'
        }`}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    ),
    [],
  )

  const renderProfileData = useCallback(
    () => (
      <div className="w-max mx-auto text-center">
        <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-2" />
        <div className="space-y-1 pt-2 text-indigo-200 font-bold">
          <DataRow
            label="Status"
            value={accState.isRegistered ? 'Registered' : 'Not Registered'}
            className={accState.isRegistered ? 'text-green-400' : 'text-red-400'}
          />

          <p>
            Account:
            <span className="text-cyan-300 ml-1 flex items-center justify-center">
              {ellipseAddress(activeAddress!)}
              <CopyAddressBtn value={activeAddress!} title="Copy full address" />
            </span>
          </p>

          {accState.displayData && (
            <>
              <DataRow label="Hosting Game" value={accState.displayData.hostingGame} />
              <DataRow label="Game ID" value={accState.displayData.gameId} />
              <DataRow label="Best Score" value={accState.displayData.bestScore} />
              <DataRow label="Commit Round" value={accState.displayData.commitRound} />
              <DataRow label="Expiry Round" value={accState.displayData.expiryRound} />
            </>
          )}
        </div>
        <hr className="border-t-[2px] border-cyan-300 opacity-80 mt-4" />
      </div>
    ),
    [accState, activeAddress, DataRow],
  )

  return (
    <>
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

          {/* Profile Data */}
          {renderProfileData()}

          {/* Unregister Other Section */}
          <div className="mt-2 text-center text-white space-y-1">
            <p>
              Want to unregister
              <br />
              another account?
            </p>

            {/* Processing State or Unregister Other Button */}
            {expectedRegisterState ? (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">PROCESSING...</span>
                  <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
                </span>
              </div>
            ) : (
              <ActionButton onClick={handleUnregisterClick} disabled={expectedRegisterState}>
                CLICK HERE
              </ActionButton>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-action flex justify-center gap-2">
            <ModalButton
              onClick={handleRegisterBtnToggle}
              disabled={expectedRegisterState || (accState.isRegistered && !accState.canUnregister)}
            >
              {accState.isRegistered ? 'Unregister' : 'Register'}
            </ModalButton>

            <ModalButton onClick={closeModal} disabled={expectedRegisterState}>
              Close
            </ModalButton>
          </div>
        </form>
      </dialog>

      {isProfileBlurbOpen && <BlurbPortal title="About Profile" text={ProfileBlurbContent()} onClose={() => toggleModal('profileBlurb')} />}
    </>
  )
})

export default ProfileModal
