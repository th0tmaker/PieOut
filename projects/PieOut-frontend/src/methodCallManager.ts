import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'
import { BoxCommitRand } from './contexts/BoxCommitRandContext'

type MethodType =
  | 'deployApp'
  | 'generateApp'
  | 'terminateApp'
  | 'readGenUnix'
  | 'readGameState'
  | 'readGamePlayers'
  | 'readBoxCommitRand'
  | 'mintTrophy'
  | 'claimTrophy'
  | 'newGame'
  | 'joinGame'
  | 'playGame'
  | 'resetGame'
  | 'deleteGame'
  | 'getBoxCommitRand'
  | 'setBoxCommitRand'
  | 'delBoxCommitRandForSelf'
  | 'delBoxCommitRandForOther'
  | 'triggerGameProg'

interface MethodParams {
  activeAddress: string | null
  appMethods: PieoutMethods
  appClient: PieoutClient
  getAppClient?: () => Promise<void>
  setBoxTrophyData?: (data: { assetId: string; ownerAddress: string }) => void
  setBoxCommitRandData?: (entry: BoxCommitRand) => void
  gameId?: bigint
  // ... other params as needed
}

async function handleGenerateApp({ getAppClient }: MethodParams) {
  // Define try block
  try {
    // Throw Error if there is no getAppClient method
    if (!getAppClient) throw new Error('Unable to getAppClient!')
    // Call the 'getAppClient' provider function and await its promise
    await getAppClient()
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleGenerateApp' function:", e)
    alert("Error calling 'handleGenerateApp' function:")
  }
}

async function handleReadGenUnix(appClient: PieoutClient, appMethods: PieoutMethods, sender: string) {
  // Define try block
  try {
    // Call the 'readGenUnix' smart contract method and await its promise
    const result = await appMethods.readGenUnix(appClient.appId, sender)

    // Just log (or alert) the result for now, this info is not really relevant to App functionality
    consoleLogger.info(`Smart contract genesis unix timestamp: ${result.toString()}`)
    // alert(`Smart contract genesis unix timestamp: ${result.toString()}`)

    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleReadGenUnix' function:", e)
    alert("Error calling 'handleReadGenUnix' function")
  }
}

async function handleReadGameState(
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
): Promise<unknown | null> {
  // Define try block
  try {
    // Call the 'readGameState' smart contract method and await its promise
    const result = await appMethods.readGameState(appClient.appId, sender, gameId)
    consoleLogger.info('Game state:', result)
    return result

    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleReadGameState' function:", e)
    alert("Error calling 'handleReadGameState' function")
    return null
  }
}

async function handleReadGamePlayers(
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
): Promise<unknown | null> {
  // Define try block
  try {
    // Call the 'readGameState' smart contract method and await its promise
    const result = await appMethods.readGamePlayers(appClient.appId, sender, gameId)
    consoleLogger.info('Game players:', result)
    return result

    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleReadGamePlayers' function:", e)
    alert("Error calling 'handleReadGamePlayers' function")
    return null
  }
}

async function handleReadBoxCommitRand(
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  player: string,
): Promise<unknown | null> {
  // Define try block
  try {
    // Call the 'readBoxCommitRand' smart contract method and await its promise
    const result = await appMethods.readBoxCommitRand(appClient.appId, sender, player)
    consoleLogger.info(`Box Commit Rand for address ${player}: ${result}`)
    return result

    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleReadBoxCommitRand' function:", e)
    alert("Error calling 'handleReadBoxCommitRand' function")
    return null
  }
}

async function handleMintTrophy(
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  setBoxTrophyData?: (data: { assetId: string; ownerAddress: string }) => void,
) {
  // Define try block
  try {
    // Call the 'mintTrophy' smart contract method and await its promise
    await appMethods.mintTrophy(appClient.appId, sender)
    alert('Trophy minted successfully!')

    // If a setter function for trophy data exists (e.g., to update UI or state), fetch updated box state
    if (setBoxTrophyData) {
      // Get the current value of the boxGameTrophy key in box state
      const boxGameTrophy = await appClient.state.box.boxGameTrophy()
      // Set boxTrophyData value to its corresponding state
      setBoxTrophyData({
        assetId: boxGameTrophy?.assetId?.toString() ?? 'not-found', // Trophy asset id, fallback: 'not-found'
        ownerAddress: boxGameTrophy?.ownerAddress ?? 'not-found', // Trophy owner address, fallback: 'not-found'
      })
    }
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleMintTrophy' function:", e)
    alert("Error calling 'handleMintTrophy' function")
  }
}

