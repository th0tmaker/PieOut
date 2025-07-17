// GATE APP CREATE AND MINT BUTTONS TO LOCALNET FLAG ONLY, ON TESTNET, APP SHOULD ALREADY BE CREATED/TROPHY MINTED AND RUNNING
// LEADERBOARD VIEW SHOULD OPEN ADDRESSES AND THEIR SCORE (OBTAINED THROUGH SUBSCRIBER) IN ORDER
// TOP 3 PLACES SHOULD HAVE MEDALS (GOLD, SILVER, BRONZE), DIFFERENT COLORS AND THEIR WINNING SHARE

// src/components/Home.tsx
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useEffect, useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import GameTable from './components/GameTable'
import { pollOnChainData } from './hooks/CurrentRound'
import { ellipseAddress } from './utils/ellipseAddress'
import { algorand } from './utils/network/getAlgorandClient'
// import { useAppSubscriber } from './hooks/useAppSubscriber'
import ProfileModal from './components/ProfileModal'
import { useModal } from './hooks/useModal'
import { useCurrentTimestamp } from './hooks/useCurrentTimestamp'
import HonorsModal from './components/HonorsModal'
import { useAppCtx } from './hooks/useAppCtx'

interface HomeProps {}
const Home: React.FC<HomeProps> = () => {
  const { modal, toggleModal, getModalProps } = useModal()

  const { appClient, appCreator, getAppClient } = useAppCtx()
  const { appMethodHandler } = useAppCtx()
  const currentTimestamp = useCurrentTimestamp()
  const { currentRound } = pollOnChainData(algorand.client.algod, appClient)

  const [toggleGameOptions, setToggleGameOptions] = useState(false)

  // const { startAppSubscriber, stopAppSubscriber } = useAppSubscriber({})

  // useEffect(() => {
  //   consoleLogger.info('blahhh', boxCommitRandData)
  // }, [boxCommitRandData])

  // RUN SUBSCRIBER CODE
  // useEffect(() => {
  //   consoleLogger.info('subscriber is running')
  //   startAppSubscriber()

  //   return () => stopAppSubscriber()
  // }, []) // ✅ Only run once on mount

  return (
    <div className="p-6 min-h-screen bg-slate-800">
      {/* style={{ backgroundColor: '#27292D' }}> */}
      <h1 className="text-2xl text-indigo-200 font-bold mb-4">My Smart Contract DApp</h1>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-purple-500 hover:bg-purple-600 border-2 border-black"
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
        onClick={() => appMethodHandler?.handle('mintTrophy')}
      >
        Mint Trophy
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-fuchsia-500 hover:bg-fuchsia-600 border-2 border-black"
        onClick={() => appMethodHandler?.handle('getBoxCommitRand')}
      >
        Commit
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-orange-500 hover:bg-orange-600 border-2 border-black"
        onClick={() => appMethodHandler?.handle('setBoxCommitRand')}
      >
        Set
      </button>

      <div className="relative inline-block">
        <button
          className="mr-2 py-2 px-4 rounded text-white font-bold bg-red-500 hover:bg-red-600 border-2 border-black"
          onClick={() => setToggleGameOptions((prev) => !prev)}
        >
          Game
        </button>

        {toggleGameOptions && (
          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg">
            <ul className="text-sm text-gray-700">
              <li
                className="hover:bg-gray-100 cursor-pointer px-4 py-2"
                onClick={() => appMethodHandler?.handle('newGame', { maxPlayers: 3n })}
              >
                🆕 New
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={() => appMethodHandler?.handle('joinGame')}>
                👥 Join
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={() => appMethodHandler?.handle('playGame')}>
                🎰 Play
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={() => appMethodHandler?.handle('resetGame')}>
                🔄 Reset
              </li>
              <li
                className="hover:bg-gray-100 cursor-pointer px-4 py-2 text-red-600"
                onClick={() => appMethodHandler?.handle('deleteGame')}
              >
                🗑️ Delete
              </li>
            </ul>
          </div>
        )}
      </div>
      {/* Buttons */}
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
          onClick={() => toggleModal('leaderboard')}
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
            App Creator: <span className="text-cyan-300 ml-1">{ellipseAddress(appCreator ?? '')}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(appCreator ?? '')
                consoleLogger.info('Address copied to clipboard:', appCreator)
              }}
              title="Copy full address"
              className="text-pink-400 hover:text-lime-400 ml-2 text-lg"
            >
              🗐
            </button>
          </div>
          <div>
            Current Round: <span className="text-cyan-300">{currentRound} ❒</span>
          </div>
          <div>
            Current Local Time: <span className="text-cyan-300">{new Date(currentTimestamp * 1000).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
      <div>
        {/* <h1>Game Table</h1> */}
        {/* Your other UI */}
        <GameTable />
      </div>
      <ProfileModal {...getModalProps('profile')} />
      <HonorsModal {...getModalProps('honors')} />
      <ConnectWallet {...getModalProps('wallet')} />

      {/* <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} /> */}
      {/* <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} /> */}
    </div>
  )
}

export default Home
