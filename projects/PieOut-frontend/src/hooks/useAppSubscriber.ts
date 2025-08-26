//src/hooks/useAppSubscriber.ts
import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { getAppSubscriber } from './useAlgorandSubscriber'
import { AppSubscriberProps } from '../interfaces/appSubscriber'
import { GameEvent } from '../types/GameEventProps'

// Define a State type that will maintain atomic updates for to avoid race conditions
type State = {
  queue: GameEvent[] // Events waiting to be displayed
  current: GameEvent | null // Event currently being displayed
  fadingOutTxnId: string | null // Transaction ID that is fading out (for UI)
  isRunning: boolean // Whether the subscriber is actively running
}

// Define an Action type that the subscriber reducer can handle to update the event queue and current event
type Action =
  | { type: 'ENQUEUE_EVENTS'; payload: GameEvent[] } // Add events to the queue
  | { type: 'SHOW_NEXT' } // Move to next event in the queue
  | { type: 'REMOVE_BY_TXN_ID'; payload: string } // Remove event by transaction ID
  | { type: 'CLEAR_ALL' } // Clear all events
  | { type: 'MARK_FADING'; payload: string | null } // Mark an event as fading out
  | { type: 'SET_RUNNING'; payload: boolean } // Start/stop the subscriber

// Reducer function to handle state transitions for subscriber events
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

// Check localStorage flag to determine if the subscriber state should be reset
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

