import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { ABIValue } from 'algosdk/dist/types/abi/abi_type'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { PieoutClient } from '../contracts/Pieout'
import { getAppSubscriber } from './useAlgorandSubscriber'

export type Arc28Event = {
  name: string
  args: Record<string, ABIValue>
  txnId: string
  timestamp: number
}

interface UseAppSubscriberOptions {
  appClient: PieoutClient | undefined
  filterName?: string
  mode?: 'single' | 'batch'
  maxRoundsToSync?: number
  autoRemoveAfterSeconds?: number // total display duration (visible + fade)
  fadeOutDurationSeconds?: number // fade-out duration
}

// Check if we should reset subscriber state (set by AppProvider)
function shouldResetSubscriber(): boolean {
  try {
    const shouldReset = localStorage.getItem('subscriberShouldReset') === 'true'
    if (shouldReset) {
      localStorage.removeItem('subscriberShouldReset')
      consoleLogger.info('[Subscriber] Detected reset flag, will reset state')
    }
    return shouldReset
  } catch (e) {
    return false
  }
}

// --- Reducer (atomic updates for queue + current) to eliminate race conditions
type State = {
  queue: Arc28Event[]
  current: Arc28Event | null
  fadingOutTxnId: string | null
  isRunning: boolean
}

type Action =
  | { type: 'ENQUEUE_EVENTS'; payload: Arc28Event[] }
  | { type: 'SHOW_NEXT' }
  | { type: 'REMOVE_BY_TXN_ID'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'MARK_FADING'; payload: string | null }
  | { type: 'SET_RUNNING'; payload: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ENQUEUE_EVENTS': {
      const newQueue = [...state.queue, ...action.payload]
      // if nothing currently being shown, promote the first queued
      if (!state.current && newQueue.length > 0) {
        const [first, ...rest] = newQueue
        return { ...state, queue: rest, current: first, fadingOutTxnId: null }
      }
      return { ...state, queue: newQueue }
    }
    case 'SHOW_NEXT': {
      if (state.queue.length === 0) return { ...state, current: null, fadingOutTxnId: null }
      const [next, ...rest] = state.queue
      return { ...state, queue: rest, current: next, fadingOutTxnId: null }
    }
    case 'REMOVE_BY_TXN_ID': {
      const q = state.queue.filter((e) => e.txnId !== action.payload)
      const isCurrent = state.current?.txnId === action.payload
      if (isCurrent) {
        if (q.length === 0) return { ...state, queue: [], current: null, fadingOutTxnId: null }
        const [next, ...rest] = q
        return { ...state, queue: rest, current: next, fadingOutTxnId: null }
      }
      return { ...state, queue: q }
    }
    case 'CLEAR_ALL':
      return { ...state, queue: [], current: null, fadingOutTxnId: null }
    case 'MARK_FADING':
      return { ...state, fadingOutTxnId: action.payload }
    case 'SET_RUNNING':
      return { ...state, isRunning: action.payload }
    default:
      return state
  }
}

