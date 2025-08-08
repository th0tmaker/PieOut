import { MethodHandlerProps, MethodNames } from './types/MethodHandler'
import * as mW from './methodsWrapped'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { errorHandler, shouldLogError } from './utils/helpers/errorHandler'

const METHOD_REQUIREMENTS: Record<MethodNames, (keyof MethodHandlerProps)[]> = {
  deploy: ['activeAddress', 'appMethods'],
  generate: ['activeAddress', 'appMethods'],
  terminate: ['activeAddress', 'appMethods', 'appClient'],
  calcSingleBoxCost: ['activeAddress', 'appMethods', 'appClient', 'keySize', 'valueSize'],
  readGenUnix: ['activeAddress', 'appMethods', 'appClient'],
  readBoxGamePlayers: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  doesBoxGameTrophyExist: ['activeAddress', 'appMethods', 'appClient'],
  doesBoxGameStateExist: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  doesBoxGameRegisterExist: ['activeAddress', 'appMethods', 'appClient', 'player'],
  mintTrophy: ['activeAddress', 'appMethods', 'appClient'],
  claimTrophy: ['activeAddress', 'appMethods', 'appClient'],
  newGame: ['activeAddress', 'appMethods', 'appClient', 'maxPlayers'],
  joinGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  playGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  resetGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  deleteGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  getBoxGameRegister: ['activeAddress', 'appMethods', 'appClient'],
  setGameCommit: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  delBoxGameRegisterForSelf: ['activeAddress', 'appMethods', 'appClient'],
  delBoxGameRegisterForOther: ['activeAddress', 'appMethods', 'appClient', 'player'],
  triggerGameEvent: ['activeAddress', 'appMethods', 'appClient', 'gameId', 'triggerId'],
}

type MethodHandler = (props: MethodHandlerProps) => Promise<unknown>
const METHOD_HANDLERS: Record<MethodNames, MethodHandler> = {
  deploy: (props) => mW.handleDeploy(props.appMethods!, props.activeAddress!),
  generate: (props) => mW.handleGenerate(props.appMethods!, props.activeAddress!),
  terminate: (props) => mW.handleTerminate(props.appClient!, props.appMethods!, props.activeAddress!),
  calcSingleBoxCost: (props) =>
    mW.handleCalcSingleBoxCost(props.appClient!, props.appMethods!, props.activeAddress!, props.keySize!, props.valueSize!),
  readGenUnix: (props) => mW.handleReadGenUnix(props.appClient!, props.appMethods!, props.activeAddress!),
  readBoxGamePlayers: (props) => mW.handleReadBoxGamePlayers(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  doesBoxGameTrophyExist: (props) => mW.handleDoesBoxGameTrophyExist(props.appClient!, props.appMethods!, props.activeAddress!),
  doesBoxGameStateExist: (props) =>
    mW.handleDoesBoxGameStateExist(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  doesBoxGameRegisterExist: (props) =>
    mW.handleDoesBoxGameRegisterExist(props.appClient!, props.appMethods!, props.activeAddress!, props.player!),
  mintTrophy: (props) => mW.handleMintTrophy(props.appClient!, props.appMethods!, props.activeAddress!),
  claimTrophy: (props) => mW.handleClaimTrophy(props.appClient!, props.appMethods!, props.activeAddress!),
  newGame: (props) => mW.handleNewGame(props.appClient!, props.appMethods!, props.activeAddress!, props.maxPlayers!),
  joinGame: (props) => mW.handleJoinGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  playGame: (props) => mW.handlePlayGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  resetGame: (props) => mW.handleResetGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  deleteGame: (props) => mW.handleDeleteGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  getBoxGameRegister: (props) => mW.handleGetBoxGameRegister(props.appClient!, props.appMethods!, props.activeAddress!),
  setGameCommit: (props) => mW.handleSetGameCommit(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  delBoxGameRegisterForSelf: (props) => mW.handleDelBoxGameRegisterForSelf(props.appClient!, props.appMethods!, props.activeAddress!),
  delBoxGameRegisterForOther: (props) =>
    mW.handleDelBoxGameRegisterForOther(props.appClient!, props.appMethods!, props.activeAddress!, props.player!),
  triggerGameEvent: (props) =>
    mW.handleTriggerGameEvent(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!, props.triggerId!),
}

export class PieoutMethodHandler {
  constructor(private props: MethodHandlerProps) {}

  private validateRequirements(name: MethodNames, props: MethodHandlerProps): string | null {
    const requirements = METHOD_REQUIREMENTS[name]
    for (const requirement of requirements) {
      if (props[requirement] == null) {
        return `${requirement} is required for ${name}`
      }
    }
    return null
  }

  private async execute(name: MethodNames, props: MethodHandlerProps): Promise<unknown> {
    const handler = METHOD_HANDLERS[name]
    if (!handler) {
      throw new Error(`Unknown method name: ${name}`)
    }
    return await handler(props)
  }

  async handle(name: MethodNames, dynamicProps?: Partial<MethodHandlerProps>): Promise<unknown> {
    // Start a new call context to reset error deduplication
    errorHandler.startNewCall()

    // Merge the constructor params with dynamic params
    const mergedProps: MethodHandlerProps = { ...this.props, ...dynamicProps }

    // Validate requirements using merged props
    const validationError = this.validateRequirements(name, mergedProps)
    if (validationError) {
      // Only log validation errors once per call
      if (shouldLogError(validationError)) {
        consoleLogger.error(`[MethodHandler] ${validationError}`)
      }
      throw new Error(validationError)
    }

    // Execute the method call directly; do not catch or log thrown errors
    return await this.execute(name, mergedProps)
  }
}

// Factory function for easy instantiation
export function createMethodHandler(props: MethodHandlerProps): PieoutMethodHandler {
  return new PieoutMethodHandler(props)
}

// Export types
export type { MethodHandlerProps, MethodNames }
