import { PieoutClient } from '../contracts/Pieout'

export interface AppSubscriberProps {
  appClient: PieoutClient | undefined
  filterName?: string
  mode?: 'single' | 'batch'
  maxRoundsToSync?: number
  autoRemoveAfterSeconds?: number
  fadeOutDurationSeconds?: number
}
