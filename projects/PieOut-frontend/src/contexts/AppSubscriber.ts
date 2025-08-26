//src/contexts/AppSubscriber.tsx
import { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { createContext } from 'react'
import { GameEvent } from '../types/GameEventProps'

export type AppSubscriberHandler = {
  // Event data
  gameEvents: GameEvent[] // Full history in memory (displayed in array order)
  gameEventsCount: number // Number of events currently in display queue
  currentAppClientId: string | null // The appId we're subscribed to

  // Event states
  currentEvent: GameEvent | null // Event currently displayed
  queueLength: number // How many events are waiting to be shown
  fadingOutTxnId: string | null // Which event txnId is in fade-out stage

  // Timing configuration
  visibleTimeSeconds: number
  fadeOutDurationSeconds: number

  // Subscriber controls
  start: () => void
  stop: () => void
  pollOnce: () => Promise<void>

  // Event management
  clearGameEvent: (txnId: string) => void // Remove all events from a given txnId
  clearAllGameEvents: () => void // Clear all events in queue + current

  // Event controls
  clearCurrentAndShowNext: () => void // Skip current event and show next in queue
  setFadingOutTxnId: (txnId: string | null) => void // Mark event for fade-out by txnId
  clearFadingOutEvent: () => void // Remove fade-out flag

  // Manual transaction processing
  processTransaction: (txn: SubscribedTransaction) => void // Manually inject a txn

  // Debug info
  lastUpdated: number // Timestamp of last event processed (ms)
  isRunning: boolean
}

// Create the App Subscriber Context
export const AppSubscriberCtx = createContext<AppSubscriberHandler | undefined>(undefined)
