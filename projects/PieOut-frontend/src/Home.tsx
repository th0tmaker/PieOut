// GATE APP CREATE AND MINT BUTTONS TO LOCALNET FLAG ONLY, ON TESTNET, APP SHOULD ALREADY BE CREATED/TROPHY MINTED AND RUNNING
// LEADERBOARD VIEW SHOULD OPEN ADDRESSES AND THEIR SCORE (OBTAINED THROUGH SUBSCRIBER) IN ORDER
// TOP 3 PLACES SHOULD HAVE MEDALS (GOLD, SILVER, BRONZE), DIFFERENT COLORS AND THEIR WINNING SHARE

// src/components/Home.tsx
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import GameTable from './components/GameTable'
import { useLastRound } from './hooks/useLastRound'
import { ellipseAddress } from './utils/ellipseAddress'
import { algorand } from './utils/network/getAlgorandClient'
// import { useAppSubscriber } from './hooks/useAppSubscriber'
import ProfileModal from './components/ProfileModal'
import GameModal from './components/GameModal'
import { useModal } from './hooks/useModal'
import { useCurrentTimestamp } from './hooks/useCurrentTimestamp'
import HonorsModal from './components/HonorsModal'
import { useAppCtx } from './hooks/useAppCtx'
import { useMethodHandler } from './hooks/useMethodHandler'
import { CopyAddressBtn } from './components/CopyAddressBtn'
import { useWallet } from '@txnlab/use-wallet-react'
import { useGameDataCtx } from './hooks/useGameDataCtx'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { getAppClient, appClient, appCreator } = useAppCtx()
  const { gameRegisterData } = useGameDataCtx()
  const currentTimestamp = useCurrentTimestamp()
  const { lastRound } = useLastRound(algorand.client.algod)
  const [toggleGameOptions, setToggleGameOptions] = useState(false)
  const { handle: handleMethod, isLoading: isLoadingMethod } = useMethodHandler()

  // const { startAppSubscriber, stopAppSubscriber } = useAppSubscriber({})

  // RUN SUBSCRIBER CODE
  // useEffect(() => {
  //   consoleLogger.info('subscriber is running')
  //   startAppSubscriber()

  //   return () => stopAppSubscriber()
  // }, []) // ✅ Only run once on mount

  return (
    <div className="p-6 min-h-screen bg-slate-800">
      <h1 className="text-2xl text-indigo-200 font-bold mb-4">Welcome</h1>

      {/* Wallet button always visible */}
      <button
        className="mr-2 py-2 px-4 rounded text-white font-bold bg-purple-500 hover:bg-purple-600 border-2 border-black"
        onClick={() => toggleModal('wallet')}
      >
        Wallet
      </button>
      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-blue-500 hover:bg-blue-600 border-2 border-black"
        onClick={getAppClient}
      >
        Create App
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-green-500 hover:bg-green-600 border-2 border-black"
        onClick={() => handleMethod('mintTrophy')}
        disabled={isLoadingMethod}
      >
        Mint Trophy
      </button>
      <ConnectWallet {...getModalProps('wallet')} />

      {/* Additional buttons */}
      <div className="flex flex-row items-center gap-2">
        <button
          className="mt-4 text-base text-center bg-slate-800 text-yellow-300 border-2 border-yellow-400 px-4 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={() => toggleModal('wallet')}
        >
          Wallet
        </button>
        <button
          className="mt-4 text-base text-center bg-slate-800 text-yellow-300 border-2 border-yellow-400 px-4 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={() => toggleModal('profile')}
        >
          Profile
        </button>
        <button
          className="mt-4 text-base text-center bg-slate-800 text-yellow-300 border-2 border-yellow-400 px-4 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={() => toggleModal('game')}
        >
          Game
        </button>
        <button
          className="mt-4 text-base text-center bg-slate-800 text-yellow-300 border-2 border-yellow-400 px-4 py-1 rounded hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
          onClick={() => toggleModal('honors')}
        >
          Honors
        </button>
      </div>

      {appClient !== null && (
        <div className="text-indigo-200 font-bold my-4">
          <div>
            App Name: <span className="text-cyan-300">{appClient?.appName.toString()}</span>
          </div>
          <div>
            App ID: <span className="text-cyan-300">{appClient?.appId.toString()}</span>
          </div>
          <div>
            {appClient?.appAddress && (
              <>
                App Address: <span className="text-cyan-300">{ellipseAddress(appClient.appAddress.toString())}</span>
                <CopyAddressBtn value={appClient.appAddress.toString()} title="Copy full address" />
              </>
            )}
          </div>
          <div className="flex items-center">
            App Creator: <span className="text-cyan-300 ml-1">{ellipseAddress(appCreator!)}</span>
            <CopyAddressBtn value={appCreator!} title="Copy full address" />
          </div>
          <div>
            Last Block Round: <span className="text-cyan-300">{lastRound} ❒</span>
          </div>
          <div>
            Current Local Time: <span className="text-cyan-300">{new Date(currentTimestamp * 1000).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* <div>{gameRegisterData && <GameTable />}</div> */}
      <GameTable />
      <ProfileModal {...getModalProps('profile')} />
      <GameModal {...getModalProps('game')} />
      <HonorsModal {...getModalProps('honors')} />
      <ConnectWallet {...getModalProps('wallet')} />
    </div>
  )
}

export default Home
