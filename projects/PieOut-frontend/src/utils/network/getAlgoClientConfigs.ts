import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoViteClientConfig, AlgoViteKMDConfig } from '../../interfaces/network'

export function getAlgodConfigFromViteEnvironment(): AlgoViteClientConfig {
  if (!import.meta.env.VITE_ALGOD_SERVER) {
    throw new Error('Attempt to get default algod configuration without specifying VITE_ALGOD_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_ALGOD_SERVER,
    port: import.meta.env.VITE_ALGOD_PORT,
    token: import.meta.env.VITE_ALGOD_TOKEN,
    network: import.meta.env.VITE_ALGOD_NETWORK,
  }
}

export function getIndexerConfigFromViteEnvironment(): AlgoViteClientConfig {
  if (!import.meta.env.VITE_INDEXER_SERVER) {
    throw new Error('Attempt to get default algod configuration without specifying VITE_INDEXER_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_INDEXER_SERVER,
    port: import.meta.env.VITE_INDEXER_PORT,
    token: import.meta.env.VITE_INDEXER_TOKEN,
    network: import.meta.env.VITE_ALGOD_NETWORK,
  }
}

export function getKmdConfigFromViteEnvironment(): AlgoViteKMDConfig {
  if (!import.meta.env.VITE_KMD_SERVER) {
    throw new Error('Attempt to get default kmd configuration without specifying VITE_KMD_SERVER in the environment variables')
  }

  return {
    server: import.meta.env.VITE_KMD_SERVER,
    port: import.meta.env.VITE_KMD_PORT,
    token: import.meta.env.VITE_KMD_TOKEN,
    wallet: import.meta.env.VITE_KMD_WALLET,
    password: import.meta.env.VITE_KMD_PASSWORD,
  }
}

// Uncomment for LocalNet testing
// export function getAlgorandClient(): AlgorandClient {
//   const algodConfig = getAlgodConfigFromViteEnvironment()
//   const indexerConfig = getIndexerConfigFromViteEnvironment()
//   const kmdConfig = getKmdConfigFromViteEnvironment()

//   return AlgorandClient.fromConfig({ algodConfig, indexerConfig, kmdConfig })

// }

export function getAlgorandClient(): AlgorandClient {
  const algorand = AlgorandClient.testNet() // Pick defualtLocalNet() for localnet testing
    // signer: TransactionSigner
    // .setDefaultSigner(signer) // Replace `signer` with your signer instance
    .setDefaultValidityWindow(1000) // Set validity window to 1000 rounds
  return algorand
}
