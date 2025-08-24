import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useMemo, useState } from 'react'
import HonorsAboutContent from '../abouts/HonorsAbout'
import AboutPortal from '../components/AboutPortal'
import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import { useAppCtx } from '../hooks/useAppCtx'
import { useGameDataCtx } from '../hooks/useGameDataCtx'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useModal } from '../hooks/useModal'
import { ModalInterface } from '../interfaces/modal'
import { ellipseAddress } from '../utils/ellipseAddress'
import { lookupTrophyAssetBalances } from '../utils/network/getAccTrophyBalance'
import { AppBaseBtn } from '../buttons/AppBaseBtn'
import { GameTrophy } from '../contracts/Pieout'

// Trophy data display component
const TrophyData = ({ gameTrophyData, trophyHolderAddress }: { gameTrophyData: GameTrophy; trophyHolderAddress: string | undefined }) => (
  <div className="w-max mx-auto text-center">
    <hr className="border-t-[2px] border-yellow-300 opacity-80 mt-2" />
    <div className="space-y-1 pt-2 text-indigo-200 font-bold">
      <p>
        Trophy (Asset ID): <span className="text-yellow-300">{gameTrophyData.assetId.toString()} 🏆︎</span>
      </p>
      <p className="flex items-center">
        Trophy (Holder):
        <span className="text-yellow-300 ml-1 flex items-center">
          {trophyHolderAddress ? ellipseAddress(trophyHolderAddress, 4) : ''}
          {trophyHolderAddress && <CopyAddressBtn value={trophyHolderAddress} title="Copy full address" />}
        </span>
      </p>
      <p>
        ATH Score: <span className="text-yellow-300">{gameTrophyData.athScore.toString()} 🗲</span>
      </p>
      <p className="flex items-center">
        ATH Address:
        <span className="text-yellow-300 ml-1 flex items-center">
          {ellipseAddress(gameTrophyData.athAddress, 4)}
          <CopyAddressBtn value={gameTrophyData.athAddress} title="Copy full address" />
        </span>
      </p>
    </div>
    <hr className="border-t-[2px] border-yellow-300 opacity-80 mt-4" />
  </div>
)

// User status message component
const UserStatusMsg = ({ isTrophyHolder, isCurrentlyOptedIn }: { isTrophyHolder: boolean; isCurrentlyOptedIn: boolean | undefined }) => (
  <>
    {isTrophyHolder && <p className="text-green-400 text-sm mb-2">You are the current asset holder.</p>}
    {!isTrophyHolder && (
      <p className={`mb-2 text-sm ${isCurrentlyOptedIn ? 'text-green-400' : 'text-red-400'}`}>
        {isCurrentlyOptedIn ? 'You are opted in successfully.' : 'You are not opted in yet!'}
      </p>
    )}
  </>
)

