import { PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'
import { BoxCommitRandDataType } from './types/boxCommitRandDataType'

import * as mW from './methodsWrapped'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

interface PieoutMethodParams {
  activeAddress: string | null
  appMethods: PieoutMethods
  appClient?: PieoutClient
  setBoxTrophyData?: (data: { assetId: string; ownerAddress: string }) => void
  setBoxCommitRandData?: (entry: BoxCommitRandDataType) => void
  maxPlayers?: bigint
  gameId?: bigint
  triggerId?: bigint
  player?: string
}

type PieoutMethodType =
  | 'deployApp'
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

// Validation requirements for each method
const METHOD_REQUIREMENTS: Record<PieoutMethodType, string[]> = {
  deployApp: ['appClient'],
  terminateApp: ['appClient'],
  readGenUnix: ['appClient'],
  readGameState: ['appClient', 'gameId'],
  readGamePlayers: ['appClient', 'gameId'],
  readBoxCommitRand: ['appClient', 'player'],
  mintTrophy: ['appClient'],
  claimTrophy: ['appClient'],
  newGame: ['appClient', 'maxPlayers'],
  joinGame: ['appClient', 'gameId'],
  playGame: ['appClient', 'gameId'],
  resetGame: ['appClient', 'gameId'],
  deleteGame: ['appClient', 'gameId'],
  getBoxCommitRand: ['appClient'],
  setBoxCommitRand: ['appClient', 'gameId'],
  delBoxCommitRandForSelf: ['appClient', 'gameId'],
  delBoxCommitRandForOther: ['appClient', 'player'],
  triggerGameProg: ['appClient', 'gameId', 'triggerId'],
}

class PieoutMethodHandler {
  constructor(private params: PieoutMethodParams) {}

  private validateRequirements(action: PieoutMethodType, params: PieoutMethodParams): string | null {
    const { activeAddress, appClient, gameId, triggerId, player, maxPlayers, appMethods } = params

    if (!activeAddress || !appMethods) {
      return 'activeAddress/appMethods required!'
    }

    const requirements = METHOD_REQUIREMENTS[action]
    const values = {
      appClient,
      gameId,
      triggerId,
      player,
      maxPlayers,
    }

    for (const requirement of requirements) {
      if (values[requirement as keyof typeof values] == null) {
        return `${requirement} required!`
      }
    }

    return null
  }

  private async updateBoxCommitRandData(params: PieoutMethodParams): Promise<void> {
    const { appClient, activeAddress, setBoxCommitRandData } = params

    if (!setBoxCommitRandData || !appClient || !activeAddress) return

    try {
      const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
      const entry = boxCommitRand.get(activeAddress)

      setBoxCommitRandData(
        entry
          ? {
              gameId: entry.gameId ?? null,
              commitRound: entry.commitRound ?? null,
              expiryRound: entry.expiryRound ?? null,
            }
          : null,
      )
    } catch (err) {
      consoleLogger.error('Failed to update box commit rand data:', err)
    }
  }

  private async executeMethod(action: PieoutMethodType, params: PieoutMethodParams): Promise<void> {
    const { activeAddress, appClient, appMethods, setBoxTrophyData, maxPlayers, gameId, triggerId, player } = params

    const methodHandlers: Record<PieoutMethodType, () => Promise<void>> = {
      terminateApp: () => mW.handleTerminateApp(appClient!, appMethods, activeAddress!),
      deployApp: () => mW.handleDeployApp(appMethods, activeAddress!),
      readGenUnix: () => mW.handleReadGenUnix(appClient!, appMethods, activeAddress!),
      readGameState: () => mW.handleReadGameState(appClient!, appMethods, activeAddress!, gameId!) as Promise<void>,
      readGamePlayers: () => mW.handleReadGamePlayers(appClient!, appMethods, activeAddress!, gameId!) as Promise<void>,
      readBoxCommitRand: () => mW.handleReadBoxCommitRand(appClient!, appMethods, activeAddress!, player!) as Promise<void>,
      mintTrophy: () => mW.handleMintTrophy(appClient!, appMethods, activeAddress!, setBoxTrophyData),
      claimTrophy: () => mW.handleClaimTrophy(appClient!, appMethods, activeAddress!),
      newGame: () => mW.handleNewGame(appClient!, appMethods, activeAddress!, maxPlayers!),
      joinGame: () => mW.handleJoinGame(appClient!, appMethods, activeAddress!, gameId!),
      playGame: () => mW.handlePlayGame(appClient!, appMethods, activeAddress!, gameId!),
      resetGame: () => mW.handleResetGame(appClient!, appMethods, activeAddress!, gameId!),
      deleteGame: () => mW.handleDeleteGame(appClient!, appMethods, activeAddress!, gameId!),
      delBoxCommitRandForSelf: () => mW.handleDelBoxCommitRandForSelf(appClient!, appMethods, activeAddress!, gameId!),
      delBoxCommitRandForOther: () => mW.handleDelBoxCommitRandForOther(appClient!, appMethods, activeAddress!, player!),
      triggerGameProg: () => mW.handleTriggerGameProg(appClient!, appMethods, activeAddress!, gameId!, triggerId!),

      // Handle special cases directly
      getBoxCommitRand: async () => {
        await appMethods.getBoxCommitRand(appClient!.appId, activeAddress!)
        await this.updateBoxCommitRandData(params)
      },

      setBoxCommitRand: async () => {
        await appMethods.setBoxCommitRand(appClient!.appId, activeAddress!, gameId!)
        await this.updateBoxCommitRandData(params)
      },
    }

    await methodHandlers[action]()
  }

  async handle(action: PieoutMethodType, dynamicParams?: Partial<PieoutMethodParams>): Promise<void> {
    // Merge the constructor params with dynamic params
    const mergedParams: PieoutMethodParams = { ...this.params, ...dynamicParams }

    // Validate requirements using merged params
    const validationError = this.validateRequirements(action, mergedParams)
    if (validationError) {
      alert(validationError)
      return
    }

    try {
      await this.executeMethod(action, mergedParams)
    } catch (err) {
      consoleLogger.error(`${action} failed:`, err)
      alert(`${action} failed`)
    }
  }
}

export { PieoutMethodHandler, type PieoutMethodParams, type PieoutMethodType }
