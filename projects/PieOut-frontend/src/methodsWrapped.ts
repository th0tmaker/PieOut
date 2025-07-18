import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { GameTrophy, PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'

// Generic try and catch error wrapper
async function callWithTryandCatch<T>(method: () => Promise<T>, methodName: string, successMsg?: string): Promise<T | null> {
  try {
    const result = await method()
    if (successMsg) {
      alert(successMsg)
    }
    return result
  } catch (e) {
    consoleLogger.error(`Error calling '${methodName}' function:`, e)
    alert(`Error calling '${methodName}' function`)
    return null
  }
}

// Define handlers that call the app methods in a try and catch block
export const handleDeploy = (appMethods: PieoutMethods, sender: string) =>
  callWithTryandCatch(() => appMethods.deploy(sender), 'handleDeploy', 'Smart contract deployment successfully set!')

export const handleGenerate = (appMethods: PieoutMethods, sender: string) =>
  callWithTryandCatch(() => appMethods.generate(sender), 'handleGenerate', 'Smart contract successfully generated!')

export const handleTerminate = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) =>
  callWithTryandCatch(() => appMethods.terminate(appClient.appId, sender), 'handleTerminate', 'Smart contract successfully terminated!')

export const handleCalcSingleBoxCost = (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  keySize: number | bigint,
  valueSize: number | bigint,
) =>
  callWithTryandCatch(async () => {
    const result = await appMethods.calcSingleBoxCost(appClient.appId, sender, keySize, valueSize)
    consoleLogger.info(`Box MBR amount: ${result.toString()}`)
    return result
  }, 'handleCalcSingleBoxCost')

export const handleReadGenUnix = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) =>
  callWithTryandCatch(async () => {
    const result = await appMethods.readGenUnix(appClient.appId, sender)
    consoleLogger.info(`Smart contract genesis unix timestamp: ${result.toString()}`)
    return result
  }, 'handleReadGenUnix')

export const handleReadBoxGameState = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(async () => {
    const result = await appMethods.readBoxGameState(appClient.appId, sender, gameId)
    consoleLogger.info('Box Game state:', result)
    return result
  }, 'handleReadBoxGameState')

export const handleReadBoxGamePlayers = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(async () => {
    const result = await appMethods.readBoxGamePlayers(appClient.appId, sender, gameId)
    consoleLogger.info('Box Game players:', result)
    return result
  }, 'handleReadBoxGamePlayers')

export const handleReadBoxGameRegister = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, player: string) =>
  callWithTryandCatch(async () => {
    const result = await appMethods.readBoxGameRegister(appClient.appId, sender, player)
    consoleLogger.info(`Box Game Register for address ${player}: ${result}`)
    return result
  }, 'handleReadBoxGameRegister')

export const handleMintTrophy = (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  // setTrophyData?: (data: GameTrophy) => void,
) => callWithTryandCatch(() => appMethods.mintTrophy(appClient.appId, sender), 'handleMintTrophy', 'Trophy asset minted successfully!')

// withErrorHandling(
//   async () => {
//     await appMethods.mintTrophy(appClient.appId, sender)

//     if (setTrophyData) {
//       const boxGameTrophy = await appClient.state.box.boxGameTrophy()
//       setTrophyData({
//         highScore: boxGameTrophy?.highScore ?? 0,
//         assetId: boxGameTrophy?.assetId ?? 0n,
//         highscorerAddress: boxGameTrophy?.highscorerAddress ?? 'not-found',
//       })
//     }
//   },
//   'handleMintTrophy',
//   'Trophy minted successfully!',
// )

export const handleClaimTrophy = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) =>
  callWithTryandCatch(() => appMethods.claimTrophy(appClient.appId, sender), 'handleClaimTrophy', 'Trophy claimed successfully!')

export const handleNewGame = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, maxPlayers: bigint) =>
  callWithTryandCatch(() => appMethods.newGame(appClient.appId, sender, maxPlayers), 'handleNewGame', 'New game created successfully!')

export const handleJoinGame = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(() => appMethods.joinGame(appClient.appId, sender, gameId), 'handleJoinGame', 'Game joined successfully!')

export const handlePlayGame = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(() => appMethods.playGame(appClient.appId, sender, gameId), 'handlePlayGame', 'Game played successfully!')

export const handleResetGame = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(() => appMethods.resetGame(appClient.appId, sender, gameId), 'handleResetGame', 'Game reset successfully!')

export const handleDeleteGame = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(() => appMethods.deleteGame(appClient.appId, sender, gameId), 'handleDeleteGame', 'Game deleted successfully!')

export const handleGetBoxGameRegister = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) =>
  callWithTryandCatch(
    () => appMethods.getBoxGameRegister(appClient.appId, sender),
    'handleGetBoxGameRegister',
    'Game Register box obtained successfully!',
  )

export const handleSetGameCommit = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(
    () => appMethods.setGameCommit(appClient.appId, sender, gameId),
    'handleSetGameCommit',
    'Game comittment set successfully!',
  )

export const handleDelBoxGameRegisterForSelf = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) =>
  callWithTryandCatch(
    () => appMethods.delBoxGameRegisterForSelf(appClient.appId, sender, gameId),
    'handleDelBoxGameRegisterForSelf',
    'Game register box deleted successfully for self!',
  )

export const handleDelBoxGameRegisterForOther = (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, player: string) =>
  callWithTryandCatch(
    () => appMethods.delBoxGameRegisterForOther(appClient.appId, sender, player),
    'handleDelBoxGameRegisterForOther',
    'Game register box deleted successfully for other!',
  )

export const handleTriggerGameEvent = (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
  triggerId: bigint,
) =>
  callWithTryandCatch(
    () => appMethods.triggerGameEvent(appClient.appId, sender, gameId, triggerId),
    'handleTriggerGameEvent',
    'Game event triggered successfully!',
  )
