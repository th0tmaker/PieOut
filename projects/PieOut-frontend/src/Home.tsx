//
// REMOVE APP CREATE AND MINT BUTTONS ON TESTNET, APP SHOULD ALREADY BE CREATED/TROPHY MINTED AND RUNNING
// USE ONE REFESH BUTTON TO MANUALLY REFRESH CURRENT ROUND, GAME STATES, PLAYERS, COMMIT RAND BOX
// USE READONLY METHODS TO GET BOX DATA, NOT ALGOD, MAYBE TIE ALL TO REFERSH
// PLAYERS, LEADERBOARD SHOULD HAVE 'VIEW' TEXT WITH AN ANCHOR/LINK
// PLAYERS VIEW SHOULD OPEN MODAL W/ MAX PLAYERS, ACTIVE PLAYERS, ADDRESSES FOR THAT GAME ID
// LEADERBOARD VIEW SHOULD OPEN ADDRESSES AND THEIR SCORE (OBTAINED THROUGH SUBSCRIBER) IN ORDER
// TOP 3 PLACES SHOULD HAVE MEDALS (GOLD, SILVER, BRONZE), DIFFERENT COLORS AND THEIR WINNING SHARE
// RUN FRONTEND TIMESTAMP OF GAME LIVE/OVER EVENTS, THEN HIGHLIGHT TRIGGER IDS WHEN THESE THESE WILL RESULT IN TRUE

