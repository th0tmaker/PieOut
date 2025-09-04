//src/methodHandler.ts
import { MethodHandlerProps, MethodNames, MethodHandler } from './types/MethodHandler'
import * as mW from './methodsWrapped'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { errorHandler, shouldLogError } from './utils/helpers/errorHandler'

// Define required props for each method to ensure validation before dispatch
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
  newGame: ['activeAddress', 'appMethods', 'appClient', 'quickPlayEnabled', 'maxPlayers'],
  joinGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  playGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  resetGame: ['activeAddress', 'appMethods', 'appClient', 'gameId', 'changeQuickPlay', 'changeMaxPlayers', 'newMaxPlayers'],
  deleteGame: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  getBoxGameRegister: ['activeAddress', 'appMethods', 'appClient'],
  setGameCommit: ['activeAddress', 'appMethods', 'appClient', 'gameId'],
  delBoxGameRegisterForSelf: ['activeAddress', 'appMethods', 'appClient'],
  delBoxGameRegisterForOther: ['activeAddress', 'appMethods', 'appClient', 'player'],
  triggerGameEvent: ['activeAddress', 'appMethods', 'appClient', 'gameId', 'triggerId'],
}

// Map each method name to its wrapped handler implementation
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
  newGame: (props) =>
    mW.handleNewGame(props.appClient!, props.appMethods!, props.activeAddress!, props.quickPlayEnabled!, props.maxPlayers!),
  joinGame: (props) => mW.handleJoinGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  playGame: (props) => mW.handlePlayGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  resetGame: (props) =>
    mW.handleResetGame(
      props.appClient!,
      props.appMethods!,
      props.activeAddress!,
      props.gameId!,
      props.changeQuickPlay!,
      props.changeMaxPlayers!,
      props.newMaxPlayers!,
    ),
  deleteGame: (props) => mW.handleDeleteGame(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  getBoxGameRegister: (props) => mW.handleGetBoxGameRegister(props.appClient!, props.appMethods!, props.activeAddress!),
  setGameCommit: (props) => mW.handleSetGameCommit(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!),
  delBoxGameRegisterForSelf: (props) => mW.handleDelBoxGameRegisterForSelf(props.appClient!, props.appMethods!, props.activeAddress!),
  delBoxGameRegisterForOther: (props) =>
    mW.handleDelBoxGameRegisterForOther(props.appClient!, props.appMethods!, props.activeAddress!, props.player!),
  triggerGameEvent: (props) =>
    mW.handleTriggerGameEvent(props.appClient!, props.appMethods!, props.activeAddress!, props.gameId!, props.triggerId!),
}

// Create a class for handling the execution of the application methods
export class PieoutMethodHandler {
  constructor(private props: MethodHandlerProps) {} // Store default props for all calls

  // Create a method that checks if all requirements are valid before execution
  private validateRequirements(name: MethodNames, props: MethodHandlerProps): string | null {
    const requirements = METHOD_REQUIREMENTS[name] // Lookup required props for this method
    for (const requirement of requirements) {
      if (props[requirement] == null) {
        // Check if any required prop is missing
        return `${requirement} is required for ${name}` // Return descriptive validation message
      }
    }
    return null // All requirements satisfied
  }

  // Retrieve the correct handler for the given method name and execute it with the provided props
  private async execute(name: MethodNames, props: MethodHandlerProps): Promise<unknown> {
    const handler = METHOD_HANDLERS[name] // Get the appropriate handler
    if (!handler) {
      throw new Error(`Unknown method name: ${name}`) // Guard against invalid method names
    }
    return await handler(props) // Execute the actual wrapped method
  }

  // Handles the full process by merging props, checking requirements, logging validation errors, and dispatching the method call
  async handle(name: MethodNames, dynamicProps?: Partial<MethodHandlerProps>): Promise<unknown> {
    errorHandler.startNewCall() // Reset error deduplication for this call
    const mergedProps: MethodHandlerProps = { ...this.props, ...dynamicProps } // Merge static and dynamic props
    const validationError = this.validateRequirements(name, mergedProps) // Check required params
    if (validationError) {
      if (shouldLogError(validationError)) {
        consoleLogger.error(`[MethodHandler] ${validationError}`) // Log once if needed
      }
      throw new Error(validationError) // Throw if validation fails
    }
    return await this.execute(name, mergedProps) // Run the actual method
  }
}

// Factory function for easy instantiation
export function createMethodHandler(props: MethodHandlerProps): PieoutMethodHandler {
  return new PieoutMethodHandler(props)
}
