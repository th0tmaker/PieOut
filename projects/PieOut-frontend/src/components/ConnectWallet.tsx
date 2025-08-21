import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'
import { useEffect, useState } from 'react'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { ModalInterface } from '../interfaces/modal'

const ConnectWallet = ({ openModal, closeModal }: ModalInterface) => {
  // Hooks
  const { wallets, activeWalletAccounts, activeAddress } = useWallet()
  // States
  const [userInputAddr, setUserInputAddr] = useState<string>('')
  // Check if wallet provider ID is KMD
  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  // Disconnect active wallet when modal closes or page refreshes
  useEffect(() => {
    if (!openModal) localStorage.removeItem('txnlab-use-wallet')
  }, [openModal])

  // Create a method that changes to the next account inside the wallet based on the index position
  const changeAccByIndex = async () => {
    // Find the currently active wallet
    const activeWallet = wallets.find((wallet) => wallet.isActive)

    // If key requirements are missing, return early
    if (!activeWallet || !activeWalletAccounts || !activeAddress) return

    // Try Block
    try {
      // Search `activeWalletAccounts` and find the index position of current account, which should be equal to `activeAddress`
      const currentAccIndex = activeWalletAccounts.findIndex((acc) => acc.address === activeAddress)

      // Determine the next account index in the wallet, loop back when reaching the end
      const nextAccIndex = (currentAccIndex + 1) % activeWalletAccounts.length

      // Pass the next account index to the `activeWalletAccounts` to get the next account
      const nextAccount = activeWalletAccounts[nextAccIndex]

      // Update wallet state to next account
      activeWallet.setActiveAccount(nextAccount.address)

      // Log
      consoleLogger.info(`Switched to account: ${nextAccount.address}`)
      // Catch Error
    } catch (err) {
      // Log
      consoleLogger.error('Error changing to next account', err)
    }
  }

  // Create a method that changes to a specific account in the wallet based on user-provided input
  const changeAccByAddr = async () => {
    // Find the currently active wallet
    const activeWallet = wallets.find((wallet) => wallet.isActive)

    // If key requirements are missing, return early
    if (!activeWallet || !activeWalletAccounts) return

    // Try Block
    try {
      // Search `activeWalletAccounts` for an account that matches the user input by address or name
      const matchedAccount = activeWalletAccounts.find((acc) => acc.address === userInputAddr || acc.name === userInputAddr)

      // If a matching account is found
      if (matchedAccount) {
        // Update wallet state to the matched account
        activeWallet.setActiveAccount(matchedAccount.address)

        // Log the account switch
        consoleLogger.info(`Switched to account: ${matchedAccount.address}`)
      } else {
        // Log if no matching account is found
        consoleLogger.info('Account not found with the provided name or address')
      }

      // Catch Error
    } catch (error) {
      // Log any failure in switching accounts
      consoleLogger.info('Failed changing account by name/address:', error)
    }
  }

  // Return JSX
  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        {/* Modal Header: displays title based on wallet type */}
        <h3 className="font-bold text-2xl text-center">
          {wallets?.some((wallet) => isKmd(wallet)) ? 'Select KMD Wallet Account' : 'Select Wallet Provider'}
        </h3>

        {/* Wallet Selection Section */}
        <div className="grid m-2 pt-5">
          {/* Active Account Display */}
          {activeAddress && (
            <>
              <Account /> {/* Show currently active account details */}
              <div className="divider" /> {/* Visual separator */}
            </>
          )}

          {/* Wallet Provider Buttons */}
          {!activeAddress &&
            wallets?.map((wallet) => (
              <button
                data-test-id={`${wallet.id}-connect`}
                className="btn border-teal-800 border-1 m-2"
                key={`provider-${wallet.id}`}
                onClick={() => wallet.connect()} // Connect wallet when clicked
              >
                {!isKmd(wallet) && (
                  <img
                    alt={`wallet_icon_${wallet.id}`}
                    src={wallet.metadata.icon}
                    style={{ objectFit: 'contain', width: '30px', height: 'auto' }}
                  />
                )}
                <span>{isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}</span>
              </button>
            ))}
        </div>

        {/* Account Management Section */}
        {activeAddress && wallets && (
          <div className="grid grid-cols-1 gap-4 w-full mt-4">
            {/* Switch to Next Account Button */}
            <button
              className="btn justify-center rounded-md bg-blue-300 hover:text-white hover:bg-blue-800 border-black border-2 text-[16px]"
              onClick={(e) => {
                e.preventDefault()
                changeAccByIndex()
              }}
            >
              Next Account Index
            </button>

            {/* Change Account By Name/Address Form */}
            <div className="flex flex-col gap-2 mt-2">
              <input
                type="text"
                className="text-center input input-bordered w-full"
                placeholder="Address"
                value={userInputAddr}
                onChange={(e) => setUserInputAddr(e.target.value)}
              />
              <button
                className="btn justify-center rounded-md bg-blue-300 hover:text-white hover:bg-blue-800 border-black border-2 text-[16px]"
                onClick={(e) => {
                  e.preventDefault()
                  changeAccByAddr()
                }}
              >
                Set Account by Address
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Buttons Section */}
        <div className="modal-action">
          <button data-test-id="close-wallet-modal" className="btn" onClick={() => closeModal()}>
            Close
          </button>

          {activeAddress && (
            <button
              className="btn btn-warning"
              data-test-id="logout"
              onClick={async () => {
                const activeWallet = wallets.find((w) => w.isActive)
                if (activeWallet) {
                  await activeWallet.disconnect()
                } else {
                  localStorage.removeItem('@txnlab/use-wallet:v3')
                  window.location.reload()
                }
              }}
            >
              Logout
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}

export default ConnectWallet