// src/components/Home.tsx
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import AppCalls from './components/AppCalls'
import ConnectWallet from './components/ConnectWallet'
import GameTable from './components/GameTable'
import Transact from './components/Transact'
import { pollOnChainData } from './hooks/CurrentRound'
import { PieOutMethods } from './methods'
import { ellipseAddress } from './utils/ellipseAddress'
import { algorand } from './utils/network/getAlgorandClient'
import { useAppClient } from './contexts/AppClientContext'
import { useBoxCommitRand } from './contexts/BoxCommitRandContext'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)

  const { activeAddress, transactionSigner } = useWallet()
  algorand.setDefaultSigner(transactionSigner)

  const appMethods = activeAddress ? new PieOutMethods(algorand, activeAddress) : undefined

  const { appClient, appCreator, getAppClient } = useAppClient()
  const { boxCommitRand, setBoxCommitRand } = useBoxCommitRand()

  const { currentRound, selfCheckRound, athScore, athAddress } = pollOnChainData(algorand.client.algod, appClient)

  const [boxTrophyData, setBoxTrophyData] = useState<{ assetId: string; ownerAddress: string } | null>(null)

  const [toggleGameOptions, setToggleGameOptions] = useState(false)

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const toggleDemoModal = () => {
    setOpenDemoModal(!openDemoModal)
  }

  const toggleAppCallsModal = () => {
    setAppCallsDemoModal(!appCallsDemoModal)
  }

  const handleGenContract = async () => {
    if (!activeAddress || !appMethods) return

    try {
      await getAppClient()
    } catch (err) {
      consoleLogger.error('Error:', err)
      alert('Failed to create app')
    }
  }

  const handleMintTrophy = async () => {
    if (!activeAddress || !appMethods) return

    if (!appClient?.appId) {
      alert('No app has been created yet!')
      return
    }

    try {
      await appMethods.mintTrophy(appClient?.appId, activeAddress, 'note: boxTPay', 'note: mintPay', 'note: mintTrophy')
      alert('Trophy minted successfully!')

      const boxGameTrophy = await appClient.state.box.boxGameTrophy()

      setBoxTrophyData({
        assetId: boxGameTrophy?.assetId?.toString() ?? 'not-found',
        ownerAddress: boxGameTrophy?.ownerAddress ?? 'not-found',
      })
    } catch (err) {
      consoleLogger.error('Error minting trophy:', err)
      alert('Failed to mint trophy')
    }
  }

  const handleCommit = async () => {
    if (!activeAddress || !appMethods || !appClient?.appId) {
      consoleLogger.info('Debug Info:', {
        activeAddress,
        pieOutMethods: appMethods,
        appId: appClient?.appId,
      })
      alert('Missing active wallet, methods, or app client')
      return
    }

    try {
      await appMethods.getBoxCommitRand(appClient.appId, activeAddress, 'note: boxCPay', 'note: getBoxCommitRand')
      alert('Commit successful!')

      const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
      const entry = boxCommitRand.get(activeAddress)

      if (entry) {
        setBoxCommitRand({
          gameId: entry?.gameId ?? null,
          commitRound: entry?.commitRound ?? null,
          expiryRound: entry?.expiryRound ?? null,
        })
      } else {
        setBoxCommitRand(null)
      }
    } catch (err) {
      consoleLogger.error('Commit failed:', err)
      alert('Commit failed')
    }
  }

  const setCommit = async () => {
    if (!activeAddress || !appMethods || !appClient?.appId) {
      consoleLogger.info('Debug Info:', {
        activeAddress,
        pieOutMethods: appMethods,
        appId: appClient?.appId,
      })
      alert('Missing active wallet, methods, or app client')
      return
    }

    try {
      await appMethods.setBoxCommitRand(appClient.appId, activeAddress, 1n)
      alert('blabla!')

      const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
      const entry = boxCommitRand.get(activeAddress)

      if (entry) {
        setBoxCommitRand({
          gameId: entry?.gameId ?? null,
          commitRound: entry?.commitRound ?? null,
          expiryRound: entry?.expiryRound ?? null,
        })
      } else {
        setBoxCommitRand(null)
      }
    } catch (err) {
      consoleLogger.error('Commit failed:', err)
      alert('Commit failed')
    }
  }

  const handleNewGame = async () => {
    if (!activeAddress || !appMethods || !appClient?.appId) {
      alert('Missing active wallet, methods, or app client')
      return
    }
    try {
      await appMethods.newGame(appClient.appId, activeAddress, 3n, 'note: boxSPay', 'note: boxPPay', 'note: StakePay', 'note: newGame')
      alert('🎮 New game created successfully!')

      // Need to search only by key prefix 's_' in name
      const appBoxes = await appClient.algorand.client.algod.getApplicationBoxes(appClient.appId).do()
      // const entry = boxCommitRand.get(activeAddress)
      consoleLogger.info(JSON.stringify(appBoxes.boxes, null, 2))
    } catch (err) {
      consoleLogger.error('Error creating new game:', err)
      alert('❌ Failed to create new game.')
    }
  }

  return (
    <div className="p-6 min-h-screen bg-slate-800">
      {/* style={{ backgroundColor: '#27292D' }}> */}
      <h1 className="text-2xl text-indigo-200 font-bold mb-4">My Smart Contract DApp</h1>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-purple-500 hover:bg-purple-600 border-2 border-black"
        onClick={toggleWalletModal}
      >
        Wallet
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-blue-500 hover:bg-blue-600 border-2 border-black"
        onClick={handleGenContract}
      >
        Create App
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-green-500 hover:bg-green-600 border-2 border-black"
        onClick={handleMintTrophy}
      >
        Mint Trophy
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-fuchsia-500 hover:bg-fuchsia-600 border-2 border-black"
        onClick={handleCommit}
      >
        Commit
      </button>

      <button
        className=" mr-2 py-2 px-4 rounded text-white font-bold bg-orange-500 hover:bg-orange-600 border-2 border-black"
        onClick={setCommit}
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
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={handleNewGame}>
                🆕 New
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={handleCommit}>
                👥 Join
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={handleCommit}>
                🎰 Play
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2" onClick={handleCommit}>
                🔄 Reset
              </li>
              <li className="hover:bg-gray-100 cursor-pointer px-4 py-2 text-red-600" onClick={handleCommit}>
                🗑️ Delete
              </li>
            </ul>
          </div>
        )}
      </div>

      {appClient && (
        <>
          <p className="text-lg text-green-700 font-bold font-mono">
            💻 APP - Name:{appClient?.appName.toString()}, ID:{appClient?.appId.toString()}, Address:{}
            {ellipseAddress(appClient?.appAddress.toString())}, Creator Address:{}
            {ellipseAddress(appCreator)}
          </p>
          <div className="mt-2 inline-block p-2 border-2 border-indigo-700 rounded-md text-sm font-bold font-mono text-gray-800 shadow-sm">
            <p className="text-base text-center text-indigo-200 font-semibold">RECORD</p>
            <p>🪙 Score: {athScore}</p>
            <p>👤 Holder: {ellipseAddress(athAddress)}</p>
          </div>
        </>
      )}

      {boxTrophyData ? (
        <div className="mt-2 p-2 border-2 border-indigo-700 rounded-md font-bold font-mono text-gray-800 shadow-sm">
          <p className="text-base text-center text-indigo-200">GAME TROPHY</p>
          <p>🏆 Asset ID: {boxTrophyData.assetId ?? 'N/D'}</p>
          <p>👤 Owner: {boxTrophyData.ownerAddress ? ellipseAddress(boxTrophyData.ownerAddress) : 'N/D'}</p>
        </div>
      ) : (
        <div className="mt-2 p-2 border-2 border-indigo-700 rounded-md font-bold font-mono text-indigo-200 shadow-sm">
          <p className="text-base text-center text-indigo-200">GAME TROPHY</p>
          <p>🏆︎ Asset ID: N/D</p>
          <p>♕️ Owner: N/D</p>
        </div>
      )}

      {boxCommitRand ? (
        <div className="mt-2 p-2 border-2 border-indigo-700 rounded-md font-bold font-mono text-gray-800 shadow-sm">
          <p className="text-base text-center text-orange-500">PLAYER STATUS</p>
          {/* <p>🎮 Account: {ellipseAddress(activeAddress ?? '')}</p> */}
          <p>
            Account: <span className="text-cyan-300">{ellipseAddress(activeAddress ?? '')} 🗣</span>
          </p>
          <p>🆔 Game ID: {boxCommitRand.gameId?.toString() ?? 'N/D'}</p>
          <p>🎲 Commit Round❒: {boxCommitRand.commitRound?.toString() ?? 'N/D'}</p>
          <p>⏳ Expiry Round❒: {boxCommitRand.expiryRound?.toString() ?? 'N/D'}</p>
        </div>
      ) : (
        <div className="my-2 p-2 border-2 border-cyan-300 rounded-md font-bold font-mono text-indigo-200 shadow-sm inline-block w-fit">
          {' '}
          <p className="text-lg text-center text-cyan-300 font-bold">
            <span className="mb-2 border-b-2 border-cyan-300 pb-1 inline-block">UN/REGISTER</span>
          </p>
          <div className="flex justify-center gap-4 mt-2 mb-4">
            <button
              className="text-base bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded-full hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={() => consoleLogger.info('Register clicked')}
            >
              Self
            </button>
            <button
              className="text-base bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded-full hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
              onClick={() => consoleLogger.info('Another action')}
            >
              Other
            </button>
          </div>
          <hr className="my-2 border-t-[2px] border-cyan-300" />
          <p className="text-lg text-center text-cyan-300">𓊈USER PROFILE𓊉</p>
          <p>
            Status: <span className="text-red-400">Not Registered</span>
          </p>
          {/* <hr className="my-2 border-t-[2px] border-cyan-300 opacity-80" /> */}
          <p>Account: N/D </p>
          <p>Game ID: N/D</p>
          <p>Commit Round: N/D ❒</p>
          <p>Expiry Round: N/D ❒</p>
          {/* <button
            className="block mx-auto mt-4 mb-2 text-base text-center bg-slate-800 text-pink-300 border-2 border-pink-400 px-3 py-1 rounded-full hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200 transition-colors duration-200 font-semibold"
            onClick={() => consoleLogger.info('bla')}
          >
            Register
          </button> */}
        </div>
      )}

      {currentRound !== null && (
        <div className="mt-4 text-indigo-200 font-bold">
          Current Round: <span className="text-cyan-300">{currentRound} ❒</span>
          {/* <button
            className="ml-4 bg-gray-200 hover:bg-gray-300 text-black text-sm font-bold py-1 px-2 rounded-2xl"
            onClick={selfCheckRound}
          >
            🔄 Refresh
          </button> */}
        </div>
      )}

      <div>
        {/* <h1>Game Table</h1> */}
        {/* Your other UI */}
        <GameTable />
      </div>

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
    </div>
  )
}

export default Home
