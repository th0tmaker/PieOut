//src/utils/network/getAlgorandClient.ts
// import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { getAlgorandClient } from './getAlgoClientConfigs'

export const algorand = getAlgorandClient()

// Run async network check on startup
// ;(async () => {
//   const client = algorand.client

//   const isLocalNet = await client.isLocalNet()
//   const isTestNet = await client.isTestNet()
//   const isMainNet = await client.isMainNet()

//   consoleLogger.info(`isLocalNet: ${isLocalNet}`)
//   consoleLogger.info(`isTestNet: ${isTestNet}`)
//   consoleLogger.info(`isMainNet: ${isMainNet}`)
// })()
