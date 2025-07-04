import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'
import { BoxCommitRand } from './contexts/BoxCommitRandContext'

export type MethodType =
  | 'deployApp'
  | 'generateApp'
  | 'terminateApp'
  | 'readGenUnix'
  | 'readGameState'
  | 'readGamePlayers'
  | 'readBoxCommitRand'
  | 'mintTrophy'
  | 'claimTrophy'
  | 'newGame'
  | 'joinGame'
  | 'playGame'
  | 'resetGame'
  | 'deleteGame'
  | 'getBoxCommitRand'
  | 'setBoxCommitRand'
  | 'delBoxCommitRandForSelf'
  | 'delBoxCommitRandForOther'
  | 'triggerGameProg'

export interface MethodParams {
  activeAddress: string | null
  appMethods: PieoutMethods
  appClient: PieoutClient
  getAppClient?: () => Promise<void>
  setBoxTrophyData?: (data: { assetId: string; ownerAddress: string }) => void
  setBoxCommitRandData?: (entry: BoxCommitRand | null) => void
  gameId?: bigint
}

export async function handleGenerateApp({ getAppClient }: MethodParams) {
  try {
    if (!getAppClient) throw new Error('Unable to getAppClient!')
    await getAppClient()
  } catch (e) {
    consoleLogger.error("Error calling 'generateApp':", e)
    alert("Error calling 'generateApp'")
  }
}

export async function handleReadGenUnix({ appClient, appMethods, activeAddress }: MethodParams) {
  try {
    if (!activeAddress) {
      alert('Active address is required!')
      return
    }
    const result = await appMethods.readGenUnix(appClient.appId, activeAddress)
    alert(`Smart Contract genesis unix timestamp: ${result}`)
  } catch (e) {
    consoleLogger.error("Error calling 'readGenUnix':", e)
    alert("Error calling 'readGenUnix'")
  }
}

export async function handleMintTrophy({ appClient, appMethods, activeAddress, setBoxTrophyData }: MethodParams) {
  try {
    if (!activeAddress) {
      alert('Active address is required!')
      return
    }
    await appMethods.mintTrophy(appClient.appId, activeAddress)
    alert('Trophy minted!')

    if (setBoxTrophyData) {
      const boxGameTrophy = await appClient.state.box.boxGameTrophy()
      setBoxTrophyData({
        assetId: boxGameTrophy?.assetId?.toString() ?? 'not-found',
        ownerAddress: boxGameTrophy?.ownerAddress ?? 'not-found',
      })
    }
  } catch (e) {
    consoleLogger.error("Error calling 'mintTrophy':", e)
    alert("Error calling 'mintTrophy'")
  }
}

export async function handleGetBoxCommitRand({ appClient, appMethods, activeAddress, setBoxCommitRandData }: MethodParams) {
  try {
    if (!activeAddress) {
      alert('Active address is required!')
      return
    }
    await appMethods.getBoxCommitRand(appClient.appId, activeAddress)
    alert('Register commit successful!')

    if (setBoxCommitRandData) {
      const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
      const entry = boxCommitRand.get(activeAddress)
      setBoxCommitRandData(entry ?? null)
    }
  } catch (e) {
    consoleLogger.error("Error calling 'getBoxCommitRand':", e)
    alert("Error calling 'getBoxCommitRand'")
  }
}

export async function handleSetBoxCommitRand({ appClient, appMethods, activeAddress, gameId, setBoxCommitRandData }: MethodParams) {
  try {
    if (!activeAddress) {
      alert('Active address is required!')
      return
    }

    if (gameId === undefined || gameId === null) {
      alert('gameId required!')
      return
    }

    await appMethods.setBoxCommitRand(appClient.appId, activeAddress, gameId)
    alert('Set commit successful!')

    if (setBoxCommitRandData) {
      const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
      const entry = boxCommitRand.get(activeAddress)
      setBoxCommitRandData(entry ?? null)
    }
  } catch (e) {
    consoleLogger.error("Error calling 'setBoxCommitRand':", e)
    alert("Error calling 'setBoxCommitRand'")
  }
}
