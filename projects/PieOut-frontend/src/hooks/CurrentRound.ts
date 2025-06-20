import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useCallback, useEffect, useState } from 'react'
import { PieoutClient } from '../contracts/Pieout'
import { AlgodClient } from 'algosdk/dist/types/client/v2/algod/algod'

export function pollOnChainData(algod: AlgodClient | null, appClient: PieoutClient | null, pollInterval = 3000) {
  const [currentRound, setCurrentRound] = useState<number | null>(null)
  const [athScore, setAthScore] = useState<number>(0)
  const [athAddress, setAthAddress] = useState<string>('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ')

  const selfCheckRound = useCallback(async () => {
    if (!algod) return
    try {
      const status = await algod.status().do()
      const lastRound = Number(status.lastRound)
      setCurrentRound((prev) => {
        if (prev !== lastRound) {
          consoleLogger.info('🔄 Last round:', lastRound)
          return lastRound
        }
        return prev
      })
    } catch (err) {
      consoleLogger.error('❌ Failed to fetch round:', err)
    }
  }, [algod])

  useEffect(() => {
    if (!algod) return

    const getIntervalData = async () => {
      try {
        const status = await algod.status().do()
        const lastRound = Number(status.lastRound)
        setCurrentRound((prev) => (prev !== lastRound ? lastRound : prev))

        if (appClient) {
          const score = await appClient.state.global.athScore()
          const address = await appClient.state.global.athAddress()
          setAthScore(Number(score))
          setAthAddress(address ?? 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ')
        }
      } catch (err) {
        consoleLogger.error('❌ Interval fetch error:', err)
      }
    }

    const intervalId = setInterval(getIntervalData, pollInterval)
    getIntervalData()

    return () => clearInterval(intervalId)
  }, [algod, appClient, pollInterval])

  return { currentRound, selfCheckRound, athScore, athAddress }
}
