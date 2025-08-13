import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { ABIValue } from 'algosdk/dist/types/abi/abi_type'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { PieoutClient } from '../contracts/Pieout'
import { getAppSubscriber } from './useAlgorandSubscriber'

// --- Types
export type Arc28Event = {
  eventId: number // Sequential counter for this appClient (never changes once assigned)
  name: string
  args: Record<string, ABIValue>
  txnId: string
  timestamp: number // milliseconds when the event was created/received
}

interface UseAppSubscriberOptions {
  appClient: PieoutClient | undefined
  filterName?: string
  mode?: 'single' | 'batch'
  maxRoundsToSync?: number
  pollOneTime?: boolean
  autoRemoveAfterSeconds?: number // total display duration (visible + fade)
  fadeOutDurationSeconds?: number // fade-out duration
}

// --- Persistence keys / helpers (localStorage)
const COUNTERS_KEY = (appId: string) => `useAppSubscriber:counters:${appId}`
const PROCESSED_TXNS_KEY = (appId: string) => `useAppSubscriber:processedTxns:${appId}`
const PROCESSED_TXNS_LIMIT = 3000 // keep recent txn ids to avoid unbounded growth

function loadCounter(appClient: PieoutClient | undefined, currentAppClient?: PieoutClient): number {
  // Case: No appClient → do nothing
  if (!appClient) return 0

  // Case: appClient exists but no previous one → treat as first load → return 0
  if (!currentAppClient) return 0

  // Case: appClient exists but is different from previous → skip loading
  if (appClient !== currentAppClient) return 0

  // Case: Same appClient as before → try loading from localStorage
  try {
    const raw = localStorage.getItem(COUNTERS_KEY(appClient.appId.toString()))
    return Number(raw)
  } catch (e) {
    consoleLogger.warn('Failed to load counter from localStorage', e)
    return 0
  }
}

function saveCounter(appClient: PieoutClient | undefined, val: number) {
  if (!appClient) return // No appClient → do nothing

  try {
    localStorage.setItem(COUNTERS_KEY(appClient.appId.toString()), String(val))
  } catch (e) {
    consoleLogger.warn('Failed to save counter to localStorage', e)
  }
}

function loadProcessedTxns(appClient: PieoutClient | undefined, prevAppClient?: PieoutClient): string[] {
  // Case: No appClient → do nothing
  if (!appClient) return []

  // Case: First appClient ever → return empty
  if (!prevAppClient) return []

  // Case: Different appClient → skip loading
  if (appClient !== prevAppClient) return []

  // Case: Same appClient → load from localStorage
  try {
    const raw = localStorage.getItem(PROCESSED_TXNS_KEY(appClient.appId.toString()))
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    consoleLogger.warn('Failed to load processed txns from localStorage', e)
    return []
  }
}

function saveProcessedTxns(appClient: PieoutClient | undefined, txns: string[]) {
  if (!appClient) return // No appClient → do nothing

  try {
    const trimmed = txns.slice(-PROCESSED_TXNS_LIMIT)
    localStorage.setItem(PROCESSED_TXNS_KEY(appClient.appId.toString()), JSON.stringify(trimmed))
  } catch (e) {
    consoleLogger.warn('Failed to save processed txns to localStorage', e)
  }
}

// --- Reducer (atomic updates for queue + current) to eliminate race conditions
type State = {
  queue: Arc28Event[]
  current: Arc28Event | null
  fadingOutId: number | null
}

