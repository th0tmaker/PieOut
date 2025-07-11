import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { PieoutClient } from './contracts/Pieout'
import { PieoutMethods } from './methods'

export async function handleGenerateApp(getAppClient: () => Promise<void>) {
  try {
    await getAppClient()
  } catch (e) {
    consoleLogger.error("Error calling 'handleGenerateApp' function:", e)
    alert("Error calling 'handleGenerateApp' function:")
  }
}

export async function handleTerminateApp(appClient: PieoutClient, appMethods: PieoutMethods, sender: string) {
  // Define try block
  try {
    // Call the 'terminateApp' smart contract method and await its promise
    await appMethods.terminateApp(appClient.appId, sender)
    alert('Smart contract successfully terminated!')

    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleTerminateApp' function:", e)
    alert("Error calling 'handleTerminateApp' function")
  }
}

export async function handleDeployApp(appMethods: PieoutMethods, sender: string) {
  // Define try block
  try {
    // Call the 'deployApp' smart contract method and await its promise
    await appMethods.deployApp(sender)
    alert('Smart contract deployment successfully set!')

    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleDeployApp' function:", e)
    alert("Error calling 'handleDeployApp' function")
  }
}

export async function handleReadGenUnix(appClient: PieoutClient, appMethods: PieoutMethods, sender: string) {
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

export async function handleReadGameState(
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

export async function handleReadGamePlayers(
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

export async function handleReadBoxCommitRand(
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

export async function handleMintTrophy(
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

export async function handleClaimTrophy(appClient: PieoutClient, appMethods: PieoutMethods, sender: string) {
  // Define try block
  try {
    // Call the 'claimTrophy' smart contract method and await its promise
    await appMethods.claimTrophy(appClient.appId, sender)
    alert('Trophy claimed successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleClaimTrophy' function:", e)
    alert("Error calling 'handleClaimTrophy' function")
  }
}

export async function handleNewGame(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, maxPlayers: bigint) {
  // Define try block
  try {
    // Call the 'newGame' smart contract method and await its promise
    await appMethods.newGame(appClient.appId, sender, maxPlayers)
    alert('New game created successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleNewGame' function:", e)
    alert("Error calling 'handleNewGame' function")
  }
}

export async function handleJoinGame(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) {
  // Define try block
  try {
    // Call the 'joinGame' smart contract method and await its promise
    await appMethods.joinGame(appClient.appId, sender, gameId)
    alert('Game joined successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleJoinGame' function:", e)
    alert("Error calling 'handleJoinGame' function")
  }
}

export async function handlePlayGame(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) {
  // Define try block
  try {
    // Call the 'playGame' smart contract method and await its promise
    await appMethods.playGame(appClient.appId, sender, gameId)
    alert('Game played successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handlePlayGame' function:", e)
    alert("Error calling 'handlePlayGame' function")
  }
}

export async function handleResetGame(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) {
  // Define try block
  try {
    // Call the 'resetGame' smart contract method and await its promise
    await appMethods.resetGame(appClient.appId, sender, gameId)
    alert('Game reseted successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleResetGame' function:", e)
    alert("Error calling 'handleResetGame' function")
  }
}

export async function handleDeleteGame(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) {
  // Define try block
  try {
    // Call the 'deleteGame' smart contract method and await its promise
    await appMethods.deleteGame(appClient.appId, sender, gameId)
    alert('Game deleted successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleDeleteGame' function:", e)
    alert("Error calling 'handleDeleteGame' function")
  }
}

export async function handleGetBoxCommitRand(appClient: PieoutClient, appMethods: PieoutMethods, sender: string) {
  // Define try block
  try {
    // Call the 'getBoxCommitRand' smart contract method and await its promise
    await appMethods.getBoxCommitRand(appClient.appId, sender)
    alert('Box Commit Rand obtained successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleGetBoxCommitRand' function:", e)
    alert("Error calling 'handleGetBoxCommitRand' function")
  }
}

export async function handleSetBoxCommitRand(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) {
  // Define try block
  try {
    // Call the 'setBoxCommitRand' smart contract method and await its promise
    await appMethods.setBoxCommitRand(appClient.appId, sender, gameId)
    alert('Box Commit Rand set successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleSetBoxCommitRand' function:", e)
    alert("Error calling 'handleSetBoxCommitRand' function")
  }
}

export async function handleDelBoxCommitRandForSelf(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, gameId: bigint) {
  // Define try block
  try {
    // Call the 'delBoxCommitRandForSelf' smart contract method and await its promise
    await appMethods.delBoxCommitRandForSelf(appClient.appId, sender, gameId)
    alert('Box Commit Rand deleted successfully for self!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleDelBoxCommitRandForSelf' function:", e)
    alert("Error calling 'handleDelBoxCommitRandForSelf' function")
  }
}

export async function handleDelBoxCommitRandForOther(appClient: PieoutClient, appMethods: PieoutMethods, sender: string, player: string) {
  // Define try block
  try {
    // Call the 'delBoxCommitRandForOther' smart contract method and await its promise
    await appMethods.delBoxCommitRandForOther(appClient.appId, sender, player)
    alert('Box Commit Rand deleted successfully for other!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleDelBoxCommitRandForOther' function:", e)
    alert("Error calling 'handleDelBoxCommitRandForOther' function")
  }
}

export async function handleTriggerGameProg(
  appClient: PieoutClient,
  appMethods: PieoutMethods,
  sender: string,
  gameId: bigint,
  triggerId: bigint,
) {
  // Define try block
  try {
    // Call the 'triggerGameProg' smart contract method and await its promise
    await appMethods.triggerGameProg(appClient.appId, sender, gameId, triggerId)
    alert('Game event triggered successfully!')
    // Handle catch error
  } catch (e) {
    consoleLogger.error("Error calling 'handleTriggerGameProg' function:", e)
    alert("Error calling 'handleTriggerGameProg' function")
  }
}
