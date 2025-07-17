//src/types/MethodHandlerProps.ts
import { GameRegister, GameTrophy, PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'

// Define the Method Handler Props type
export type MethodHandlerProps = {
  activeAddress: string | null
  appMethods: PieoutMethods | undefined
  appClient: PieoutClient | undefined
  setTrophyData: (data: GameTrophy) => void
  setRegisterData: (data: GameRegister) => void
  maxPlayers?: bigint
  gameId?: bigint
  triggerId?: bigint
  player?: string
}

// Define the Method Names type
export type MethodNames =
  | 'deploy'
  | 'generate'
  | 'terminate'
  | 'calcSingleBoxCost'
  | 'readGenUnix'
  | 'readBoxGameState'
  | 'readBoxGamePlayers'
  | 'readBoxGameRegister'
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
