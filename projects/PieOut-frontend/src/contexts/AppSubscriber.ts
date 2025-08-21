// src/contexts/AppSubscriber.tsx
import { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { createContext } from 'react'
import { Arc28Event } from '../hooks/useAppSubscriber' // Import the exported type

export type AppSubscriberEvents = {
  // Event data
  arc28Events: Arc28Event[] // Full history in memory (can be bounded)
  arc28EventsCount: number // Number of processed events in this session
  totalEventsLogged: number // All-time counter for the current appId
  currentAppClientId: string | null // The appId we’re subscribed to

  // Drip-specific state
  currentEvent: Arc28Event | null // Event currently displayed
  queueLength: number // How many events are waiting to be shown
  fadingOutEventId: number | null // Which event is in fade-out stage

  // Timing configuration
  visibleTimeSeconds: number
  fadeOutDurationSeconds: number

  // Subscriber controls
  start: () => void
  stop: () => void
  pollOnce: () => Promise<void>

  // Event management
  clearArc28Events: () => void // Clear all events in queue + history
  clearArc28Event: (txnId: string) => void // Remove all events from a given txn
  removeArc28Event: (eventId: number) => void // Remove a specific event by ID
  resetEventCounter: () => void // Reset persisted event counter for this appId

  // Drip controls
  clearCurrentAndShowNext: () => void // Skip current event and show next in queue
  setFadingOutEventId: (eventId: number | null) => void // Mark event for fade-out
  clearFadingOutEvent: () => void // Remove fade-out flag

  // Manual transaction processing
  processTransaction: (txn: SubscribedTransaction) => void // Manually inject a txn

  // Persistence/debug info (new)
  processedTxnIds: string[] // From localStorage; used to avoid replays
  lastUpdated: number // Timestamp of last event processed (ms)

  isRunning: boolean
}

// Create the App Subscriber Context
export const AppSubscriberCtx = createContext<AppSubscriberEvents | undefined>(undefined)
