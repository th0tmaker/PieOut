import { GameRegister, GameState, GameTrophy, PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'

export type PollGameBoxDataProps = {
  appClient: PieoutClient | undefined
  appMethods: PieoutMethods | undefined
  gameId: bigint | null
  activeAddress: string | null
  gameTrophyData: GameTrophy | undefined
  setGameTrophyData: (data: GameTrophy | undefined) => void
  gameRegisterData: GameRegister | undefined
  setGameRegisterData: (data: GameRegister | undefined) => void
  gameStateData: GameState | undefined
  setGameStateData: (data: GameState | undefined) => void
  gamePlayersData: string[] | undefined
  setGamePlayersData: (data: string[] | undefined) => void
  pollingInterval?: number | null
  isAbleToPollTrophyData: boolean
  isAbleToPollRegisterData: boolean
}
