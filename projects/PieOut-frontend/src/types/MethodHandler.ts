//src/types/MethodHandlerProps.ts
import { PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'

// Type alias for the smart contract app method properties dispatcher
export type MethodHandler = (props: MethodHandlerProps) => Promise<unknown>

// Define a type that will store the smart contract app method handler properties
export type MethodHandlerProps = {
  activeAddress: string | null
  appMethods: PieoutMethods | undefined
  appClient: PieoutClient | undefined
  quickPlayEnabled?: boolean | null
  maxPlayers?: bigint | null
  gameId?: bigint | null
  changeQuickPlay?: boolean | null
  changeMaxPlayers?: boolean | null
  newMaxPlayers?: bigint | null
  triggerId?: bigint | null
  player?: string | null
  keySize?: bigint | number | null
  valueSize?: bigint | number | null
}

// Define a type that will store the smart contract app method names
export type MethodNames =
  | 'deploy'
  | 'generate'
  | 'terminate'
  | 'calcSingleBoxCost'
  | 'readGenUnix'
  | 'doesBoxGameTrophyExist'
  | 'doesBoxGameRegisterExist'
  | 'doesBoxGameStateExist'
  | 'readBoxGamePlayers'
  | 'mintTrophy'
  | 'claimTrophy'
  | 'newGame'
  | 'joinGame'
  | 'playGame'
  | 'resetGame'
  | 'deleteGame'
  | 'getBoxGameRegister'
  | 'setGameCommit'
  | 'delBoxGameRegisterForSelf'
  | 'delBoxGameRegisterForOther'
  | 'triggerGameEvent'
