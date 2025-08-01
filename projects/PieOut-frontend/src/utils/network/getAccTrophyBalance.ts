// utils/getAccTrophyBalance.ts
import { IndexerClient } from 'algosdk/dist/types/client/v2/indexer/indexer'
import { MiniAssetHolding } from 'algosdk/dist/types/client/v2/indexer/models/types'

export const lookupTrophyAssetBalances = async (
  assetId: bigint,
  indexerClient: IndexerClient,
): Promise<{ optedIn?: string[]; holding?: string }> => {
  const result = await indexerClient.lookupAssetBalances(assetId).do()
  const balances = result?.balances || []

  const optedIn = balances.map((b: MiniAssetHolding) => b.address).filter(Boolean)
  const holding = balances.find((b: MiniAssetHolding) => b.amount === 1n)?.address

  return { optedIn, holding }
}
