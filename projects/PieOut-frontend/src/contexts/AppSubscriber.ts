// src/contexts/AppSubscriber.tsx
import { SubscribedTransaction } from '@algorandfoundation/algokit-subscriber/types/subscription'
import { createContext } from 'react'
import { Arc28Event } from '../hooks/useAppSubscriber' // Import the exported type

export type AppSubscriberEvents = {
  // Event data
  arc28Events: Arc28Event[] // Full history in memory (displayed in array order)
  arc28EventsCount: number // Number of events currently in display queue
  currentAppClientId: string | null // The appId we're subscribed to

  // Drip-specific state
  currentEvent: Arc28Event | null // Event currently displayed
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
  clearArc28Events: () => void // Clear all events in queue + current
  clearArc28Event: (txnId: string) => void // Remove all events from a given txnId

  // Drip controls
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
export const AppSubscriberCtx = createContext<AppSubscriberEvents | undefined>(undefined)
