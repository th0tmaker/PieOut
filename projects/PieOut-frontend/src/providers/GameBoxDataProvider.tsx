//src/providers/GameBoxDataProvider.tsx
import React, { useState, FC } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePollGameData } from '../hooks/usePollGameData'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { useAppCtx } from '../hooks/useAppCtx'
import { GameBoxDataCtx } from '../contexts/GameBoxData'

// Create Game Box Data Provider that supplies the application box data to its children
export const GameBoxDataProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { activeAddress } = useWallet()
  const { appClient, appMethods } = useAppCtx()
  const { gameId } = useGameIdCtx()

  const [gameTrophyData, setGameTrophyData] = useState<GameTrophy>()
  const [gameRegisterData, setGameRegisterData] = useState<GameRegister>()
  const [gameStateData, setGameStateData] = useState<GameState>()
  const [gamePlayersData, setGamePlayersData] = useState<string[]>()

  usePollGameData({
    appClient,
    appMethods,
    gameId,
    activeAddress,
    gameTrophyData,
    setGameTrophyData,
    gameRegisterData,
    setGameRegisterData,
    gameStateData,
    setGameStateData,
    gamePlayersData,
    setGamePlayersData,
  })

  return (
    <GameBoxDataCtx.Provider
      value={{
        gameTrophyData,
        gameRegisterData,
        gameStateData,
        gamePlayersData,
      }}
    >
      {children}
    </GameBoxDataCtx.Provider>
  )
}
