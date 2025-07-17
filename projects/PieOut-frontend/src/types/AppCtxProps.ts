//src/types/AppCtxProps.tsx
import { PieoutClient } from '../contracts/Pieout'
import { PieoutMethods } from '../methods'
import { PieoutMethodHandler } from '../methodHandler'

// Define the App Context Props type
export type AppCtxProps = {
  appClient: PieoutClient | undefined
  appCreator: string | undefined
  appMethods: PieoutMethods | undefined
  appMethodHandler: PieoutMethodHandler | undefined
  getAppClient: () => Promise<PieoutClient>
  isLoading: boolean
}