// Opt-in/out section component
const OptSection = ({
  isProcessing,
  isTrophyHolder,
  isCurrentlyOptedIn,
  handleOptTxn,
  isOptBtnDisabled,
}: {
  isProcessing: boolean // True if opt in/out method is processing
  isTrophyHolder: boolean // True if `activeAddress` is holding trophy asset in balance
  isCurrentlyOptedIn: boolean | undefined // True if the active address has opted in
  handleOptTxn: (type: 'optIn' | 'optOut') => void // Callback to initiate opt-in/out method
  isOptBtnDisabled: boolean // True if the opt button should be disabled
}) => {
  // If a transaction is being processed, render "PROCESSING..." message with load spin animation
  if (isProcessing) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-gray-400">PROCESSING...</span>
        <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"></span>
      </span>
    )
  }

  // If the player is not the trophy holder, render opt-in/out button
  if (!isTrophyHolder) {
    return (
      <AppBaseBtn onClick={() => handleOptTxn(isCurrentlyOptedIn ? 'optOut' : 'optIn')} disabled={isOptBtnDisabled} variant="text">
        {isCurrentlyOptedIn ? 'OPT-OUT HERE' : 'OPT-IN HERE'}
      </AppBaseBtn>
    )
  }

  // If the user is the trophy holder, do not render any button (can't opt out while holding the trophy)
  return null
}
// Create a modal component that displays the application honors
const HonorsModal = React.memo(({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { activeAddress } = useWallet()
  const { appClient } = useAppCtx()
  const { handle: handleMethod, isLoading: isMethodLoading } = useMethodHandler()
  const { gameTrophyData, trophyHolderAddress, accsWithTrophyBalance, setAccsWithTrophyBalance, isGameDataLoading } = useGameDataCtx()

  // Modal
  const { toggleModal, getModalProps } = useModal()
  const { openModal: isHonorsBlurbOpen } = getModalProps('honorsBlurb')

  // States
  const [isOptTxnLoading, setIsOptTxnLoading] = useState(false)
  const [expectedClaimState, setExpectedClaimState] = useState(false)
  const [expectedOptInState, setExpectedOptInState] = useState<boolean | null>(null)

  // Memos
  const accountStates = useMemo(
    () => ({
      // Check if the currently active account is in the list of accounts that have opted in to asset
      isCurrentlyOptedIn: activeAddress ? accsWithTrophyBalance?.includes(activeAddress) : false,
      // Check if the currently active account is holding the trophy in their asset balance
      isTrophyHolder: activeAddress === trophyHolderAddress,
    }),
    [activeAddress, accsWithTrophyBalance, trophyHolderAddress],
  )

  const processingStates = useMemo(
    () => ({
      // Indicate if a state is currently being processed
      isProcessing: expectedOptInState !== null || expectedClaimState,
      // Denote whether the 'Opt-In' button should be disabled (either due to loading or state mismatch)
      isOptBtnDisabled: isOptTxnLoading || isGameDataLoading || expectedOptInState !== null,
    }),
    [expectedOptInState, expectedClaimState, isOptTxnLoading, isGameDataLoading],
  )

  // Effects
  useEffect(() => {
    // If no opt-in expected, exit early
    if (expectedOptInState === null) return
    // If the active account's opt-in state matches the expected state (i.e., confirmed), clear the expectation
    if (accountStates.isCurrentlyOptedIn === expectedOptInState) setExpectedOptInState(null)
  }, [accountStates.isCurrentlyOptedIn, expectedOptInState])

  useEffect(() => {
    // If a claim is expected and the active account is now the trophy holder, clear the claim state
    if (expectedClaimState && activeAddress === trophyHolderAddress) {
      setExpectedClaimState(false)
    }
  }, [trophyHolderAddress, activeAddress, expectedClaimState])

  // Early return if no necessary data
  if (!appClient || !gameTrophyData?.assetId) return null

  // Conditions
  const { isCurrentlyOptedIn, isTrophyHolder } = accountStates
  const { isProcessing, isOptBtnDisabled } = processingStates
  const isClaimDisabled = // Claim button disabled:
    processingStates.isProcessing || // If state is being processed
    isMethodLoading || // If underlying method call is loading
    !accountStates.isCurrentlyOptedIn || // If account is not currently opted in
    activeAddress !== gameTrophyData?.athAddress // if `activeAddress` is not the ATH address

  // Handlers
  // Handle both `optIn` & `optOut` transaction sends
  const handleOptTxn = async (transactionType: 'optIn' | 'optOut') => {
    // Early return if no necessary data
    if (!appClient || !activeAddress || !gameTrophyData?.assetId) return

    // Store transaction type `optIn`
    const isOptIn = transactionType === 'optIn'

    // Try block
    try {
      // Update load and expected state flags
      setIsOptTxnLoading(true)
      setExpectedOptInState(isOptIn)

      // If transaction type is `optIn`, send `assetOptIn` transaction
      if (isOptIn) {
        await appClient.algorand.send.assetOptIn({
          sender: activeAddress,
          assetId: gameTrophyData.assetId,
        })
        // If transaction type is `optOut`, send `assetOptOut` transaction
      } else {
        await appClient.algorand.send.assetOptOut({
          sender: activeAddress,
          assetId: gameTrophyData.assetId,
          creator: appClient.appAddress,
          ensureZeroBalance: true,
        })
      }

      // Lookup every account that is opted in to trophy asset
      const { optedIn } = await lookupTrophyAssetBalances(gameTrophyData.assetId, appClient.algorand.client.indexer)

      // Update the array of opted-in accounts
      setAccsWithTrophyBalance(optedIn)
      // Catch error
    } catch (err) {
      consoleLogger.error(`Asset ${transactionType} failed`, err)
      setExpectedOptInState(null)
    } finally {
      // Update loading flag
      setIsOptTxnLoading(false)
    }
  }

  // Handle `claimTrophy` transaction send
  const handleClaimTxn = async () => {
    // Try block
    try {
      // Update expected state flag
      setExpectedClaimState(true)
      // Call app call transaction to `claimTrophy`
      await handleMethod('claimTrophy')
      // Catch error
    } catch (error) {
      consoleLogger.error('Claim trophy failed', error)
      // Update expected state flag
      setExpectedClaimState(false)
    }
  }

  // Render JSX
  return (
    <>
      <dialog id="honors_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
        <form method="dialog" className="modal-box border-2 rounded-xl border-yellow-300 bg-slate-800">
          {/* Title */}
          <div className="mb-2 flex justify-center">
            <AppBaseBtn variant="text" textSize="xl3" onClick={() => toggleModal('honorsBlurb')} disabled={isProcessing}>
              HONORS
            </AppBaseBtn>
          </div>

          {/* User help message */}
          <div className="text-sm text-center text-white space-y-1">
            <p>Click title for more info</p>
          </div>

          {/* Trophy Data */}
          <TrophyData gameTrophyData={gameTrophyData} trophyHolderAddress={trophyHolderAddress} />

          <div className="mt-2 text-center text-white space-y-1">
            <p>
              <span className="text-green-400 font-bold mb-2">To claim Trophy asset in a transfer:</span>
              <br />● You must Opt-In
              <br />● You must be the ATH address
            </p>

            <UserStatusMsg isTrophyHolder={isTrophyHolder} isCurrentlyOptedIn={isCurrentlyOptedIn} />
            <OptSection
              isProcessing={isProcessing}
              isTrophyHolder={isTrophyHolder}
              isCurrentlyOptedIn={isCurrentlyOptedIn}
              handleOptTxn={handleOptTxn}
              isOptBtnDisabled={isOptBtnDisabled}
            />
          </div>

          {/* Buttons */}
          <div className="modal-action flex justify-center">
            <AppBaseBtn onClick={handleClaimTxn} disabled={isClaimDisabled || isTrophyHolder}>
              Claim
            </AppBaseBtn>
            <AppBaseBtn onClick={closeModal} disabled={isProcessing}>
              Close
            </AppBaseBtn>
          </div>
        </form>
      </dialog>

      {isHonorsBlurbOpen && <AboutPortal title="About Honors" text={HonorsAboutContent()} onClose={() => toggleModal('honorsBlurb')} />}
    </>
  )
})

HonorsModal.displayName = 'HonorsModal'

export default HonorsModal
