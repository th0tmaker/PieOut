// utils/getAccTrophyBalance.ts
import { IndexerClient } from 'algosdk/dist/types/client/v2/indexer/indexer'
import { MiniAssetHolding } from 'algosdk/dist/types/client/v2/indexer/models/types'

// define a method that looks up asset balance for the trophy asset
export const lookupTrophyAssetBalances = async (
  assetId: bigint, // Pass asset ID
  indexerClient: IndexerClient, // Pass Indexer client
  // Return a promise of `optedIn`, an array of all addresses as string that are opted-in to the asset
  // Return a promise of `holding`, the address as string that's currently holding the asset
): Promise<{ optedIn?: string[]; holding?: string }> => {
  // Use the Indexer client to lookup asset balance
  const result = await indexerClient.lookupAssetBalances(assetId).do()

  // Get the asset balance
  const balances = result?.balances || []

  // Map all addresses that have the trophy asset showing in their asset balance into a string array
  const optedIn = balances.map((b: MiniAssetHolding) => b.address).filter(Boolean) // These addresses are opted-in to the asset

  // Find addresses that hold a balance amount of '1', can only be one address, this is the holder
  const holding = balances.find((b: MiniAssetHolding) => b.amount === 1n)?.address

  // Return the addresses opted-in to asset and the asset holder
  return { optedIn, holding }
}
