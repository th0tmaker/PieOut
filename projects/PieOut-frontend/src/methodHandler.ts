import { MethodHandlerProps, MethodNames } from './types/MethodHandler'
import * as mW from './methodsWrapped'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useAppCtx } from './hooks/useAppCtx'

// Validation requirements for each method
const METHOD_REQUIREMENTS: Record<MethodNames, string[]> = {
  deploy: ['appClient'],
  generate: ['appClient'],
  terminate: ['appClient'],
  calcSingleBoxCost: ['appClient'],
  readGenUnix: ['appClient'],
  readBoxGameState: ['appClient', 'gameId'],
  readBoxGamePlayers: ['appClient', 'gameId'],
  readBoxGameRegister: ['appClient', 'player'],
  mintTrophy: ['appClient'],
  claimTrophy: ['appClient'],
  newGame: ['appClient', 'maxPlayers'],
  joinGame: ['appClient', 'gameId'],
  playGame: ['appClient', 'gameId'],
  resetGame: ['appClient', 'gameId'],
  deleteGame: ['appClient', 'gameId'],
  getBoxGameRegister: ['appClient'],
  setGameCommit: ['appClient', 'gameId'],
  delBoxGameRegisterForSelf: ['appClient', 'gameId'],
  delBoxGameRegisterForOther: ['appClient', 'player'],
  triggerGameEvent: ['appClient', 'gameId', 'triggerId'],
}

class PieoutMethodHandler {
  constructor(private props: MethodHandlerProps) {}

  private validateRequirements(name: MethodNames, props: MethodHandlerProps): string | null {
    const { activeAddress, appClient, gameId, triggerId, player, maxPlayers, appMethods } = props

    if (!activeAddress || !appMethods) {
      return 'activeAddress/appMethods required!'
    }

    const requirements = METHOD_REQUIREMENTS[name]
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

  // private async updateBoxCommitRandData(props: MethodHandlerProps): Promise<void> {
  //   const { appClient, activeAddress, setRegisterData } = props

  //   if (!setRegisterData || !appClient || !activeAddress) return

  //   try {
  //     const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
  //     const entry = boxCommitRand.get(activeAddress)

  //     setBoxCommitRandData(
  //       entry
  //         ? {
  //             gameId: entry.gameId ?? null,
  //             commitRound: entry.commitRound ?? null,
  //             expiryRound: entry.expiryRound ?? null,
  //           }
  //         : null,
  //     )
  //   } catch (err) {
  //     consoleLogger.error('Failed to update box commit rand data:', err)
  //   }
  // }

  private async executeMethod(name: MethodNames, props: MethodHandlerProps): Promise<void> {
    const { activeAddress, appClient, appMethods, setTrophyData, maxPlayers, gameId, triggerId, player } = props

    const methodHandlers: Record<MethodNames, () => Promise<void>> = {
      deploy: () => mW.handleDeployApp(appMethods, activeAddress!),
      generate: () => mW.handleGenerateApp(),
      terminate: () => mW.handleTerminateApp(appClient!, appMethods, activeAddress!),
      readGenUnix: () => mW.handleReadGenUnix(appClient!, appMethods, activeAddress!),
      readBoxGameState: () => mW.handleReadGameState(appClient!, appMethods, activeAddress!, gameId!) as Promise<void>,
      readBoxGamePlayers: () => mW.handleReadGamePlayers(appClient!, appMethods, activeAddress!, gameId!) as Promise<void>,
      readBoxGameRegister: () => mW.handleReadBoxCommitRand(appClient!, appMethods, activeAddress!, player!) as Promise<void>,
      mintTrophy: () => mW.handleMintTrophy(appClient!, appMethods, activeAddress!, setBoxTrophyData),
      claimTrophy: () => mW.handleClaimTrophy(appClient!, appMethods, activeAddress!),
      newGame: () => mW.handleNewGame(appClient!, appMethods, activeAddress!, maxPlayers!),
      joinGame: () => mW.handleJoinGame(appClient!, appMethods, activeAddress!, gameId!),
      playGame: () => mW.handlePlayGame(appClient!, appMethods, activeAddress!, gameId!),
      resetGame: () => mW.handleResetGame(appClient!, appMethods, activeAddress!, gameId!),
      deleteGame: () => mW.handleDeleteGame(appClient!, appMethods, activeAddress!, gameId!),
      delBoxGameRegisterForSelf: () => mW.handleDelBoxCommitRandForSelf(appClient!, appMethods, activeAddress!, gameId!),
      delBoxGameRegisterForOther: () => mW.handleDelBoxCommitRandForOther(appClient!, appMethods, activeAddress!, player!),
      triggerGameEvent: () => mW.handleTriggerGameProg(appClient!, appMethods, activeAddress!, gameId!, triggerId!),

      // // Handle special cases directly
      // getBoxCommitRand: async () => {
      //   await appMethods.getBoxCommitRand(appClient!.appId, activeAddress!)
      //   await this.updateBoxCommitRandData(props)
      // },

      // setBoxCommitRand: async () => {
      //   await appMethods.setBoxCommitRand(appClient!.appId, activeAddress!, gameId!)
      //   await this.updateBoxCommitRandData(props)
      // },
    }

    await methodHandlers[name]()
  }

  async handle(name: MethodNames, dynamicProps?: Partial<MethodHandlerProps>): Promise<void> {
    // Merge the constructor params with dynamic params
    const mergedProps: MethodHandlerProps = { ...this.props, ...dynamicProps }

    // Validate requirements using merged params
    const validationError = this.validateRequirements(name, mergedProps)
    if (validationError) {
      alert(validationError)
      return
    }

    try {
      await this.executeMethod(name, mergedProps)
    } catch (err) {
      consoleLogger.error(`${name} failed:`, err)
      alert(`${name} failed`)
    }
  }
}

export { PieoutMethodHandler, type MethodHandlerProps, type MethodNames }
