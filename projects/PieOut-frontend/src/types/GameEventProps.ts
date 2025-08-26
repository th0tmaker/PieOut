//src/types/GameEventProps.ts
import { ABIValue } from 'algosdk/dist/types/abi/abi_type'

// Define a type structure that will store the relevant data for each game event
export type GameEvent = {
  name: string
  args: Record<string, ABIValue>
  txnId: string
  timestamp: number
}