// Define the main hook for the application subscriber
export function useAppSubscriber({
  appClient,
  filterName = 'pieout-filter',
  mode = 'batch',
  maxRoundsToSync = 100,
  autoRemoveAfterSeconds = 9,
  fadeOutDurationSeconds = 1,
}: AppSubscriberProps) {
  // Reducer managing event queue and current event to avoid setState race conditions
  const [state, dispatch] = useReducer(reducer, {
    queue: [],
    current: null,
    fadingOutTxnId: null,
    isRunning: false,
  })

  // Memos
  // Derived array of all events to display: current first, then queued
  const gameEvents = useMemo(() => (state.current ? [state.current, ...state.queue] : [...state.queue]), [state])

  // Refs
  const subscriberRef = useRef<AlgorandSubscriber>()
  const isRunningRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentEventRef = useRef<GameEvent | null>(null)
  const currentAppIdRef = useRef<string | null>(null)
  const prevAppIdRef = useRef<string | null>(null)
  const lastUpdatedRef = useRef<number>(0)

  // Define a number that will represent the amount of time in seconds the event displayed will be visible on screen
  const visibleTimeSeconds = autoRemoveAfterSeconds - fadeOutDurationSeconds

  // Clear both display and fade timers to prevent overlapping timeouts
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      // consoleLogger.info(`Cleared display timer`)
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = null
      // consoleLogger.info(`Cleared fade timer`)
    }
  }, [])

  // Effect to manage the lifecycle of the current event (display + fade-out + removal)
  useEffect(() => {
    const current = state.current
    currentEventRef.current = current

    // Clear any existing timers before scheduling new ones
    clearAllTimers()

    // If no current event or auto-remove disabled, exit early
    if (!current) return
    if (autoRemoveAfterSeconds <= 0) return

    // Schedule the start of the fade-out after the visible period
    timerRef.current = setTimeout(() => {
      const ce = currentEventRef.current
      if (ce) {
        // Mark the current event as fading (for UI effects)
        // consoleLogger.info(`Starting fade-out for event with txnId: ${ce.txnId}`)
        dispatch({ type: 'MARK_FADING', payload: ce.txnId })

        // Schedule the complete removal of the event after the fade-out duration
        fadeTimerRef.current = setTimeout(() => {
          // consoleLogger.info(`Removing event with txnId: ${ce.txnId} after fade`)
          dispatch({ type: 'MARK_FADING', payload: null })
          dispatch({ type: 'SHOW_NEXT' })
        }, fadeOutDurationSeconds * 1000)
      }
    }, visibleTimeSeconds * 1000)

    // consoleLogger.info(
    //   `Scheduled event lifecycle: ${visibleTimeSeconds}s visible + ${fadeOutDurationSeconds}s fade = ${autoRemoveAfterSeconds}s total`,
    // )

    // Return cleanup function to clear timers if the effect re-runs or component unmounts
    return () => {
      clearAllTimers()
    }
  }, [state.current, autoRemoveAfterSeconds, fadeOutDurationSeconds, visibleTimeSeconds, clearAllTimers])

  // Process a subscribed transaction and, if available, enqueue any arc28 events for display
  const processTransaction = useCallback(
    (txn: SubscribedTransaction) => {
      // If no app client available, return early
      if (!appClient) {
        // consoleLogger.info('No appClient available, skipping transaction processing')
        return
      }

      // consoleLogger.info(`Processing transaction ${txn.id}`, {
      //   appClientId: appClient.appId,
      //   hasArc28Events: !!txn.arc28Events?.length,
      //   arc28EventsCount: txn.arc28Events?.length || 0,
      // })

      // If the transaction does not contain any Arc28 events, return early
      if (!txn.arc28Events?.length) {
        consoleLogger.info('No ARC28 events found in transaction')
        return
      }

      // Convert each Arc28 event into a GameEvent object for the subscriber queue
      const newEvents: GameEvent[] = txn.arc28Events.map((e) => ({
        name: e.eventName,
        args: e.argsByName,
        txnId: txn.id,
        timestamp: Date.now(),
      }))

      // Dispatch the new events to the reducer queue
      dispatch({ type: 'ENQUEUE_EVENTS', payload: newEvents })

      // Update the last-updated timestamp for tracking
      lastUpdatedRef.current = Date.now()

      // consoleLogger.info(`Queued ${newEvents.length} event(s) from txn ${txn.id}`)
    },
    [appClient],
  )

  // Clear a game event from the queue by referencing its transaction id
  const clearGameEvent = useCallback((txnId: string) => {
    // consoleLogger.info(`Removing Game event(s) with txnId: ${txnId}`)
    dispatch({ type: 'REMOVE_BY_TXN_ID', payload: txnId })
  }, [])

  // Clear all game events from the queue
  const clearAllGameEvents = useCallback(() => {
    // consoleLogger.info('Clearing all displayed game events (queue + current)')
    clearAllTimers()
    dispatch({ type: 'CLEAR_ALL' })
  }, [clearAllTimers])

  // Clear current game event and show next one
  const clearCurrentAndShowNext = useCallback(() => {
    clearAllTimers()
    dispatch({ type: 'MARK_FADING', payload: null })
    dispatch({ type: 'SHOW_NEXT' })
  }, [clearAllTimers])

  // Subscriber handlers
  // Create a method that initializes the app subscriber
  const initSubscriber = useCallback((): AlgorandSubscriber | undefined => {
    // If no app client available, return early
    if (!appClient) return undefined

    // consoleLogger.info('Initializing subscriber for appId:', appClient.appId)

    // Get subscriber instance
    const subscriber = getAppSubscriber(maxRoundsToSync)

    // If subscriber register mode is 'single', call the subscriber.on method
    if (mode === 'single') {
      subscriber.on(filterName, processTransaction)
      // consoleLogger.info(`Registered single event listener for filter: ${filterName}`)
      // Else, if subscriber register mode is 'onBatch', call the subscriber.onBatch method
    } else {
      subscriber.onBatch(filterName, (txns) => {
        // consoleLogger.info(`Processing batch of ${txns.length} transactions`)
        txns.forEach(processTransaction)
      })
      // consoleLogger.info(`Registered batch event listener for filter: ${filterName}`)
    }

    // Return the subscriber instance
    return subscriber
  }, [appClient, filterName, maxRoundsToSync, mode, processTransaction])

  // Initialize the subscriber and start polling indefinitely
  const start = useCallback(() => {
    // If subscriber is already starter or app client doesn't exist, return early
    if (isRunningRef.current || !appClient) {
      // consoleLogger.info('Subscriber already started or no appClient, ignoring')
      return
    }

    // Initialize subscriber
    const subscriber = initSubscriber()

    // If initialization failed, return early
    if (!subscriber) return

    // Try block
    try {
      // Store subscriber as current subscriber reference
      subscriberRef.current = subscriber

      // Start the subscriber
      subscriber.start()

      // Set is subscriber running reference flag to true
      isRunningRef.current = true

      // Dispatch event that signals subscriber is running
      dispatch({ type: 'SET_RUNNING', payload: true })
      // consoleLogger.info('Subscriber started successfully for appId:', appClient.appId)
    } catch (error) {
      // consoleLogger.error('Failed to start subscriber:', error)
    }
  }, [appClient, initSubscriber])

  // Stop the subscriber from polling indefinitely
  const stop = useCallback(() => {
    // If a subscriber reference exists and the subscriber is running
    if (subscriberRef.current && isRunningRef.current) {
      // Try block
      try {
        // Stop the subscriber through its reference
        subscriberRef.current.stop('Stopped by user')
        // Set subscriber is running flag to false
        isRunningRef.current = false
        // Dispatch even that signals subscriber is not running
        dispatch({ type: 'SET_RUNNING', payload: false })
        // consoleLogger.info('Subscriber stopped by user')
      } catch (error) {
        // consoleLogger.error('Failed to stop subscriber:', error)
      }
    }
  }, [])

  // Only poll the subscriber results once
  const pollOnce = useCallback(async () => {
    // If no app client exists, return early
    if (!appClient) {
      // consoleLogger.info('No appClient available for polling')
      return
    }

    // Use existing subscriber if we have one, otherwise create a new one
    let subscriber: AlgorandSubscriber | undefined = subscriberRef.current
    let isTemporary = false

    // If no subscriber found, initialize new one
    if (!subscriber) {
      subscriber = initSubscriber()

      // If subscriber initalization failed, return early
      if (!subscriber) return

      // Store the temporary subscriber so it can be reused
      subscriberRef.current = subscriber
      isTemporary = true
      // consoleLogger.info('Created temporary subscriber for polling')
    }

    // Try block
    try {
      // consoleLogger.info(`Polling once for appClient: ${appClient.appId}...`)

      // If this is a temporary subscriber, we need to start it first to register filters
      if (isTemporary) {
        // consoleLogger.info('Starting temporary subscriber to register filters...')
        subscriber.start()

        // Poll after starting
        await subscriber.pollOnce()

        // Stop the temporary subscriber but keep the reference
        subscriber.stop('Temporary polling complete')
        // consoleLogger.info('Stopped temporary subscriber after polling')
      } else {
        // Use existing subscriber (whether running or stopped)
        await subscriber.pollOnce()
      }

      // consoleLogger.info('Poll completed')
    } catch (error) {
      consoleLogger.error('Failed to poll:', error)

      // Clean up temporary subscriber on error
      if (isTemporary && subscriberRef.current) {
        try {
          subscriberRef.current.stop('Polling failed')
        } catch (stopError) {
          consoleLogger.error('Failed to stop temporary subscriber:', stopError)
        }
      }
    }
  }, [appClient, initSubscriber])

  // Effects
  // Determine what to do with subscriber when app client value changes
  useEffect(() => {
    const newAppId = appClient?.appId ? String(appClient.appId) : ''

    if (!newAppId) {
      // Clean up if we had an app before
      if (prevAppIdRef.current) {
        // consoleLogger.info('[Subscriber] No appClient, cleaning up')
        if (subscriberRef.current && isRunningRef.current) {
          subscriberRef.current.stop('AppClient removed')
          isRunningRef.current = false
          dispatch({ type: 'SET_RUNNING', payload: false })
        }
        dispatch({ type: 'CLEAR_ALL' })
        prevAppIdRef.current = null
        currentAppIdRef.current = null
      }
      return
    }

    if (prevAppIdRef.current === newAppId) {
      // consoleLogger.info(`[Subscriber] AppId unchanged (${newAppId}), keeping existing state`)
      return
    }

    // consoleLogger.info(`[Subscriber] App transition: ${prevAppIdRef.current || 'none'} → ${newAppId}`)

    // Stop old subscriber
    if (subscriberRef.current && isRunningRef.current) {
      subscriberRef.current.stop('AppClient changed')
      isRunningRef.current = false
      dispatch({ type: 'SET_RUNNING', payload: false })
    }

    // Reset state if needed
    if (shouldResetSubscriber()) {
      // consoleLogger.info(`[Subscriber] Resetting state for new app: ${newAppId}`)
      dispatch({ type: 'CLEAR_ALL' })
    }

    currentAppIdRef.current = newAppId
    prevAppIdRef.current = newAppId

    // consoleLogger.info(`[Subscriber] Ready for manual control for appId: ${newAppId}`)
  }, [appClient?.appId])

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      // consoleLogger.info('useAppSubscriber: Final cleanup on unmount')
      clearAllTimers()
      stop()
    }
  }, [stop, clearAllTimers])

  // Final hook return
  return {
    start,
    stop,
    pollOnce,
    clearAllGameEvents,
    clearGameEvent,
    gameEvents,
    gameEventsCount: gameEvents.length,
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
