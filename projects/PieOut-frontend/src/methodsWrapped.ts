import { PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'

export const handleDeploy = async (appMethods: PieoutMethods, sender: string) => {
  return await appMethods.deploy(sender)
}

export const handleGenerate = async (appMethods: PieoutMethods, sender: string) => {
  return await appMethods.generate(sender)
}

export const handleTerminate = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  return await appMethods.terminate(appClient.appId, sender)
}

export const handleCalcSingleBoxCost = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  keySize: number | bigint,
  valueSize: number | bigint,
) => {
  return await appMethods.calcSingleBoxCost(appClient.appId, sender, keySize, valueSize)
}

export const handleReadGenUnix = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  return await appMethods.readGenUnix(appClient.appId, sender)
}

export const handleDoesBoxGameStateExist = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.doesBoxGameStateExist(appClient.appId, sender, gameId)
}

export const handleReadBoxGamePlayers = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.readBoxGamePlayers(appClient.appId, sender, gameId)
}

export const handleDoesBoxGameRegisterExist = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  player: string,
) => {
  return await appMethods.doesBoxGameRegisterExist(appClient.appId, sender, player)
}

export const handleDoesBoxGameTrophyExist = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  return await appMethods.doesBoxGameTrophyExist(appClient.appId, sender)
}

export const handleMintTrophy = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  return await appMethods.mintTrophy(appClient.appId, sender)
}

export const handleClaimTrophy = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  return await appMethods.claimTrophy(appClient.appId, sender)
}

export const handleNewGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, maxPlayers: bigint) => {
  return await appMethods.newGame(appClient.appId, sender, maxPlayers)
}

export const handleJoinGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.joinGame(appClient.appId, sender, gameId)
}

export const handlePlayGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.playGame(appClient.appId, sender, gameId)
}

export const handleResetGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.resetGame(appClient.appId, sender, gameId)
}

export const handleDeleteGame = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.deleteGame(appClient.appId, sender, gameId)
}

export const handleGetBoxGameRegister = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string) => {
  return await appMethods.getBoxGameRegister(appClient.appId, sender)
}

export const handleDelBoxGameRegisterForSelf = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
) => {
  return await appMethods.delBoxGameRegisterForSelf(appClient.appId, sender, gameId)
}

export const handleDelBoxGameRegisterForOther = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  player: string,
) => {
  return await appMethods.delBoxGameRegisterForOther(appClient.appId, sender, player)
}

export const handleSetGameCommit = async (appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) => {
  return await appMethods.setGameCommit(appClient.appId, sender, gameId)
}

export const handleTriggerGameEvent = async (
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
  triggerId: bigint,
) => {
  return await appMethods.triggerGameEvent(appClient.appId, sender, gameId, triggerId)
}