// --- Main hook
export function useAppSubscriber({
  appClient,
  filterName = 'pieout-filter',
  mode = 'batch',
  maxRoundsToSync = 100,
  autoRemoveAfterSeconds = 9,
  fadeOutDurationSeconds = 1,
}: UseAppSubscriberOptions) {
  // reducer for queue + current to avoid setState races
  const [state, dispatch] = useReducer(reducer, {
    queue: [],
    current: null,
    fadingOutTxnId: null,
    isRunning: false,
  })

  // derived - display all events in array order (current first, then queue)
  const arc28Events = useMemo(() => (state.current ? [state.current, ...state.queue] : [...state.queue]), [state])

  // refs
  const subscriberRef = useRef<AlgorandSubscriber>()
  const isStartedRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentEventRef = useRef<Arc28Event | null>(null)

  // Track current appId to detect changes
  const currentAppIdRef = useRef<string | null>(null)
  const lastUpdatedRef = useRef<number>(0)
  const visibleTimeSeconds = autoRemoveAfterSeconds - fadeOutDurationSeconds

  const appClientRef = useRef<PieoutClient | undefined>(undefined)
  const prevAppIdRef = useRef<string | null>(null)

  useEffect(() => {
    appClientRef.current = appClient
  }, [appClient])

  // --- clear utilities
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      consoleLogger.info(`⏰ Cleared display timer`)
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
      consoleLogger.info(`⏰ Cleared fade timer`)
    }
  }, [])

  // --- lifecycle scheduling for current event
  useEffect(() => {
    const current = state.current
    currentEventRef.current = current

    // clear existing timers
    clearAllTimers()

    if (!current) return
    if (autoRemoveAfterSeconds <= 0) return

    // schedule fade start
    timerRef.current = setTimeout(() => {
      const ce = currentEventRef.current
      if (ce) {
        consoleLogger.info(`⏰ Starting fade-out for event with txnId: ${ce.txnId}`)
        dispatch({ type: 'MARK_FADING', payload: ce.txnId })

        // schedule complete removal after fade
        fadeTimerRef.current = setTimeout(() => {
          consoleLogger.info(`⏰ Removing event with txnId: ${ce.txnId} after fade`)
          dispatch({ type: 'MARK_FADING', payload: null })
          dispatch({ type: 'SHOW_NEXT' })
        }, fadeOutDurationSeconds * 1000)
      }
    }, visibleTimeSeconds * 1000)

    consoleLogger.info(
      `⏰ Scheduled event lifecycle: ${visibleTimeSeconds}s visible + ${fadeOutDurationSeconds}s fade = ${autoRemoveAfterSeconds}s total`,
    )

    return () => {
      clearAllTimers()
    }
  }, [state.current, autoRemoveAfterSeconds, fadeOutDurationSeconds, visibleTimeSeconds, clearAllTimers])

  // --- process incoming transaction
  const processTransaction = useCallback(
    (txn: SubscribedTransaction) => {
      if (!appClient) {
        consoleLogger.info('⚠️ No appClient available, skipping transaction processing')
        return
      }

      consoleLogger.info(`Processing transaction ${txn.id}`, {
        appClientId: appClient.appId,
        hasArc28Events: !!txn.arc28Events?.length,
        arc28EventsCount: txn.arc28Events?.length || 0,
      })

      if (!txn.arc28Events?.length) {
        consoleLogger.info('No ARC28 events found in transaction')
        return
      }

      const newEvents: Arc28Event[] = txn.arc28Events.map((e) => ({
        name: e.eventName,
        args: e.argsByName,
        txnId: txn.id,
        timestamp: Date.now(),
      }))

      dispatch({ type: 'ENQUEUE_EVENTS', payload: newEvents })

      // update lastUpdated timestamp
      lastUpdatedRef.current = Date.now()

      consoleLogger.info(`📊 Queued ${newEvents.length} event(s) from txn ${txn.id}`)
    },
    [appClient],
  )

  // --- remove by txnId
  const clearArc28Event = useCallback((txnId: string) => {
    consoleLogger.info(`🗑️ Removing ARC28 event(s) with txnId: ${txnId}`)
    dispatch({ type: 'REMOVE_BY_TXN_ID', payload: txnId })
  }, [])

  // --- clear all
  const clearAllArc28Events = useCallback(() => {
    consoleLogger.info('🗑️ Clearing all displayed ARC28 events (queue + current)')
    clearAllTimers()
    dispatch({ type: 'CLEAR_ALL' })
  }, [clearAllTimers])

  // --- manual skip
  const clearCurrentAndShowNext = useCallback(() => {
    clearAllTimers()
    dispatch({ type: 'MARK_FADING', payload: null })
    dispatch({ type: 'SHOW_NEXT' })
  }, [clearAllTimers])

  // --- subscriber methods
  const initSubscriber = useCallback((): AlgorandSubscriber | undefined => {
    if (!appClient) return undefined

    consoleLogger.info('🚀 Initializing subscriber for appId:', appClient.appId)

    const subscriber = getAppSubscriber(maxRoundsToSync)

    if (mode === 'single') {
      subscriber.on(filterName, processTransaction)
      consoleLogger.info(`📝 Registered single event listener for filter: ${filterName}`)
    } else {
      subscriber.onBatch(filterName, (txns) => {
        consoleLogger.info(`📦 Processing batch of ${txns.length} transactions`)
        txns.forEach(processTransaction)
      })
      consoleLogger.info(`📝 Registered batch event listener for filter: ${filterName}`)
    }

    return subscriber
  }, [appClient, filterName, maxRoundsToSync, mode, processTransaction])

  const start = useCallback(() => {
    if (isStartedRef.current || !appClient) {
      consoleLogger.info('ℹ️ Subscriber already started or no appClient, ignoring')
      return
    }

    const subscriber = initSubscriber()
    if (!subscriber) return

    try {
      subscriberRef.current = subscriber
      subscriber.start()
      isStartedRef.current = true
      dispatch({ type: 'SET_RUNNING', payload: true })
      consoleLogger.info('✅ Subscriber started successfully for appId:', appClient.appId)
    } catch (error) {
      consoleLogger.error('❌ Failed to start subscriber:', error)
    }
  }, [appClient, initSubscriber])

  const stop = useCallback(() => {
    if (subscriberRef.current && isStartedRef.current) {
      try {
        subscriberRef.current.stop('Stopped by user')
        isStartedRef.current = false
        dispatch({ type: 'SET_RUNNING', payload: false })
        consoleLogger.info('🛑 Subscriber stopped by user')
      } catch (error) {
        consoleLogger.error('❌ Failed to stop subscriber:', error)
      }
    }
  }, [])

  const pollOnce = useCallback(async () => {
    if (!appClient) {
      consoleLogger.info('⚠️ No appClient available for polling')
      return
    }

    // Use existing subscriber if we have one, otherwise create a new one
    let subscriber: AlgorandSubscriber | undefined = subscriberRef.current
    let isTemporary = false

    if (!subscriber) {
      subscriber = initSubscriber()
      if (!subscriber) return

      // Store the temporary subscriber so it can be reused
      subscriberRef.current = subscriber
      isTemporary = true
      consoleLogger.info('📊 Created temporary subscriber for polling')
    }

    try {
      consoleLogger.info(`📊 Polling once for appClient: ${appClient.appId}...`)

      // If this is a temporary subscriber, we need to start it first to register filters
      if (isTemporary) {
        consoleLogger.info('📊 Starting temporary subscriber to register filters...')
        subscriber.start()

        // Poll after starting
        await subscriber.pollOnce()

        // Stop the temporary subscriber but keep the reference
        subscriber.stop('Temporary polling complete')
        consoleLogger.info('📊 Stopped temporary subscriber after polling')
      } else {
        // Use existing subscriber (whether running or stopped)
        await subscriber.pollOnce()
      }

      consoleLogger.info('📊 Poll completed')
    } catch (error) {
      consoleLogger.error('❌ Failed to poll:', error)

      // Clean up temporary subscriber on error
      if (isTemporary && subscriberRef.current) {
        try {
          subscriberRef.current.stop('Polling failed')
        } catch (stopError) {
          consoleLogger.error('❌ Failed to stop temporary subscriber:', stopError)
        }
      }
    }
  }, [appClient, initSubscriber])

  // --- Effects

  // Handle app client changes - load state but don't auto-start
  useEffect(() => {
    const newAppId = appClient?.appId ? String(appClient.appId) : ''

    if (!newAppId) {
      // Clean up if we had an app before
      if (prevAppIdRef.current) {
        consoleLogger.info('[Subscriber] No appClient, cleaning up')
        if (subscriberRef.current && isStartedRef.current) {
          subscriberRef.current.stop('AppClient removed')
          isStartedRef.current = false
          dispatch({ type: 'SET_RUNNING', payload: false })
        }
        dispatch({ type: 'CLEAR_ALL' })
        prevAppIdRef.current = null
        currentAppIdRef.current = null
      }
      return
    }

    if (prevAppIdRef.current === newAppId) {
      consoleLogger.info(`[Subscriber] AppId unchanged (${newAppId}), keeping existing state`)
      return
    }

    consoleLogger.info(`[Subscriber] App transition: ${prevAppIdRef.current || 'none'} → ${newAppId}`)

    // Stop old subscriber
    if (subscriberRef.current && isStartedRef.current) {
      subscriberRef.current.stop('AppClient changed')
      isStartedRef.current = false
      dispatch({ type: 'SET_RUNNING', payload: false })
    }

    // Reset state if needed
    if (shouldResetSubscriber()) {
      consoleLogger.info(`[Subscriber] Resetting state for new app: ${newAppId}`)
      dispatch({ type: 'CLEAR_ALL' })
    }

    currentAppIdRef.current = newAppId
    prevAppIdRef.current = newAppId

    consoleLogger.info(`[Subscriber] Ready for manual control for appId: ${newAppId}`)
  }, [appClient?.appId])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      consoleLogger.info('🧹 useAppSubscriber: Final cleanup on unmount')
      clearAllTimers()
      stop()
    }
  }, [stop, clearAllTimers])

  // final returned API
  return {
    start,
    stop,
    pollOnce,
    clearArc28Events: clearAllArc28Events,
    clearArc28Event,
    arc28Events,
    arc28EventsCount: arc28Events.length,
    currentAppClientId: appClient?.appId.toString() ?? null,
    currentEvent: state.current,
    queueLength: state.queue.length,
    processTransaction,
    clearCurrentAndShowNext,
    fadingOutTxnId: state.fadingOutTxnId,
    setFadingOutTxnId: (txnId: string | null) => dispatch({ type: 'MARK_FADING', payload: txnId }),
    clearFadingOutEvent: () => dispatch({ type: 'MARK_FADING', payload: null }),
    visibleTimeSeconds,
    fadeOutDurationSeconds,
    lastUpdated: lastUpdatedRef.current,
    isRunning: state.isRunning,
  }
}
