import { PieoutMethods } from '../methods'
import { PieoutMethodHandler } from '../pieoutMethodHandler'

export interface AppMethodKitContextInterface {
  handler: PieoutMethodHandler | null
  methods: PieoutMethods | null
  isLoading: boolean
}
