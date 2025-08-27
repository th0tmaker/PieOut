//src/hooks/useAlgorandSubscriber.ts
import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import { algorand } from '../utils/network/getAlgorandClient'

// Define the arc28 events expected to be emitted by the smart contract application
const pieoutEvents = {
  groupName: 'pieout',
  events: [
    {
      name: 'game_live',
      args: [
        { name: 'game_id', type: 'uint64' },
        { name: 'staking_finalized', type: 'bool' },
        { name: 'expiry_ts', type: 'uint64' },
      ],
    },
    {
      name: 'player_score',
      args: [
        { name: 'game_id', type: 'uint64' },
        { name: 'player', type: 'address' },
        { name: 'score', type: 'uint8' },
      ],
    },
    {
      name: 'game_over',
      args: [
        { name: 'game_id', type: 'uint64' },
        { name: 'first_place_score', type: 'uint8' },
        { name: 'second_place_score', type: 'uint8' },
        { name: 'third_place_score', type: 'uint8' },
        { name: 'first_place_address', type: 'address' },
        { name: 'second_place_address', type: 'address' },
        { name: 'third_place_address', type: 'address' },
      ],
    },
  ],
  continueOnError: false,
}

// Create a function that will return a new instance of the `AlgorandSubscriber` class with custom configuration
let watermark = 0n // Define a watermark value for subscriber synchronization
export function getAppSubscriber(maxRoundsToSync: number) {
  return new AlgorandSubscriber(
    {
      filters: [
        {
          name: 'pieout-filter',
          filter: {
            // appId: 1001n, // LocalNet testing
            // appId: 744886519n,
            arc28Events: pieoutEvents.events.map((event) => ({
              groupName: pieoutEvents.groupName,
              eventName: event.name,
            })),
          },
        },
      ],
      arc28Events: [
        {
          groupName: pieoutEvents.groupName,
          events: pieoutEvents.events,
          continueOnError: pieoutEvents.continueOnError ?? false,
        },
      ],
      // waitForBlockWhenAtTip: true,
      syncBehaviour: 'sync-oldest-start-now',
      frequencyInSeconds: 20,
      maxRoundsToSync: maxRoundsToSync,
      watermarkPersistence: {
        get: async () => watermark,
        set: async (newWatermark) => {
          watermark = newWatermark
        },
      },
    },
    algorand.client.algod,
    algorand.client.indexer,
  )
}
