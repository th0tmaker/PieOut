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
import { useModal } from './hooks/useModal'
import { useCurrentTimestamp } from './hooks/useCurrentTimestamp'
import HonorsModal from './components/HonorsModal'
import { useAppCtx } from './hooks/useAppCtx'
import { useMethodHandler } from './hooks/useMethodHandler'
import { CopyAddressBtn } from './components/CopyAddressBtn'
import { useWallet } from '@txnlab/use-wallet-react'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { getAppClient, appClient, appCreator } = useAppCtx()
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
      <h1 className="text-2xl text-indigo-200 font-bold mb-4">My Smart Contract DApp</h1>

      {/* Wallet button always visible */}
      <button
        className="mr-2 py-2 px-4 rounded text-white font-bold bg-purple-500 hover:bg-purple-600 border-2 border-black"
        onClick={() => toggleModal('wallet')}
      >
        Wallet
      </button>

      <ConnectWallet {...getModalProps('wallet')} />

      {/* Render everything else ONLY if activeAddress exists */}
      {activeAddress && (
        <>
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

          <button
            className=" mr-2 py-2 px-4 rounded text-white font-bold bg-fuchsia-500 hover:bg-fuchsia-600 border-2 border-black"
            onClick={() => handleMethod('getBoxGameRegister')}
            disabled={isLoadingMethod}
          >
            Commit
          </button>

          <button
            className=" mr-2 py-2 px-4 rounded text-white font-bold bg-orange-500 hover:bg-orange-600 border-2 border-black"
            onClick={() => handleMethod('setGameCommit')}
            disabled={isLoadingMethod}
          >
            Set
          </button>

          {/* Your game button and dropdown */}
          <div className="relative inline-block">
            <button
              className="mr-2 py-2 px-4 rounded text-white font-bold bg-red-500 hover:bg-red-600 border-2 border-black"
              onClick={() => setToggleGameOptions((prev) => !prev)}
            >
              Game
            </button>
            {toggleGameOptions && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg">
                {/* ... list items here ... */}
              </div>
            )}
          </div>

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
              onClick={() => handleMethod('newGame', { maxPlayers: 3n })}
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
              <div className="flex items-center">
                App Creator: <span className="text-cyan-300 ml-1">{ellipseAddress(appCreator!)}</span>
                <CopyAddressBtn value={appCreator!} title="Copy full address" />
              </div>
              <div>
                Last Block Round: <span className="text-cyan-300">{lastRound} ❒</span>
              </div>
              <div>
                Current Local Time: <span className="text-cyan-300">{new Date(currentTimestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          )}

          <div>
            <GameTable />
          </div>

          <ProfileModal {...getModalProps('profile')} />
          <HonorsModal {...getModalProps('honors')} />
          <ConnectWallet {...getModalProps('wallet')} />
        </>
      )}
    </div>
  )
}

export default Home