async function handleClaimTrophy(appClient: PieoutClient, appMethods: PieoutMethods, sender: string) {
  // Define try block
  try {
    // Call the 'claimTrophy' smart contract method and await its promise
    await appMethods.claimTrophy(appClient.appId, sender)
    alert('Trophy claimed succesfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleClaimTrophy' function:", e)
    alert("Error calling 'handleClaimTrophy' function")
  }
}

async function handleNewGame(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, maxPlayers: bigint) {
  // Define try block
  try {
    // Call the 'newGame' smart contract method and await its promise
    await appMethods.newGame(appClient.appId, sender, maxPlayers)
    alert('New game created succesfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleNewGame' function:", e)
    alert("Error calling 'handleNewGame' function")
  }
}

export async function handleMethodCall(action: MethodType, params: MethodParams) {
  const { activeAddress, appMethods, appClient, setBoxTrophyData, setBoxCommitRandData } = params

  // Guard clause: If no wallet activeAddress, no appMethods, return
  if (!activeAddress || !appMethods) {
    alert('activeAddress/appMethods required!')
    return
  }

  try {
    switch (action) {
      // Case calls the 'generateApp' smart contract method
      case 'generateApp':
        // Call the 'handleGenerateApp' smart contract method and await its promise
        await handleGenerateApp(params)
        break

      // Case calls the 'readGenUnix' smart contract method
      case 'readGenUnix': {
        // Guard clause: If no appClient, return
        if (!appClient) {
          alert('appClient required!')
          return
        }
        // Call the 'handleReadGenUnix' smart contract method and await its promise
        await handleReadGenUnix(appClient, appMethods, activeAddress)
        break
      }

      // Case calls the 'mintTrophy' smart contract method
      case 'mintTrophy':
        // Guard clause: If no appClient, return
        if (!appClient) {
          alert('appClient required!')
          return
        }
        // Call the 'handleMintTrophy' function and await its promise
        await handleMintTrophy(appClient, appMethods, activeAddress, setBoxTrophyData)
        break

      // Case calls the 'getBoxCommitRand' smart contract method
      case 'getBoxCommitRand':
        // Guard clause: If no appClient, return
        if (!appClient) {
          alert('appClient required!')
          return
        }
        // Call the 'getBoxCommitRand' smart contract method and await its promise
        await appMethods.getBoxCommitRand(appClient.appId, activeAddress)
        alert('Register commit successful!')
        // If a setter function for commit rand data exists (e.g., to update UI or state), fetch updated box state
        if (setBoxCommitRandData) {
          // Get all current values of the boxCommitRand map in box state
          const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
          // Get boxCommitRand single entry based on the current activeAddress
          const entry = boxCommitRand.get(activeAddress)
          // Set boxCommitRandData value to its corresponding state
          setBoxCommitRandData(
            entry
              ? {
                  gameId: entry?.gameId ?? null, // Game id, fallback: null
                  commitRound: entry?.commitRound ?? null, // Commit round, fallback: null
                  expiryRound: entry?.expiryRound ?? null, // Expiry round, fallback: null
                }
              : null, // No entry, fallback: null
          )
        }
        break

      // Case calls the 'setBoxCommitRand' smart contract method
      case 'setBoxCommitRand':
        // Guard clause: If no appClient, return
        if (!appClient) {
          alert('appClient required!')
          return
        }

        // Guard clause: If no gameId, return
        if (params.gameId === undefined || params.gameId === null) {
          alert('gameId required!')
          return
        }
        // Call the 'setBoxCommitRand' smart contract method and await its promise
        await appMethods.setBoxCommitRand(appClient.appId, activeAddress, params.gameId)
        alert('Set commit succesful!')
        // If a setter function for commit rand data exists (e.g., to update UI or state), fetch updated box state
        if (setBoxCommitRandData) {
          // Get all current values of the boxCommitRand map in box state
          const boxCommitRand = await appClient.state.box.boxCommitRand.getMap()
          // Get boxCommitRand single entry based on the current activeAddress
          const entry = boxCommitRand.get(activeAddress)
          // Set boxCommitRandData value to its corresponding state
          setBoxCommitRandData(
            entry
              ? {
                  gameId: entry?.gameId ?? null, // Game id, fallback: null
                  commitRound: entry?.commitRound ?? null, // Commit round, fallback: null
                  expiryRound: entry?.expiryRound ?? null, // Expiry round, fallback: null
                }
              : null, // No entry, fallback: null
          )
        }
        break
      default:
        throw new Error(`Unknown action type: ${action}`)
    }
  } catch (err) {
    console.error(`${action} failed:`, err)
    alert(`${action} failed`)
  }
}
