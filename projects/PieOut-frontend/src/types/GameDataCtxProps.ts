//src/types/GameDataCtxProps.ts
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'

export type GameDataCtxProps = {
  gameTrophyData: GameTrophy | undefined
  setGameTrophyData: (data: GameTrophy | undefined) => void
  gameRegisterData: GameRegister | undefined
  setGameRegisterData: (data: GameRegister | undefined) => void
  gameStateData: GameState | undefined
  setGameStateData: (data: GameState | undefined) => void
  gamePlayersData: string[] | undefined
  setGamePlayersData: (data: string[] | undefined) => void
  activeGames: [bigint, string][] | undefined
  setActiveGames: (data: [bigint, string][] | undefined) => void
  accsWithTrophyBalance: string[] | undefined
  setAccsWithTrophyBalance: (data: string[] | undefined) => void
  trophyHolderAddress: string | undefined
  setTrophyHolderAddress: (data: string | undefined) => void
  isGameDataLoading: boolean
  setIsGameDataLoading: (loading: boolean) => void
}
