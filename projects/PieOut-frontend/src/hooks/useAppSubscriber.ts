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

// --- Persistence keys / helpers
const COUNTERS_KEY = (appId: string) => `useAppSubscriber:counters:${appId}`
const PROCESSED_TXNS_KEY = (appId: string) => `useAppSubscriber:processedTxns:${appId}`
const PROCESSED_TXNS_LIMIT = 3000 // keep recent txn ids to avoid unbounded growth

function loadCounter(appId: string): number {
  try {
    const raw = localStorage.getItem(COUNTERS_KEY(appId))
    const counter = raw ? Number(raw) : 0
    consoleLogger.info(`[Subscriber] Loaded counter=${counter} for appId=${appId}`)
    return counter
  } catch (e) {
    consoleLogger.warn('Failed to load counter from localStorage', e)
    return 0
  }
}

function saveCounter(appId: string, val: number) {
  try {
    localStorage.setItem(COUNTERS_KEY(appId), String(val))
    consoleLogger.info(`[Subscriber] Saved counter=${val} for appId=${appId}`)
  } catch (e) {
    consoleLogger.warn('Failed to save counter to localStorage', e)
  }
}

function loadProcessedTxns(appId: string): string[] {
  try {
    const raw = localStorage.getItem(PROCESSED_TXNS_KEY(appId))
    const txns = raw ? JSON.parse(raw) : []
    consoleLogger.info(`[Subscriber] Loaded ${txns.length} processed txns for appId=${appId}`)
    return txns
  } catch (e) {
    consoleLogger.warn('Failed to load processed txns from localStorage', e)
    return []
  }
}

