//src/providers/GameBoxDataProvider.tsx
import React, { useState, FC } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePollGameData } from '../hooks/usePollGameBoxData'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { GameState, GameTrophy, GameRegister } from '../contracts/Pieout'
import { useAppCtx } from '../hooks/useAppCtx'
import { GameBoxDataCtx } from '../contexts/GameBoxData'

// Create Game Box Data Provider that supplies the application box data to its children
export const GameBoxDataProvider: FC<React.PropsWithChildren> = ({ children }) => {
  const { activeAddress } = useWallet()
  const { appClient, appMethods } = useAppCtx()
  const { gameId } = useGameIdCtx()
  const [gameTrophyData, setGameTrophyData] = useState<GameTrophy | undefined>(undefined)
  const [gameRegisterData, setGameRegisterData] = useState<GameRegister | undefined>(undefined)
  const [gameStateData, setGameStateData] = useState<GameState | undefined>(undefined)
  const [gamePlayersData, setGamePlayersData] = useState<string[] | undefined>(undefined)
  const [isAbleToPollTrophyData, setIsAbleToPollTrophyData] = useState<boolean>(false)
  const [isAbleToPollRegisterData, setIsAbleToPollRegisterData] = useState<boolean>(false)

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
    isAbleToPollTrophyData,
    isAbleToPollRegisterData,
  })

  return (
    <GameBoxDataCtx.Provider
      value={{
        gameTrophyData,
        gameRegisterData,
        gameStateData,
        gamePlayersData,
        isAbleToPollTrophyData,
        setIsAbleToPollTrophyData,
        isAbleToPollRegisterData,
        setIsAbleToPollRegisterData,
      }}
    >
      {children}
    </GameBoxDataCtx.Provider>
  )
}
