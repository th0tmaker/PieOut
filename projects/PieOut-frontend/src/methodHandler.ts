import { MethodHandlerProps, MethodNames } from './types/MethodHandler'
import * as mW from './methodsWrapped'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useGameBoxDataCtx } from './hooks/useGameBoxDataCtx'

// Validation requirements for each method
const METHOD_REQUIREMENTS: Record<MethodNames, string[]> = {
  deploy: ['activeAddress', 'appMethods'],
  generate: ['activeAddress', 'appMethods'],
  terminate: ['activeAddress', 'appMethods', 'appClient'],
  calcSingleBoxCost: ['activeAddress', 'appMethods', 'appClient', 'keySize', 'valueSize'],
  readGenUnix: ['activeAddress', 'appMethods', 'appClient'],
  readBoxGameState: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  readBoxGamePlayers: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  readBoxGameRegister: ['activeAddress', 'appMethods', 'appClient', 'player'],
  mintTrophy: ['activeAddress', 'appMethods', 'appClient'],
  claimTrophy: ['activeAddress', 'appMethods', 'appClient'],
  newGame: ['activeAddress', 'appMethods', 'appClient', 'maxPlayers'],
  joinGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  playGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  resetGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  deleteGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  getBoxGameRegister: ['activeAddress', 'appMethods', 'appClient'],
  setGameCommit: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  delBoxGameRegisterForSelf: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  delBoxGameRegisterForOther: ['activeAddress', 'appMethods', 'appClient', 'player'],
  triggerGameEvent: ['activeAddress', 'appMethods', 'appClient', 'gameId', 'triggerId'],
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
      activeAddress,
      appMethods,
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

  private async execute(name: MethodNames, props: MethodHandlerProps): Promise<unknown> {
    const { activeAddress, appClient, appMethods, maxPlayers, gameId, triggerId, player, keySize, valueSize } = props
    // Throw error if common requirements are missing
    if (!appMethods) throw new Error('appMethods is required')
    if (!activeAddress) throw new Error('activeAddress is required')

    switch (name) {
      case 'deploy':
        return await mW.handleDeploy(appMethods, activeAddress)

      case 'generate':
        return await mW.handleGenerate(appMethods, activeAddress)

      case 'terminate':
        if (!appClient) throw new Error('terminate requires appClient')
        return await mW.handleTerminate(appClient, appMethods, activeAddress)

      case 'calcSingleBoxCost':
        if (!appClient) throw new Error('calcSingleBoxCost requires appClient')
        if (keySize == null) throw new Error('calcSingleBoxCost requires keySize')
        if (valueSize == null) throw new Error('calcSingleBoxCost requires valueSize')
        return await mW.handleCalcSingleBoxCost(appClient, appMethods, activeAddress, keySize, valueSize)

      case 'readGenUnix':
        if (!appClient) throw new Error('readGenUnix requires appClient')
        return await mW.handleReadGenUnix(appClient, appMethods, activeAddress)

      case 'mintTrophy':
        if (!appClient) throw new Error('mintTrophy requires appClient')
        return await mW.handleMintTrophy(appClient, appMethods, activeAddress)

      case 'claimTrophy':
        if (!appClient) throw new Error('claimTrophy requires appClient')
        return await mW.handleClaimTrophy(appClient, appMethods, activeAddress)

      case 'getBoxGameRegister':
        if (!appClient) throw new Error('getBoxGameRegister requires appClient')
        return await mW.handleGetBoxGameRegister(appClient, appMethods, activeAddress)

      case 'newGame':
        if (!appClient) throw new Error('newGame requires appClient')
        if (maxPlayers == null) throw new Error('newGame requires maxPlayers')
        return await mW.handleNewGame(appClient, appMethods, activeAddress, maxPlayers)

      case 'joinGame':
      case 'playGame':
      case 'resetGame':
      case 'deleteGame':
      case 'readBoxGameState':
      case 'readBoxGamePlayers':
      case 'setGameCommit':
      case 'triggerGameEvent':
      case 'delBoxGameRegisterForSelf':
        if (!appClient) throw new Error(`${name} requires appClient`)
        if (gameId == null) throw new Error(`${name} requires gameId`)
        if (name === 'triggerGameEvent' && triggerId == null) throw new Error('triggerGameEvent requires triggerId')
        return await {
          joinGame: () => mW.handleJoinGame(appClient, appMethods, activeAddress, gameId),
          playGame: () => mW.handlePlayGame(appClient, appMethods, activeAddress, gameId),
          resetGame: () => mW.handleResetGame(appClient, appMethods, activeAddress, gameId),
          deleteGame: () => mW.handleDeleteGame(appClient, appMethods, activeAddress, gameId),
          readBoxGameState: () => mW.handleReadBoxGameState(appClient, appMethods, activeAddress, gameId),
          readBoxGamePlayers: () => mW.handleReadBoxGamePlayers(appClient, appMethods, activeAddress, gameId),
          setGameCommit: () => mW.handleSetGameCommit(appClient, appMethods, activeAddress, gameId),
          triggerGameEvent: () => mW.handleTriggerGameEvent(appClient, appMethods, activeAddress, gameId, triggerId!),
          delBoxGameRegisterForSelf: () => mW.handleDelBoxGameRegisterForSelf(appClient, appMethods, activeAddress, gameId),
        }[name]()

      case 'readBoxGameRegister':
      case 'delBoxGameRegisterForOther':
        if (!appClient) throw new Error(`${name} requires appClient`)
        if (player == null) throw new Error(`${name} requires player`)
        return await {
          readBoxGameRegister: () => mW.handleReadBoxGameRegister(appClient, appMethods, activeAddress, player),
          delBoxGameRegisterForOther: () => mW.handleDelBoxGameRegisterForOther(appClient, appMethods, activeAddress, player),
        }[name]()

      default:
        throw new Error(`Unknown method name: ${name}`)
    }
  }

  async handle(name: MethodNames, dynamicProps?: Partial<MethodHandlerProps>): Promise<unknown> {
    // Merge the constructor params with dynamic params
    const mergedProps: MethodHandlerProps = { ...this.props, ...dynamicProps }

    // Validate requirements using merged params
    const validationError = this.validateRequirements(name, mergedProps)
    if (validationError) {
      alert(validationError)
      return null
    }

    try {
      return await this.execute(name, mergedProps)
    } catch (err) {
      consoleLogger.error(`${name} failed:`, err)
      alert(`${name} failed`)
      return null
    }
  }

  // Convenience methods for common operations
  async call(name: MethodNames, overrides?: Partial<MethodHandlerProps>) {
    return this.handle(name, overrides)
  }
}

// Factory function for easy instantiation
export function createMethodHandler(props: MethodHandlerProps) {
  return new PieoutMethodHandler(props)
}

// Export everything
export { PieoutMethodHandler, type MethodHandlerProps, type MethodNames }
