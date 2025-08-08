//src/hooks/useAppSubscriber.ts
import { useEffect, useRef, useCallback, useState } from 'react'
import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { getAppSubscriber } from './useAlgorandSubscriber'
import type { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { ABIValue } from 'algosdk/dist/types/abi/abi_type'

export type Arc28Event = {
  name: string
  args: Record<string, ABIValue>
  txnId: string
  timestamp: number
}

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
}: UseAppSubscriberOptions = {}) {
  const [arc28Events, setArc28Events] = useState<Arc28Event[]>([])
  const subscriberRef = useRef<AlgorandSubscriber>()
  const mountedRef = useRef(true)
  const isInitializedRef = useRef(false)
  const isStartedRef = useRef(false)

  // Stable callback that doesn't change
  const processTransaction = useCallback((txn: SubscribedTransaction) => {
    consoleLogger.info(`Processing transaction ${txn.id}`, {
      hasArc28Events: !!txn.arc28Events?.length,
      arc28EventsCount: txn.arc28Events?.length || 0,
      arc28Events: txn.arc28Events || [],
    })

    if (!txn.arc28Events?.length) {
      consoleLogger.info('No ARC28 events found in transaction')
      return
    }

    // if (!mountedRef.current) {
    //   consoleLogger.info('Component unmounted, ignoring events')
    //   return
    // }

    const newEvents: Arc28Event[] = txn.arc28Events.map((e) => ({
      name: e.eventName,
      args: e.argsByName,
      txnId: txn.id,
      timestamp: Date.now(),
    }))

    consoleLogger.info(
      `✨ Converting ${newEvents.length} ARC28 events from txn ${txn.id}:`,
      newEvents.map((e) => ({
        name: e.name,
        args: e.args,
        eventName: e.name,
        argsByName: e.args,
      })),
    )

    setArc28Events((prev) => {
      const updated = [...prev, ...newEvents]
      consoleLogger.info(`📊 Adding ${newEvents.length} events. Total events now: ${updated.length}`)
      return updated
    })
  }, []) // Empty deps - this callback never changes

  // Initialize subscriber only once
  const initSubscriber = useCallback(() => {
    if (subscriberRef.current && isInitializedRef.current) {
      return subscriberRef.current
    }

    consoleLogger.info('Initializing subscriber with options:', {
      filterName,
      mode,
      maxRoundsToSync,
      pollOneTime,
    })

    const subscriber = getAppSubscriber(maxRoundsToSync)

    if (mode === 'single') {
      subscriber.on(filterName, processTransaction)
      consoleLogger.info(`Registered single event listener for filter: ${filterName}`)
    } else {
      subscriber.onBatch(filterName, (txns) => {
        consoleLogger.info(`Processing batch of ${txns.length} transactions`)
        txns.forEach(processTransaction)
      })
      consoleLogger.info(`Registered batch event listener for filter: ${filterName}`)
    }

    subscriberRef.current = subscriber
    isInitializedRef.current = true
    return subscriber
  }, [filterName, maxRoundsToSync, mode, processTransaction])

  const start = useCallback(() => {
    if (isStartedRef.current) {
      consoleLogger.info('ℹ️ Subscriber already started, ignoring')
      return
    }

    const subscriber = initSubscriber()
    try {
      subscriber.start()
      isStartedRef.current = true
      consoleLogger.info('✅ Subscriber started successfully')
    } catch (error) {
      consoleLogger.error('❌ Failed to start subscriber:', error)
    }
  }, [initSubscriber])

  const stop = useCallback(() => {
    if (subscriberRef.current && isStartedRef.current) {
      try {
        subscriberRef.current.stop('Stopped by useAppSubscriber')
        isStartedRef.current = false
        consoleLogger.info('🛑 Subscriber stopped')
      } catch (error) {
        consoleLogger.error('❌ Failed to stop subscriber:', error)
      }
    }
  }, [])

  const pollOnce = useCallback(async () => {
    const subscriber = initSubscriber()
    consoleLogger.info('📊 Polling once...')
    await subscriber.pollOnce()
    consoleLogger.info('📊 Poll completed')
  }, [initSubscriber])

  const clearArc28Events = useCallback(() => {
    consoleLogger.info('🗑️ Clearing all ARC28 events')
    setArc28Events([])
  }, [])

  // Initialize subscriber ONCE and keep it running
  useEffect(() => {
    if (isInitializedRef.current) {
      consoleLogger.info('⏭️ Subscriber already initialized, skipping')
      return
    }

    consoleLogger.info('🚀 useAppSubscriber: Initializing ONCE...')

    if (pollOneTime) {
      consoleLogger.info('🔄 Starting one-time poll')
      pollOnce()
    } else {
      consoleLogger.info('🔄 Starting continuous subscription')
      start()
    }

    // Only cleanup on final unmount
    return () => {
      consoleLogger.info('🧹 useAppSubscriber: Final cleanup on unmount')
      stop()
      mountedRef.current = false
      isInitializedRef.current = false
      isStartedRef.current = false
    }
  }, []) // CRITICAL: Empty array - only run once ever

  // Debug effect to log state changes
  useEffect(() => {
    consoleLogger.info(`📈 ARC28 Events count changed: ${arc28Events.length}`)
  }, [arc28Events.length])

  return {
    start,
    stop,
    pollOnce,
    clearArc28Events,
    arc28Events,
    arc28EventsCount: arc28Events.length,
  }
}
