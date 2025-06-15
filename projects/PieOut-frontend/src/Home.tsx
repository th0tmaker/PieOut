// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import AppCalls from './components/AppCalls'
import ConnectWallet from './components/ConnectWallet'
import Transact from './components/Transact'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const toggleDemoModal = () => {
    setOpenDemoModal(!openDemoModal)
  }

  const toggleAppCallsModal = () => {
    setAppCallsDemoModal(!appCallsDemoModal)
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: '#fce5cd' }}>
      <h1 className="text-4xl text-gray-800 font-bold">PieOut Smart Contract Game Test Page— by Ogrpn</h1>
      <div className="flex items-center space-x-2">
        <span className="text-3xl text-gray-800 font-bold">Wallet —</span>
        <button
          data-test-id="connect-wallet"
          onClick={toggleWalletModal}
          className="
            relative
            px-2 py-1
            text-2xl font-bold
            text-gray-800
            border-4 border-gray-700
            rounded-md
            hover:border-teal-600
            hover:text-teal-600
            transition-colors
            transform
            skew-x-[-20deg]
            shadow-lg
            translate-y-0.5
            hover:shadow-2xl
          "
        >
          connect
        </button>
      </div>

      {activeAddress && (
        <div className="flex items-center space-x-2">
          <span className="text-3xl text-gray-800 font-bold">Payment —</span>
          <button
            data-test-id="transactions-demo"
            onClick={toggleDemoModal}
            className="
            relative
            px-2 py-1
            text-2xl font-bold
            text-gray-800
            border-4 border-gray-700
            rounded-md
            hover:border-teal-600
            hover:text-teal-600
            transition-colors
            transform
            skew-x-[-20deg]
            shadow-lg
            translate-y-0.5
            hover:shadow-2xl
          "
          >
            make
          </button>
        </div>
      )}

      {activeAddress && (
        <div className="flex items-center space-x-2">
          <span className="text-3xl text-gray-800 font-bold">App Call —</span>
          <button
            data-test-id="appcalls-demo"
            onClick={toggleAppCallsModal}
            className="
            relative
            px-2 py-1
            text-2xl font-bold
            text-gray-800
            border-4 border-gray-700
            rounded-md
            hover:border-teal-600
            hover:text-teal-600
            transition-colors
            transform
            skew-x-[-20deg]
            shadow-lg
            translate-y-0.5
            hover:shadow-2xl
          "
          >
            make
          </button>
        </div>
      )}

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
    </div>
  )
}

export default Home
