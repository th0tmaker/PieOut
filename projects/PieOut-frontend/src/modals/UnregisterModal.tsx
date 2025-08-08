import { useState } from 'react'
import { ModalInterface } from '../interfaces/modal'
import { AppBaseBtn } from '../buttons/AppBaseBtn'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useAddressSanitizer } from '../hooks/useSanitizeInputs'
import { useMethodHandler } from '../hooks/useMethodHandler'
import { useAppCtx } from '../hooks/useAppCtx'
import { useWallet } from '@txnlab/use-wallet-react'
import { useLastRound } from '../hooks/useLastRound'
import { algorand } from '../utils/network/getAlgorandClient'

const UnregisterModal = ({ openModal, closeModal }: ModalInterface) => {
  const { activeAddress } = useWallet()
  const { appClient, appMethods } = useAppCtx()
  const { lastRound } = useLastRound(algorand.client.algod)
  const { handle: handleMethod, isLoading: isMethodLoading } = useMethodHandler()

  const [playerAddress, setPlayerAddress] = useState('')
  const [statusMessage, setStatusMessage] = useState(`Click 'Submit' to unregister an account.`)
  const [isProcessing, setIsProcessing] = useState(false)

  const sanitizeAddress = useAddressSanitizer(setPlayerAddress)
  const isPlayerAddressValid = playerAddress.trim().length === 58 && playerAddress !== activeAddress
  const isDisabled = isProcessing || isMethodLoading
  const canSubmit = !isDisabled && isPlayerAddressValid && activeAddress && appClient && appMethods

  const getStatusColor = (message: string) => {
    if (message.includes('Submit')) return 'text-white'
    if (message.includes('successfully')) return 'text-green-400'
    return 'text-red-400'
  }

  const handleSubmit = async () => {
    if (!activeAddress || !appClient || !appMethods || !playerAddress.trim()) return

    if (!isPlayerAddressValid) {
      setStatusMessage('Invalid address. Please ensure address has correct format, length, and is not your own.')
      return
    }

    try {
      const registerExists = await appMethods.doesBoxGameRegisterExist(appClient.appId, activeAddress, playerAddress)

      if (!registerExists) {
        setStatusMessage('Account provided is not registered to the application.')
        return
      }

      const gameRegisterData = await appClient.state.box.boxGameRegister.value(playerAddress)
      if (!gameRegisterData || !lastRound) return

      if (gameRegisterData.gameId !== 0n) {
        setStatusMessage(`Account commitment to Game ${gameRegisterData.gameId} still active. Game ID must be 0 to unregister.`)
        return
      }

      if (lastRound <= gameRegisterData.expiryRound) {
        setStatusMessage(`This account's registration expires after round ${gameRegisterData.expiryRound}.`)
        return
      }

      setIsProcessing(true)
      await handleMethod('delBoxGameRegisterForOther', { player: playerAddress })

      consoleLogger.info(`Unregistered player: ${playerAddress}`)
      setStatusMessage('Account has been successfully unregistered from the application.')
      setPlayerAddress('')
    } catch (err) {
      consoleLogger.error('Unregister failed:', err)
      setStatusMessage('An error occurred during unregistration.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const cleaned = text
        .toUpperCase()
        .replace(/[^A-Z2-7]/g, '')
        .slice(0, 58)
      setPlayerAddress(cleaned)
    } catch (err) {
      consoleLogger.error('Clipboard read failed:', err)
    }
  }

  const handleReset = () => {
    if (!isProcessing) setPlayerAddress('')
  }

  const handleClose = () => {
    closeModal()
    setStatusMessage(`Click 'Submit' to unregister an account.`)
  }

  return (
    <dialog id="unregister_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-2xl p-5 bg-slate-800 border border-cyan-300 rounded-xl shadow-xl">
        <div className="mb-2 text-center">
          <h2 className="text-3xl font-bold tracking-wide text-cyan-200">UNREGISTER</h2>
          <p className="mt-1 text-base text-white">
            Unregister a third-party account from the application after its registration has expired.
          </p>
        </div>

        <hr className="border-t border-cyan-200 opacity-60 my-3" />

        <div className="mb-3">
          <label className="block mb-2 text-lg font-semibold text-cyan-200">Account to unregister:</label>
          <input
            type="text"
            value={playerAddress}
            onChange={sanitizeAddress}
            className="w-full px-3 py-2 rounded-md border bg-slate-700 text-white border-pink-400 focus:border-lime-400 focus:bg-slate-600 hover:bg-slate-600 focus:outline-none transition-colors"
            maxLength={58}
            placeholder="Enter BASE32 Address"
            disabled={isDisabled}
          />
        </div>

        <div className="flex justify-end gap-2 mb-2">
          <AppBaseBtn onClick={handlePaste} variant="text" textSize="base" disabled={isDisabled}>
            Paste
          </AppBaseBtn>
          <AppBaseBtn onClick={handleReset} variant="text" textSize="base" disabled={isDisabled}>
            Reset
          </AppBaseBtn>
        </div>

        <div className="text-center font-semibold">
          {isProcessing ? (
            <span className="inline-flex items-center gap-1 text-gray-400">
              PROCESSING...
              <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" />
            </span>
          ) : (
            <span className={getStatusColor(statusMessage)}>{statusMessage}</span>
          )}
        </div>

        <div className="modal-action flex justify-center">
          <AppBaseBtn onClick={handleSubmit} disabled={!canSubmit}>
            Submit
          </AppBaseBtn>
          <AppBaseBtn onClick={handleClose} disabled={isDisabled}>
            Close
          </AppBaseBtn>
        </div>
      </form>
    </dialog>
  )
}

export default UnregisterModal
