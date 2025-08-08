import { createContext } from 'react'
import { Arc28Event } from '../hooks/useAppSubscriber' // export this type from the hook file

type AppSubscriberEvents = {
  arc28Events: Arc28Event[]
  arc28EventsCount: number
  start: () => void
  stop: () => void
  pollOnce: () => Promise<void>
  clearArc28Events: () => void
}

// Create the App Subscriber Context
export const AppSubscriberCtx = createContext<AppSubscriberEvents | undefined>(undefined)
