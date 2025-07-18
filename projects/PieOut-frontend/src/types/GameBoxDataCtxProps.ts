//src/types/GameBoxDataCtxProps.ts
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'

// Define the Game Box Data Context Props type
// export type GameBoxDataCtxProps = {
//   gameTrophyData: GameTrophy | undefined
//   gameRegisterData: GameRegister | undefined
//   gameStateData: GameState | undefined
//   gamePlayersData: string[] | undefined
// }
export type GameBoxDataCtxProps = {
  gameTrophyData: GameTrophy | undefined
  gameRegisterData: GameRegister | undefined
  gameStateData: GameState | undefined
  gamePlayersData: string[] | undefined
  isAbleToPollTrophyData: boolean
  setIsAbleToPollTrophyData: (value: boolean) => void
  isAbleToPollRegisterData: boolean
  setIsAbleToPollRegisterData: (value: boolean) => void
}
