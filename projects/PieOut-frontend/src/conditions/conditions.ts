import { BoxCommitRand } from '../providers/BoxCommitRandDataProvider'

//src/conditions/conditions.ts
export function hasBoxCommitRand(boxCommitRand: BoxCommitRand | undefined): boolean {
  return boxCommitRand?.gameId != null && boxCommitRand?.commitRound != null && boxCommitRand?.expiryRound != null
}
