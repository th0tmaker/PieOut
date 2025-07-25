//src/types/GameBoxDataCtxProps.ts
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'

export type GameBoxDataCtxProps = {
  gameTrophyData: GameTrophy | undefined
  gameRegisterData: GameRegister | undefined
  gameStateData: GameState | undefined
  gamePlayersData: string[] | undefined
  isLoadingGameData: boolean
  setIsLoadingGameData: (loading: boolean) => void
}
