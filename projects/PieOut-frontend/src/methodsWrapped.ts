// src/methodsWrapped.ts
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'

// Centralized safe executor with detailed error reporting
async function safeCall<T>(fn: () => Promise<T>, wrapperName: string, methodName: string, fileName = 'methodsWrapped.ts'): Promise<T> {
  try {
    return await fn()
  } catch (err: unknown) {
    const errorMsg = typeof err === 'object' && err !== null && 'message' in err ? (err as { message: string }).message : err
    consoleLogger.error(`[Error] File: ${fileName}, Wrapper: ${wrapperName}, Method: ${methodName} → ${errorMsg}`)
    throw new Error(`Contract call failed in ${fileName} → ${wrapperName} (calls ${methodName}): ${errorMsg}`)
  }
}

// Wrappers for safe calling the smart contract application methods
export const handleDeploy = async (appMethods: PieoutMethods, sender: string) => {
  if (!appMethods || !sender) throw new Error('[handleDeploy] - Missing required parameters!')
  return await safeCall(() => appMethods.deploy(sender), 'handleDeploy', 'deploy')
}

export const handleGenerate = async (appMethods: PieoutMethods, sender: string) => {
  if (!appMethods || !sender) throw new Error('[handleGenerate] - Missing required parameters!')
  return await safeCall(() => appMethods.generate(sender), 'handleGenerate', 'generate')
}

export const handleTerminate = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleTerminate] - Missing required parameters!')
  return await safeCall(() => appMethods.terminate(appClient.appId, sender), 'handleTerminate', 'terminate')
}

export const handleCalcSingleBoxCost = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  keySize: number | bigint,
  valueSize: number | bigint,
) => {
  if (!appClient || !appMethods || !sender || !keySize || !valueSize)
    throw new Error('[handleCalcSingleBoxCost] - Missing required parameters!')
  return await safeCall(
    () => appMethods.calcSingleBoxCost(appClient.appId, sender, keySize, valueSize),
    'handleCalcSingleBoxCost',
    'calcSingleBoxCost',
  )
}

export const handleReadGenUnix = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleReadGenUnix] - Missing required parameters!')
  return await safeCall(() => appMethods.readGenUnix(appClient.appId, sender), 'handleReadGenUnix', 'readGenUnix')
}

export const handleDoesBoxGameStateExist = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handleDoesBoxGameStateExist] - Missing required parameters!')
  return await safeCall(
    () => appMethods.doesBoxGameStateExist(appClient.appId, sender, gameId),
    'handleDoesBoxGameStateExist',
    'doesBoxGameStateExist',
  )
}

export const handleReadBoxGamePlayers = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handleReadBoxGamePlayers] - Missing required parameters!')
  return await safeCall(
    () => appMethods.readBoxGamePlayers(appClient.appId, sender, gameId),
    'handleReadBoxGamePlayers',
    'readBoxGamePlayers',
  )
}

export const handleDoesBoxGameRegisterExist = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  player: string,
) => {
  if (!appClient || !appMethods || !sender || !player) throw new Error('[handleDoesBoxGameRegisterExist] - Missing required parameters!')
  return await safeCall(
    () => appMethods.doesBoxGameRegisterExist(appClient.appId, sender, player),
    'handleDoesBoxGameRegisterExist',
    'doesBoxGameRegisterExist',
  )
}

export const handleDoesBoxGameTrophyExist = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleDoesBoxGameTrophyExist] - Missing required parameters!')
  return await safeCall(
    () => appMethods.doesBoxGameTrophyExist(appClient.appId, sender),
    'handleDoesBoxGameTrophyExist',
    'doesBoxGameTrophyExist',
  )
}

export const handleMintTrophy = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleMintTrophy] - Missing required parameters!')
  return await safeCall(() => appMethods.mintTrophy(appClient.appId, sender), 'handleMintTrophy', 'mintTrophy')
}

export const handleClaimTrophy = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleClaimTrophy] - Missing required parameters!')
  return await safeCall(() => appMethods.claimTrophy(appClient.appId, sender), 'handleClaimTrophy', 'claimTrophy')
}

export const handleNewGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, maxPlayers: bigint) => {
  if (!appClient || !appMethods || !sender || !maxPlayers) throw new Error('[handleNewGame] - Missing required parameters!')
  return await safeCall(() => appMethods.newGame(appClient.appId, sender, maxPlayers), 'handleNewGame', 'newGame')
}

export const handleJoinGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handleJoinGame] - Missing required parameters!')
  return await safeCall(() => appMethods.joinGame(appClient.appId, sender, gameId), 'handleJoinGame', 'joinGame')
}

export const handlePlayGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handlePlayGame] - Missing required parameters!')
  return await safeCall(() => appMethods.playGame(appClient.appId, sender, gameId), 'handlePlayGame', 'playGame')
}

export const handleResetGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handleResetGame] - Missing required parameters!')
  return await safeCall(() => appMethods.resetGame(appClient.appId, sender, gameId), 'handleResetGame', 'resetGame')
}

export const handleDeleteGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handleDeleteGame] - Missing required parameters!')
  return await safeCall(() => appMethods.deleteGame(appClient.appId, sender, gameId), 'handleDeleteGame', 'deleteGame')
}

export const handleGetBoxGameRegister = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleGetBoxGameRegister] - Missing required parameters!')
  return await safeCall(() => appMethods.getBoxGameRegister(appClient.appId, sender), 'handleGetBoxGameRegister', 'getBoxGameRegister')
}

export const handleDelBoxGameRegisterForSelf = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  if (!appClient || !appMethods || !sender) throw new Error('[handleDelBoxGameRegisterForSelf] - Missing required parameters!')
  return await safeCall(
    () => appMethods.delBoxGameRegisterForSelf(appClient.appId, sender),
    'handleDelBoxGameRegisterForSelf',
    'delBoxGameRegisterForSelf',
  )
}

export const handleDelBoxGameRegisterForOther = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  player: string,
) => {
  if (!appClient || !appMethods || !sender || !player) throw new Error('[handleDelBoxGameRegisterForOther] - Missing required parameters!')
  return await safeCall(
    () => appMethods.delBoxGameRegisterForOther(appClient.appId, sender, player),
    'handleDelBoxGameRegisterForOther',
    'delBoxGameRegisterForOther',
  )
}

export const handleSetGameCommit = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  if (!appClient || !appMethods || !sender || !gameId) throw new Error('[handleSetGameCommit] - Missing required parameters!')
  return await safeCall(() => appMethods.setGameCommit(appClient.appId, sender, gameId), 'handleSetGameCommit', 'setGameCommit')
}

export const handleTriggerGameEvent = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
  triggerId: bigint,
) => {
  if (appClient == null || appMethods == null || !sender || gameId == null || triggerId == null)
    throw new Error('[handleTriggerGameEvent] - Missing required parameters!')
  return await safeCall(
    () => appMethods.triggerGameEvent(appClient.appId, sender, gameId, triggerId),
    'handleTriggerGameEvent',
    'triggerGameEvent',
  )
}
