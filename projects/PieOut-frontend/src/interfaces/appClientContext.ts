import { PieoutClient } from '../contracts/Pieout'

export interface AppClientContextInterface {
  appClient: PieoutClient | null
  appCreator: string | null
  getAppClient: () => Promise<PieoutClient>
  isLoading: boolean
}
