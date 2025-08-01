import { useWallet } from '@txnlab/use-wallet-react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import BlurbPortal from './BlurbPortal'
import HonorsBlurbContent from '../blurbs/HonorsBlurb'
import { ModalInterface } from '../interfaces/modal'
import { useModal } from '../hooks/useModal'
import { useAppCtx } from '../hooks/useAppCtx'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { CopyAddressBtn } from '../components/CopyAddressBtn'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { lookupTrophyAssetBalances } from '../utils/network/getAccTrophyBalance'

const ActionButton = React.memo(
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
)

const ModalButton = React.memo(({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) => (
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
))

interface HonorsModalInterface extends ModalInterface {}

const HonorsModal = React.memo(({ openModal, closeModal }: HonorsModalInterface) => {
  const { activeAddress } = useWallet()
  const { appClient } = useAppCtx()
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isHonorsBlurbOpen } = getModalProps('honorsBlurb')
  const { gameTrophyData, trophyHolderAddress, accsWithTrophyBalance, setAccsWithTrophyBalance, isGameDataLoading } = useGameDataCtx()
  const { handle: handleMethod, isLoading: isMethodLoading } = useMethodHandler()
  const [isAssetOptTxnLoading, setIsAssetOptTxnLoading] = useState(false)
  const [expectedClaimState, setExpectedClaimState] = useState(false)
  const [expectedOptInState, setExpectedOptInState] = useState<boolean | null>(null)

  // Memoize context values to prevent unnecessary re-renders from reference changes
  const gameData = useMemo(
    () => ({
      gameTrophyData,
      trophyHolderAddress,
      accsWithTrophyBalance,
      isGameDataLoading,
    }),
    [
      gameTrophyData?.assetId,
      gameTrophyData?.athScore,
      gameTrophyData?.athAddress,
      trophyHolderAddress,
      accsWithTrophyBalance?.length,
      isGameDataLoading,
    ],
  )

  // Memoized computed states to prevent unnecessary recalculations
  const computedStates = useMemo(
    () => ({
      isCurrentlyOptedIn: activeAddress ? gameData.accsWithTrophyBalance?.includes(activeAddress) : false,
      isTrophyHolder: activeAddress === gameData.trophyHolderAddress,
    }),
    [activeAddress, gameData.accsWithTrophyBalance, gameData.trophyHolderAddress],
  )

  const { isCurrentlyOptedIn, isTrophyHolder } = computedStates

  const isProcessingAnyTxn = expectedOptInState !== null || expectedClaimState
  const isOptButtonDisabled = isAssetOptTxnLoading || gameData.isGameDataLoading || expectedOptInState !== null
  const isClaimDisabled =
    isProcessingAnyTxn || isMethodLoading || !isCurrentlyOptedIn || activeAddress !== gameData.gameTrophyData?.athAddress

  // Reset states when conditions are met
  useEffect(() => {
    if (expectedOptInState !== null && isCurrentlyOptedIn === expectedOptInState) {
      setExpectedOptInState(null)
    }
  }, [isCurrentlyOptedIn, expectedOptInState])

  useEffect(() => {
    if (expectedClaimState && activeAddress === gameData.trophyHolderAddress) {
      setExpectedClaimState(false)
    }
  }, [gameData.trophyHolderAddress, activeAddress, expectedClaimState])

  // Generic asset transaction handler
  const handleAssetTransaction = async (transactionType: 'optIn' | 'optOut') => {
    if (!appClient || !activeAddress || !gameTrophyData?.assetId) return

    const isOptIn = transactionType === 'optIn'

    try {
      setIsAssetOptTxnLoading(true)
      setExpectedOptInState(isOptIn)

      if (isOptIn) {
        await appClient.algorand.send.assetOptIn({
          sender: activeAddress,
          assetId: gameTrophyData.assetId,
        })
      } else {
        await appClient.algorand.send.assetOptOut({
          sender: activeAddress,
          assetId: gameTrophyData.assetId,
          creator: appClient.appAddress,
          ensureZeroBalance: true,
        })
      }

      const { optedIn } = await lookupTrophyAssetBalances(gameTrophyData.assetId, appClient.algorand.client.indexer)
      setAccsWithTrophyBalance(optedIn)
    } catch (err) {
      consoleLogger.error(`Asset ${transactionType} failed`, err)
      setExpectedOptInState(null)
    } finally {
      setIsAssetOptTxnLoading(false)
    }
  }

  const handleClaim = async () => {
    try {
      setExpectedClaimState(true)
      await handleMethod('claimTrophy')
    } catch (error) {
      consoleLogger.error('Claim trophy failed', error)
      setExpectedClaimState(false)
    }
  }

  const renderTrophyInfo = useCallback(() => {
    if (!gameData.gameTrophyData) return null

    return (
      <div className="w-max mx-auto text-center">
        <hr className="border-t-[2px] border-yellow-300 opacity-80 mt-2" />
        <div className="space-y-1 pt-2 text-indigo-200 font-bold">
          <p>
            Trophy (Asset ID): <span className="text-yellow-300">{gameData.gameTrophyData.assetId.toString()} 🏆︎</span>
          </p>
          <p className="flex items-center">
            Trophy (Holder):
            <span className="text-yellow-300 ml-1 flex items-center">
              {gameData.trophyHolderAddress ? ellipseAddress(gameData.trophyHolderAddress, 4) : ''}
              {gameData.trophyHolderAddress && <CopyAddressBtn value={gameData.trophyHolderAddress} title="Copy full address" />}
            </span>
          </p>
          <p>
            ATH Score: <span className="text-yellow-300">{gameData.gameTrophyData.athScore.toString()} 🗲</span>
          </p>
          <p className="flex items-center">
            ATH Address:
            <span className="text-yellow-300 ml-1 flex items-center">
              {ellipseAddress(gameData.gameTrophyData.athAddress, 4)}
              <CopyAddressBtn value={gameData.gameTrophyData.athAddress} title="Copy full address" />
            </span>
          </p>
        </div>
        <hr className="border-t-[2px] border-yellow-300 opacity-80 mt-4" />
      </div>
    )
  }, [gameData.gameTrophyData, gameData.trophyHolderAddress])

  const renderStatusMessages = () => (
    <>
      {isTrophyHolder && <p className="text-green-400 text-sm mb-2">You are the current asset holder.</p>}
      {!isTrophyHolder && (
        <p className={`mb-2 text-sm ${isCurrentlyOptedIn ? 'text-green-400' : 'text-red-400'}`}>
          {isCurrentlyOptedIn ? 'You are already opted in.' : 'You are not opted in yet.'}
        </p>
      )}
    </>
  )

  const renderOptButtons = () => {
    if (isProcessingAnyTxn) {
      return (
        <div className="mt-1">
          <span className="inline-flex items-center gap-1">
            <span className="text-gray-400">PROCESSING...</span>
            <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
          </span>
        </div>
      )
    }

    if (!isTrophyHolder) {
      return (
        <ActionButton onClick={() => handleAssetTransaction(isCurrentlyOptedIn ? 'optOut' : 'optIn')} disabled={isOptButtonDisabled}>
          {isCurrentlyOptedIn ? 'OPT-OUT HERE' : 'OPT-IN HERE'}
        </ActionButton>
      )
    }

    return null
  }

  if (!gameTrophyData?.assetId) return null

  return (
    <>
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

          {/* Trophy Data */}
          {renderTrophyInfo()}

          <div className="mt-2 text-center text-white space-y-1">
            <p>
              <span className="text-green-400 font-bold mb-2">To claim Trophy asset in a transfer:</span>
              <br />● You must Opt-In
              <br />● You must be the ATH address
            </p>

            {renderStatusMessages()}
            {renderOptButtons()}
          </div>

          {/* Action Buttons */}
          <div className="modal-action flex justify-center gap-2">
            <ModalButton onClick={handleClaim} disabled={isClaimDisabled || isTrophyHolder}>
              Claim
            </ModalButton>
            <ModalButton onClick={closeModal} disabled={isProcessingAnyTxn}>
              Close
            </ModalButton>
          </div>
        </form>
      </dialog>

      {isHonorsBlurbOpen && <BlurbPortal title="About Honors" text={HonorsBlurbContent()} onClose={() => toggleModal('honorsBlurb')} />}
    </>
  )
})

export default HonorsModal
