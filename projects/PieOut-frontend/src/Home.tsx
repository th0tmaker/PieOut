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
import { PieoutClient } from './contracts/Pieout'
import { pollOnChainData } from './hooks/CurrentRound'
import { PieOutMethods } from './methods'
import { ellipseAddress } from './utils/ellipseAddress'
import { algorand } from './utils/network/getAlgorandClient'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)

  const { activeAddress, transactionSigner } = useWallet()
  algorand.setDefaultSigner(transactionSigner)

  const appMethods = activeAddress ? new PieOutMethods(algorand, activeAddress) : undefined

  const [appClient, setAppClient] = useState<PieoutClient | null>(null)
  const [appCreator, setAppCreator] = useState<string | null>(null)

  const { currentRound, selfCheckRound, athScore, athAddress } = pollOnChainData(algorand.client.algod, appClient)

  const [boxTrophyData, setBoxTrophyData] = useState<{ assetId: string; ownerAddress: string } | null>(null)
  const [boxCommitRandData, setBoxCommitRandData] = useState<{
    gameId: string
    commitRound: string
    expiryRound: string
  } | null>(null)

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
      const appClient = await appMethods.genContract(activeAddress, 'note: create app', 'note: fund mbr')
      setAppClient(appClient)

      const appInfo = await appClient.algorand.app.getById(appClient.appId)
      setAppCreator(appInfo.creator.toString())

      consoleLogger.info('App ID:', appClient.appId)
      alert(`App created! ID: ${appClient.appId}`)
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
        setBoxCommitRandData({
          gameId: entry.gameId.toString() ?? 'not-found',
          commitRound: entry.commitRound.toString() ?? 'not-found',
          expiryRound: entry.expiryRound.toString() ?? 'not-found',
        })
      } else {
        setBoxCommitRandData(null)
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

  // const handleBoxSetCommitRand = async () => {
  //   if (!activeAddress || !appMethods || !appClient?.appId) {
  //     alert('Missing active wallet, methods, or app client')
  //     return
  //   }
  //   try {
  //     await appMethods.setBoxCommitRand(appClient.appId, activeAddress, )
  //     await appMethods.newGame(appClient.appId, activeAddress, 3n, 'note: boxSPay', 'note: boxPPay', 'note: StakePay', 'note: newGame')
  //     alert('🎮 New game created successfully!')

  //     // Need to search only by key prefix 's_' in name
  //     const appBoxes = await appClient.algorand.client.algod.getApplicationBoxes(appClient.appId).do()
  //     // const entry = boxCommitRand.get(activeAddress)
  //     consoleLogger.info(JSON.stringify(appBoxes.boxes, null, 2))
  //   } catch (err) {
  //     consoleLogger.error('Error creating new game:', err)
  //     alert('❌ Failed to create new game.')
  //   }
  // }

  return (
    <div className="p-4" style={{ backgroundColor: '#FFFFFF' }}>
      <h1 className="text-2xl font-bold mb-4">My Smart Contract DApp</h1>

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
        // onClick={handleCommit}
      >
        Lock
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

      {currentRound !== null && (
        <div className="mt-4 text-lg text-blue-700 font-bold font-mono">
          🧊 CURRENT ROUND: {currentRound}
          <button
            className="ml-4 bg-gray-200 hover:bg-gray-300 text-black text-sm font-bold py-1 px-2 rounded-2xl"
            onClick={selfCheckRound}
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {appClient && (
        <>
          <p className="text-lg text-green-700 font-bold font-mono">
            💻 APP - Name:{appClient?.appName.toString()}, ID:{appClient?.appId.toString()}, Address:{}
            {ellipseAddress(appClient?.appAddress.toString())}, Creator Address:{}
            {ellipseAddress(appCreator)}
          </p>
          <div className="mt-2 inline-block p-2 border-2 border-indigo-700 rounded-md text-sm font-bold font-mono text-gray-800 shadow-sm">
            <p className="text-base text-center text-indigo-700 font-semibold">RECORD</p>
            <p>🪙 Score: {athScore}</p>
            <p>👤 Holder: {ellipseAddress(athAddress)}</p>
          </div>
        </>
      )}

      {boxTrophyData && (
        <div className="mt-2 inline-block p-2 border-2 border-indigo-700 rounded-md text-sm font-bold font-mono text-gray-800 shadow-sm">
          <p className="text-base text-center text-indigo-700 font-semibold">GAME TROPHY</p>
          <p>🏆 Asset ID: {boxTrophyData.assetId}</p>
          <p>👤 Owner: {ellipseAddress(boxTrophyData.ownerAddress)}</p>
        </div>
      )}

      {boxCommitRandData ? (
        <div className="mt-2 inline-block p-2 border-2 border-indigo-700 rounded-md text-sm font-bold font-mono text-gray-800 shadow-sm">
          <p className="text-base text-center text-indigo-700 font-semibold">PLAYER STATUS</p>
          <p>🎮 Account: {ellipseAddress(activeAddress ?? '')}</p>
          <p>🆔 Game ID: {boxCommitRandData.gameId}</p>
          <p>🎲 Commit Round: {boxCommitRandData.commitRound}</p>
          <p>⏳ Expiry Round: {boxCommitRandData.expiryRound}</p>
        </div>
      ) : (
        <p className="mt-4 text-sm font-mono text-red-500">Commit data not found</p>
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
