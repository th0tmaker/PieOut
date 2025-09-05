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
import { useMethodLoadingCtx } from '../hooks/useMethodLoadingCtx'

// Create a modal component that displays the unregister modal component
const UnregisterModal = ({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { activeAddress } = useWallet()
  const { lastRound } = useLastRound(algorand.client.algod)
  const { appClient, appMethods } = useAppCtx()
  const { handle: handleMethod } = useMethodHandler()
  const { isMethodLoading } = useMethodLoadingCtx()

  // States
  const [userStatusMsg, setUserStatusMsg] = useState(`Click 'Submit' to unregister an account.`)
  const [isProcessing, setIsProcessing] = useState(false)

  const [playerAddress, setPlayerAddress] = useState('')
  const sanitizeAddress = useAddressSanitizer(setPlayerAddress)

  // Boolean conditions
  const isPlayerAddressValid = playerAddress.trim().length === 58 && playerAddress !== activeAddress
  const isDisabled = isProcessing || isMethodLoading
  const canSubmit = !isDisabled && isPlayerAddressValid && activeAddress && appClient && appMethods

  // Define a method that sets the text color if the msg param includes certain key words
  const setMsgColor = (msg: string) => {
    // If msg param inclues 'Submit', return white text
    if (msg.includes('Submit')) return 'text-white'

    // If msg param inclues, 'sucessfully', return green text
    if (msg.includes('successfully')) return 'text-green-400'

    // Else, return red text
    return 'text-red-400'
  }

  // Handlers
  // Define a method that handles logic on submit button click
  const handleSubmit = async () => {
    // If no `activeAddress` or `appClient` or `appMethods or `playerAddress`, return early
    if (!activeAddress || !appClient || !appMethods || !playerAddress.trim()) return

    // If player address is not valid, set user status message and return early
    if (!isPlayerAddressValid) {
      setUserStatusMsg('Invalid address. Please ensure address has correct format, length, and is not your own.')
      return
    }

    // Try block
    try {
      // Check if game regiser box for `playerAddress` exists
      const registerExists = await appMethods.doesBoxGameRegisterExist(appClient.appId, activeAddress, playerAddress)

      // If game register box for `playerAddress` does not exist, user is not registered, set user status message and return early
      if (!registerExists) {
        setUserStatusMsg('Account provided is not registered to the application.')
        return
      }

      // Game register box data presumably exists, call the API to get its value from the blockchain
      const gameRegisterData = await appClient.state.box.boxGameRegister.value(playerAddress)

      // If game register box data is not fetched for some reason, return early
      if (!gameRegisterData || !lastRound) return

      // If game register box `hostingGame` property equals true, the player can not be unregistered, set user status message and return early
      if (gameRegisterData.hostingGame) {
        setUserStatusMsg(`Can not unregister an account that's hosting a game.`)
        return
      }

      // If game register box `gameId` property does NOT equal 0, the player is currently in-game, set user status message and return early
      if (gameRegisterData.gameId !== 0n) {
        setUserStatusMsg(`Account commitment to Game ${gameRegisterData.gameId} still active. Game ID must be 0 to unregister.`)
        return
      }

      // If `lastRound` on blockchain is lesser or equal than the game register box `expiryRound`, set user status message and return early
      if (lastRound <= gameRegisterData.expiryRound) {
        setUserStatusMsg(`This account's registration expires after round ${gameRegisterData.expiryRound}.`)
        return
      }

      // Set component local state is processing flag to true
      setIsProcessing(true)

      // Use methodHandler to call and await the smart cotnract `delBoxGameRegisterForOther` method
      await handleMethod('delBoxGameRegisterForOther', { player: playerAddress })

      // Log
      // consoleLogger.info(`Unregistered player: ${playerAddress}`)

      // Set new user status message to notify of success
      setUserStatusMsg('Account has been successfully unregistered from the application.')

      // Set the player address state to an empty string
      setPlayerAddress('')

      // Catch error
    } catch (err) {
      // Log
      consoleLogger.error('Unregister failed:', err)

      // Set new user status message to notify of failure
      setUserStatusMsg('An error occurred during unregistration.')
    } finally {
      // Finally, set component local state is processing flag to false
      setIsProcessing(false)
    }
  }

  // Define a helper method that is able to paste the value from the clipboard into the player address input field
  const handlePaste = async () => {
    // Try block
    try {
      // Read the text from the navigator clipboard
      const text = await navigator.clipboard.readText()

      // Clean the text; must be upper case, must not contain undesirable chars, must be exact length of 58
      const cleanText = text
        .toUpperCase()
        .replace(/[^A-Z2-7]/g, '')
        .slice(0, 58)

      // Set the player address state to be the clean text
      setPlayerAddress(cleanText)
      // Catch error
    } catch (err) {
      // Log
      consoleLogger.error('Clipboard read failed:', err)
    }
  }

  // Define a helper method that is able to reset the value of the player address input field
  const handleReset = () => {
    // If local state processing flag is flase, set the player address input value to empty string
    if (!isProcessing) setPlayerAddress('')
  }

  // Define a helper method that is able to close the modal
  const handleClose = () => {
    // Call `closeModal` method
    closeModal()

    // Set new user status message to display the default modal message
    setUserStatusMsg(`Click 'Submit' to unregister an account.`)
  }

  // Return JSX
  return (
    <dialog id="unregister_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-2xl p-5 bg-slate-800 border border-cyan-300 rounded-xl shadow-xl">
        {/* Title */}
        <div className="mb-2 text-center">
          <h2 className="text-3xl font-bold tracking-wide text-cyan-200">UNREGISTER</h2>
          <p className="mt-1 text-base text-white">
            Unregister a third-party account from the application after its registration has expired.
          </p>
        </div>

        <hr className="border-t border-cyan-200 opacity-60 my-3" />
        {/* Player Address Input */}
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
        {/* Paste & Reset Buttons */}
        <div className="flex justify-end gap-2 mb-2">
          <AppBaseBtn onClick={handlePaste} variant="text" textSize="base" disabled={isDisabled}>
            Paste
          </AppBaseBtn>
          <AppBaseBtn onClick={handleReset} variant="text" textSize="base" disabled={isDisabled}>
            Reset
          </AppBaseBtn>
        </div>

        {/* User Status Message */}
        <div className="text-center font-semibold">
          {isProcessing ? (
            <span className="inline-flex items-center gap-1 text-gray-400">
              PROCESSING...
              <span className="w-3 h-3 border-2 border-t-transparent border-gray-400 rounded-full animate-spin" />
            </span>
          ) : (
            <span className={setMsgColor(userStatusMsg)}>{userStatusMsg}</span>
          )}
        </div>

        {/* Submit & Close Buttons */}
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