function saveProcessedTxns(appId: string, txns: string[]) {
  try {
    const trimmed = txns.slice(-PROCESSED_TXNS_LIMIT)
    localStorage.setItem(PROCESSED_TXNS_KEY(appId), JSON.stringify(trimmed))
    consoleLogger.info(`[Subscriber] Saved ${trimmed.length} processed txns for appId=${appId}`)
  } catch (e) {
    consoleLogger.warn('Failed to save processed txns to localStorage', e)
  }
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

  // Track current appId to detect changes
  const currentAppIdRef = useRef<string | null>(null)
  const isInitializedRef = useRef(false)

  // persistent runtime structures
  const eventIdCounterRef = useRef<number>(0)
  const processedTxnSetRef = useRef<Set<string>>(new Set())
  const lastUpdatedRef = useRef<number>(0)
  const visibleTimeSeconds = autoRemoveAfterSeconds - fadeOutDurationSeconds

  const appClientRef = useRef<PieoutClient | undefined>(undefined)
  const prevAppIdRef = useRef<string | null>(null)

  useEffect(() => {
    appClientRef.current = appClient
  }, [appClient])

  // --- Load/save state for specific appId
  const loadStateForApp = useCallback((appId: string) => {
    const counter = loadCounter(appId)
    const processedTxns = loadProcessedTxns(appId)

    eventIdCounterRef.current = counter
    processedTxnSetRef.current = new Set(processedTxns)

    consoleLogger.info(`[Subscriber] State loaded for appId=${appId}: counter=${counter}, processedTxns=${processedTxns.length}`)
  }, [])

  const saveStateForApp = useCallback((appId: string) => {
    saveCounter(appId, eventIdCounterRef.current)
    saveProcessedTxns(appId, Array.from(processedTxnSetRef.current))
  }, [])

  // --- counter accessor
  const getNextEventCounter = useCallback((): number => {
    eventIdCounterRef.current = (eventIdCounterRef.current || 0) + 1

    // Save immediately
    if (currentAppIdRef.current) {
      saveCounter(currentAppIdRef.current, eventIdCounterRef.current)
    }

    consoleLogger.info(`📊 Event counter incremented to ${eventIdCounterRef.current} for appClient: ${currentAppIdRef.current}`)
    return eventIdCounterRef.current
  }, [])

  // --- processed txn helpers
  const hasProcessedTxn = useCallback((txnId: string) => processedTxnSetRef.current.has(txnId), [])

  const markTxnProcessed = useCallback((txnId: string) => {
    processedTxnSetRef.current.add(txnId)

    // prune if needed
    if (processedTxnSetRef.current.size > PROCESSED_TXNS_LIMIT) {
      const arr = Array.from(processedTxnSetRef.current).slice(-PROCESSED_TXNS_LIMIT)
      processedTxnSetRef.current = new Set(arr)
    }

    // Save immediately
    if (currentAppIdRef.current) {
      saveProcessedTxns(currentAppIdRef.current, Array.from(processedTxnSetRef.current))
    }
  }, [])

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

      // update lastUpdated timestamp
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

  // --- reset counter (manual)
  const resetEventCounter = useCallback(() => {
    if (!currentAppIdRef.current) {
      consoleLogger.info('⚠️ No current appId to reset counter')
      return
    }

    eventIdCounterRef.current = 0
    processedTxnSetRef.current = new Set()
    saveCounter(currentAppIdRef.current, 0)
    saveProcessedTxns(currentAppIdRef.current, [])
    clearAllArc28Events()

    consoleLogger.info(`🔄 Reset event counter and cleared UI for appId ${currentAppIdRef.current}`)
  }, [clearAllArc28Events])

  // --- subscriber methods
  const initSubscriber = useCallback(() => {
    if (!appClient) return null

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
      consoleLogger.info('✅ Subscriber started successfully for appId:', appClient.appId)
    } catch (error) {
      consoleLogger.error('❌ Failed to start subscriber:', error)
    }
  }, [appClient, initSubscriber])

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
    if (!appClient) {
      consoleLogger.info('⚠️ No appClient available for polling')
      return
    }

    const subscriber = initSubscriber()
    if (!subscriber) return

    consoleLogger.info(`📊 Polling once for appClient: ${appClient.appId}...`)
    await subscriber.pollOnce()
    consoleLogger.info('📊 Poll completed')
  }, [appClient, initSubscriber])

  // --- Effects

  // --- Handle app client changes
  const handleAppClientChange = useCallback(
    (newAppId: string) => {
      const prevAppId = prevAppIdRef.current

      if (!newAppId) {
        // Clean up if we had an app before
        if (prevAppId) {
          consoleLogger.info('[Subscriber] No appClient, cleaning up')
          saveStateForApp(prevAppId)
          if (subscriberRef.current && isStartedRef.current) {
            subscriberRef.current.stop('AppClient removed')
            isStartedRef.current = false
          }
          dispatch({ type: 'CLEAR_ALL' })
          prevAppIdRef.current = null
        }
        return
      }

      if (prevAppId === newAppId) {
        consoleLogger.info(`[Subscriber] AppId unchanged (${newAppId}), keeping existing subscriber`)
        return
      }

      consoleLogger.info(`[Subscriber] App transition: ${prevAppId || 'none'} → ${newAppId}`)

      // Save state for previous app
      if (prevAppId) saveStateForApp(prevAppId)

      // Stop old subscriber
      if (subscriberRef.current && isStartedRef.current) {
        subscriberRef.current.stop('AppClient changed')
        isStartedRef.current = false
      }

      // Reset or load state
      if (shouldResetSubscriber()) {
        consoleLogger.info(`[Subscriber] Resetting state for new app: ${newAppId}`)
        eventIdCounterRef.current = 0
        processedTxnSetRef.current = new Set()
        dispatch({ type: 'CLEAR_ALL' })
        saveCounter(newAppId, 0)
        saveProcessedTxns(newAppId, [])
      } else {
        loadStateForApp(newAppId)
      }

      // Start subscriber
      if (pollOneTime) {
        pollOnce()
      } else {
        start()
      }

      prevAppIdRef.current = newAppId
    },
    [loadStateForApp, saveStateForApp, pollOneTime, pollOnce, start],
  )

  // Handle app client changes
  useEffect(() => {
    const newAppId = appClient?.appId ? String(appClient.appId) : ''
    handleAppClientChange(newAppId)
  }, [appClient?.appId, handleAppClientChange])

  // Initialize and manage subscriber lifecycle
  useEffect(() => {
    if (!appClient) {
      consoleLogger.info('⏭️ No appClient available, deferring subscriber initialization')
      return
    }

    const appId = appClient.appId.toString()
    consoleLogger.info(`🚀 useAppSubscriber: Managing subscriber for appId ${appId}`)

    // Only initialize if we haven't done so for this specific appId
    if (!isInitializedRef.current || currentAppIdRef.current !== appId) {
      isInitializedRef.current = true

      if (pollOneTime) {
        consoleLogger.info('🔄 Starting one-time poll')
        pollOnce()
      } else {
        consoleLogger.info('🔄 Starting continuous subscription')
        start()
      }
    } else {
      // Same appId, just ensure subscriber is running if it should be
      if (!pollOneTime && !isStartedRef.current) {
        consoleLogger.info('🔄 Restarting subscriber for existing appId')
        start()
      }
    }

    // Cleanup function
    return () => {
      // Only save state on unmount if we have a current app
      if (currentAppIdRef.current) {
        saveStateForApp(currentAppIdRef.current)
      }
    }
  }, [appClient, pollOneTime, start, pollOnce, saveStateForApp])

  // Periodic persistence of processed txns (in case lots of txns come in)
  useEffect(() => {
    if (!currentAppIdRef.current) return

    const interval = setInterval(() => {
      if (currentAppIdRef.current) {
        saveProcessedTxns(currentAppIdRef.current, Array.from(processedTxnSetRef.current))
      }
    }, 15_000)

    return () => clearInterval(interval)
  }, [currentAppIdRef.current])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      consoleLogger.info('🧹 useAppSubscriber: Final cleanup on unmount')

      // Save current state before cleanup
      if (currentAppIdRef.current) {
        saveStateForApp(currentAppIdRef.current)
      }

      clearAllTimers()
      stop()
    }
  }, [stop, clearAllTimers, saveStateForApp])

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
    processedTxnIds: Array.from(processedTxnSetRef.current),
    lastUpdated: lastUpdatedRef.current,
  }
}
