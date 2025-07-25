//src/types/MethodHandlerProps.ts
import { PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'

// Define the Method Handler Props type
export type MethodHandlerProps = {
  activeAddress: string | null
  appMethods: PieoutMethods | undefined
  appClient: PieoutClient | undefined
  maxPlayers?: bigint | null
  gameId?: bigint | null
  triggerId?: bigint | null
  player?: string | null
  keySize?: bigint | number | null
  valueSize?: bigint | number | null
}

// Define the Method Names type
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