type Action =
  | { type: 'ENQUEUE_EVENTS'; payload: Arc28Event[] }
  | { type: 'SHOW_NEXT' }
  | { type: 'REMOVE_BY_EVENT_ID'; payload: number }
  | { type: 'REMOVE_BY_TXN_ID'; payload: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'MARK_FADING'; payload: number | null }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ENQUEUE_EVENTS': {
      const newQueue = [...state.queue, ...action.payload]
      // if nothing currently being shown, promote the first queued
      if (!state.current && newQueue.length > 0) {
        const [first, ...rest] = newQueue
        return { queue: rest, current: first, fadingOutId: null }
      }
      return { ...state, queue: newQueue }
    }
    case 'SHOW_NEXT': {
      if (state.queue.length === 0) return { queue: [], current: null, fadingOutId: null }
      const [next, ...rest] = state.queue
      return { queue: rest, current: next, fadingOutId: null }
    }
    case 'REMOVE_BY_EVENT_ID': {
      const q = state.queue.filter((e) => e.eventId !== action.payload)
      const isCurrent = state.current?.eventId === action.payload
      if (isCurrent) {
        // promote next
        if (q.length === 0) return { queue: [], current: null, fadingOutId: null }
        const [next, ...rest] = q
        return { queue: rest, current: next, fadingOutId: null }
      }
      return { ...state, queue: q }
    }
    case 'REMOVE_BY_TXN_ID': {
      const q = state.queue.filter((e) => e.txnId !== action.payload)
      const isCurrent = state.current?.txnId === action.payload
      if (isCurrent) {
        if (q.length === 0) return { queue: [], current: null, fadingOutId: null }
        const [next, ...rest] = q
        return { queue: rest, current: next, fadingOutId: null }
      }
      return { ...state, queue: q }
    }
    case 'CLEAR_ALL':
      return { queue: [], current: null, fadingOutId: null }
    case 'MARK_FADING':
      return { ...state, fadingOutId: action.payload }
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
  pollOneTime = false,
  autoRemoveAfterSeconds = 9,
  fadeOutDurationSeconds = 1,
}: UseAppSubscriberOptions) {
  // reducer for queue + current to avoid setState races
  const [state, dispatch] = useReducer(reducer, { queue: [], current: null, fadingOutId: null })

  // derived
  const arc28Events = useMemo(() => (state.current ? [state.current, ...state.queue] : [...state.queue]), [state])

  // refs
  const subscriberRef = useRef<AlgorandSubscriber>()
  const isStartedRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentEventRef = useRef<Arc28Event | null>(null)
  const appClientRef = useRef<PieoutClient | undefined>(undefined)

  // persistent runtime structures
  const eventIdCounterRef = useRef<number>(0)
  const processedTxnSetRef = useRef<Set<string>>(new Set())
  const lastUpdatedRef = useRef<number>(0)
  const visibleTimeSeconds = autoRemoveAfterSeconds - fadeOutDurationSeconds

  // --- persistence load on app change
  useEffect(() => {
    if (!appClient) return

    // Same appClient as before → load from localStorage
    if (appClientRef.current && appClientRef.current.appId === appClient.appId) {
      const c = loadCounter(appClient, appClientRef.current)
      eventIdCounterRef.current = c
      consoleLogger.info(`Loaded counter=${c} for appClient ${appClient.appId}`)

      const processed = loadProcessedTxns(appClient, appClientRef.current)
      processedTxnSetRef.current = new Set(processed)
      consoleLogger.info(`Loaded ${processed.length} processed txn ids for appClient ${appClient.appId}`)
    } else {
      // Different or first appClient → reset
      eventIdCounterRef.current = 0
      processedTxnSetRef.current = new Set()
      consoleLogger.info(`Reset counter & processed txns for new appClient ${appClient.appId}`)
    }

    // Update appClientRef.current after handling
    appClientRef.current = appClient
  }, [appClient])

  // --- save counter when changed
  const persistCounter = useCallback(() => {
    if (!appClient) return // No client → don't persist
    try {
      saveCounter(appClient, eventIdCounterRef.current)
    } catch (e) {
      consoleLogger.warn('persistCounter failed', e)
    }
  }, [appClient])

  // --- save processed txns periodically
  const persistProcessedTxns = useCallback(() => {
    if (!appClient) return // No client → don't persist
    try {
      saveProcessedTxns(appClient, Array.from(processedTxnSetRef.current))
    } catch (e) {
      consoleLogger.warn('persistProcessedTxns failed', e)
    }
  }, [appClient])

  // --- counter accessor
  const getNextEventCounter = useCallback((): number => {
    if (!appClient) return 0

    eventIdCounterRef.current = (eventIdCounterRef.current || 0) + 1

    persistCounter()

    consoleLogger.info(`📊 Event counter incremented to ${eventIdCounterRef.current} for appClient: ${appClient.appId}`)

    return eventIdCounterRef.current
  }, [appClient, persistCounter])

  // --- processed txn helpers
  const hasProcessedTxn = useCallback((txnId: string) => processedTxnSetRef.current.has(txnId), [])
  const markTxnProcessed = useCallback(
    (txnId: string) => {
      if (!appClient) return

      processedTxnSetRef.current.add(txnId)

      // prune if needed
      if (processedTxnSetRef.current.size > PROCESSED_TXNS_LIMIT) {
        // naive prune: keep last N
        const arr = Array.from(processedTxnSetRef.current).slice(-PROCESSED_TXNS_LIMIT)
        processedTxnSetRef.current = new Set(arr)
      }

      persistProcessedTxns()
    },
    [appClient, persistProcessedTxns],
  )

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
        consoleLogger.info(`⏰ Starting fade-out for event #${ce.eventId}`)
        dispatch({ type: 'MARK_FADING', payload: ce.eventId })

        // schedule complete removal after fade
        fadeTimerRef.current = setTimeout(() => {
          consoleLogger.info(`⏰ Removing event #${ce.eventId} after fade`)
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

  // --- process incoming transaction (robust dedupe + per-event indexing)
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

      if (hasProcessedTxn(txn.id)) {
        consoleLogger.info(`Skipping already-processed txn ${txn.id}`)
        return
      }

      const newEvents: Arc28Event[] = txn.arc28Events.map((e) => ({
        eventId: getNextEventCounter(),
        name: e.eventName,
        args: e.argsByName,
        txnId: txn.id,
        timestamp: Date.now(),
      }))

      dispatch({ type: 'ENQUEUE_EVENTS', payload: newEvents })
      markTxnProcessed(txn.id)

      // ✅ update lastUpdated timestamp
      lastUpdatedRef.current = Date.now()

      consoleLogger.info(`📊 Queued ${newEvents.length} event(s) from txn ${txn.id}`)
    },
    [appClient, getNextEventCounter, hasProcessedTxn, markTxnProcessed],
  )

  // --- remove by eventId
  const removeArc28Event = useCallback((eventId: number) => {
    consoleLogger.info(`🗑️ Removing event #${eventId}`)
    dispatch({ type: 'REMOVE_BY_EVENT_ID', payload: eventId })
  }, [])

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

  // --- counters / reset
  const resetEventCounter = useCallback(() => {
    if (!appClient) {
      consoleLogger.info('⚠️ No appClient available to reset counter')
      return
    }

    eventIdCounterRef.current = 0
    persistCounter()
    clearAllArc28Events()

    consoleLogger.info(`🔄 Reset event counter and cleared UI for appClient ${appClient.appId}`)
  }, [appClient, persistCounter, clearAllArc28Events])

  // --- subscriber lifecycle
  const cleanupSubscriber = useCallback(() => {
    if (subscriberRef.current && isStartedRef.current) {
      try {
        subscriberRef.current.stop('Stopped for appClient change')
        consoleLogger.info('🛑 Subscriber stopped for cleanup')
      } catch (error) {
        consoleLogger.error('❌ Failed to stop subscriber during cleanup:', error)
      }
    }
    subscriberRef.current = undefined
    isStartedRef.current = false
    consoleLogger.info('🧹 Subscriber completely cleaned up')
  }, [])

  const handleAppClientChange = useCallback(() => {
    const prevAppClient = appClientRef.current
    const newAppClient = appClient // current instance

    // Case 1: No client now
    if (!newAppClient) {
      if (prevAppClient) {
        consoleLogger.info('🔄 AppClient became undefined, stopping subscriber')
        cleanupSubscriber()
        clearAllArc28Events()
        appClientRef.current = undefined
      }
      return
    }

    // Case 2: Same client instance — do nothing
    if (newAppClient === prevAppClient) {
      return
    }

    // Case 3: New client instance (or first client ever)
    consoleLogger.info(`🔄 AppClient ${prevAppClient ? 'changed' : 'initialized'} → resetting counter & restarting subscriber`)

    resetEventCounter() // start counter at 0
    cleanupSubscriber()
    clearAllArc28Events()

    // Load persisted data only if this is the same client as before
    processedTxnSetRef.current = new Set(loadProcessedTxns(newAppClient, prevAppClient))
    eventIdCounterRef.current = loadCounter(newAppClient, prevAppClient)

    appClientRef.current = newAppClient
  }, [appClient, cleanupSubscriber, clearAllArc28Events, resetEventCounter])

  const initSubscriber = useCallback(() => {
    consoleLogger.info('🚀 Initializing NEW subscriber with options:', {
      appClientId: appClient?.appId,
      filterName,
      mode,
      maxRoundsToSync,
      pollOneTime,
    })

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

    subscriberRef.current = subscriber
    return subscriber
  }, [appClient?.appId, filterName, maxRoundsToSync, mode, processTransaction, pollOneTime])

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
    if (!appClient?.appId) {
      consoleLogger.info('⚠️ No appClient available for polling')
      return
    }

    const subscriber = initSubscriber()
    consoleLogger.info(`📊 Polling once for appClient: ${appClient.appId}...`)
    await subscriber.pollOnce()
    consoleLogger.info('📊 Poll completed')
  }, [appClient?.appId, initSubscriber])

  // --- Effects

  // respond to appClient change
  useEffect(() => {
    handleAppClientChange()
    consoleLogger.info('handleAAAPPchange')
  }, [handleAppClientChange])

  // initialize subscriber when appClient available
  useEffect(() => {
    if (!appClient?.appId) {
      consoleLogger.info('⏭️ No appClient available, deferring subscriber initialization')
      return
    }

    consoleLogger.info(`🚀 useAppSubscriber: Initializing for appClient ${appClient.appId}`)

    if (pollOneTime) {
      consoleLogger.info('🔄 Starting one-time poll')
      pollOnce()
    } else {
      consoleLogger.info('🔄 Starting continuous subscription')
      start()
    }
  }, [appClient?.appId, pollOneTime, start, stop, pollOnce])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      consoleLogger.info('🧹 useAppSubscriber: Final cleanup on unmount')
      clearAllTimers()
      stop()
    }
  }, [stop, clearAllTimers])

  // periodic persistence of processed txns (in case lots of txns come in)
  useEffect(() => {
    if (!appClient) return

    const interval = setInterval(() => {
      persistProcessedTxns()
    }, 15_000)

    return () => clearInterval(interval)
  }, [appClient, persistProcessedTxns])

  // final returned API
  return {
    start,
    stop,
    pollOnce,
    clearArc28Events: clearAllArc28Events,
    clearArc28Event,
    removeArc28Event,
    resetEventCounter,
    arc28Events,
    arc28EventsCount: arc28Events.length,
    totalEventsLogged: eventIdCounterRef.current,
    currentAppClientId: appClient?.appId.toString() ?? null,
    currentEvent: state.current,
    queueLength: state.queue.length,
    processTransaction,
    clearCurrentAndShowNext,
    fadingOutEventId: state.fadingOutId,
    setFadingOutEventId: (id: number | null) => dispatch({ type: 'MARK_FADING', payload: id }),
    clearFadingOutEvent: () => dispatch({ type: 'MARK_FADING', payload: null }),
    visibleTimeSeconds,
    fadeOutDurationSeconds,

    // ✅ add missing fields for AppSubscriberEvents type
    processedTxnIds: Array.from(processedTxnSetRef.current),
    lastUpdated: lastUpdatedRef.current,
  }
}
