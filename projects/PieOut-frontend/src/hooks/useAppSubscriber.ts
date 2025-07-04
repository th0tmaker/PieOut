import { useEffect, useRef, useCallback } from 'react'
import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { getAppSubscriber } from './useAlgorandSubscriber'

interface UseAppSubscriberOptions {
  filterName?: string
  mode?: 'single' | 'batch'
  maxRoundsToSync?: number
  pollOneTime?: boolean
}

export function useAppSubscriber({
  filterName = 'pieout-filter',
  mode = 'batch',
  maxRoundsToSync = 100,
  pollOneTime = false,
}: UseAppSubscriberOptions) {
  const subscriberRef = useRef<AlgorandSubscriber | null>(null)

  const register = useCallback(() => {
    const appSubscriber = getAppSubscriber(maxRoundsToSync)

    if (mode === 'single') {
      appSubscriber.on(filterName, (txn) => {
        txn.arc28Events?.forEach((e) => consoleLogger.info(e.eventName, e.argsByName))
        consoleLogger.info('transaction id from sub', txn.id)
      })
    }

    if (mode === 'batch') {
      appSubscriber.onBatch(filterName, (txns) => {
        consoleLogger.info(`Received batch of ${txns.length} transactions`)
        txns.forEach((txn) => {
          txn.arc28Events?.forEach((e) => consoleLogger.info(e.eventName, e.argsByName))
          consoleLogger.info('transaction id from batch', txn.id)
        })
      })
    }

    subscriberRef.current = appSubscriber
  }, [filterName, maxRoundsToSync, mode])

  const start = useCallback(() => {
    if (!subscriberRef.current) register()
    subscriberRef.current?.start()
  }, [register])

  const stop = useCallback(() => {
    subscriberRef.current?.stop('Stopped by useAppSubscriber')
  }, [])

  const pollOnce = useCallback(async () => {
    if (!subscriberRef.current) register()
    await subscriberRef.current?.pollOnce()
  }, [register])

  useEffect(() => {
    register()
    if (pollOneTime) {
      pollOnce()
    } else {
      start()
    }
    return () => stop()
  }, [register, pollOneTime, pollOnce, start, stop])

  return { startAppSubscriber: start, stopAppSubscriber: stop, pollOnceAppSubscriber: pollOnce }
}
