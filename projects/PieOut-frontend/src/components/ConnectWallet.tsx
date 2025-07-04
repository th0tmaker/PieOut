import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'
import { useEffect, useState } from 'react'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { ModalInterface } from '../interfaces/modal'

interface ConnectWalletInterface extends ModalInterface {}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeWalletAccounts, activeAddress } = useWallet()
  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD
  const [userInputAddr, setUserInputAddr] = useState<string>('')

  // Ensure the wallet is disconnected on page refresh or close
  useEffect(() => {
    if (!openModal) {
      localStorage.removeItem('txnlab-use-wallet') // Disconnect the active wallet account when the modal closes
    }
  }, [openModal])

  const changeAccByIndex = async () => {
    const activeWallet = wallets.find((wallet) => wallet.isActive)

    if (!activeWallet || !activeWalletAccounts || !activeAddress) return

    try {
      const currentAccIndex = activeWalletAccounts.findIndex((acc) => acc.address === activeAddress)
      const nextAccIndex = (currentAccIndex + 1) % activeWalletAccounts.length
      const nextAccount = activeWalletAccounts[nextAccIndex]
      activeWallet.setActiveAccount(nextAccount.address)
      consoleLogger.info(`Switched to account: ${nextAccount.address}`)
    } catch (err) {
      consoleLogger.error('Error changing to next account', err)
    }
  }

  const changeAccByAddr = async () => {
    const activeWallet = wallets.find((wallet) => wallet.isActive)
    if (!activeWallet || !activeWalletAccounts) return

    try {
      const matchedAccount = activeWalletAccounts.find((acc) => acc.address === userInputAddr || acc.name === userInputAddr)
      if (matchedAccount) {
        activeWallet.setActiveAccount(matchedAccount.address)
        consoleLogger.info(`Switched to account: ${matchedAccount.address}`)
      } else {
        consoleLogger.info('Account not found with the provided name or address')
      }
    } catch (error) {
      consoleLogger.info('Failed changing account by name/address:', error)
    }
  }
  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-2xl text-center">
          {wallets?.some((wallet) => isKmd(wallet)) ? 'Select KMD Wallet Account' : 'Select Wallet Provider'}
        </h3>

        <div className="grid m-2 pt-5">
          {activeAddress && (
            <>
              <Account />
              <div className="divider" />
            </>
          )}

          {!activeAddress &&
            wallets?.map((wallet) => (
              <button
                data-test-id={`${wallet.id}-connect`}
                className="btn border-teal-800 border-1 m-2"
                key={`provider-${wallet.id}`}
                onClick={() => wallet.connect()}
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

        {/* Next Account button */}
        {activeAddress && wallets && (
          <div className="grid grid-cols-1 gap-4 w-full mt-4">
            {/* Next Account Index Button */}
            <button
              className="btn justify-center rounded-md bg-blue-300 hover:text-white hover:bg-blue-800 border-black border-2 text-[16px]"
              onClick={(e) => {
                e.preventDefault()
                changeAccByIndex()
              }}
            >
              Next Account Index
            </button>

            {/* Change Account By Name/Address */}
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

        {/* Modal Action Buttons */}
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
