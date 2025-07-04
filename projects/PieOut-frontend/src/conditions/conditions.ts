import { BoxCommitRand } from '../contexts/BoxCommitRandContext'

//src/conditions/conditions.ts
export function hasBoxCommitRand(boxCommitRand: BoxCommitRand | undefined): boolean {
  return boxCommitRand?.gameId != null && boxCommitRand?.commitRound != null && boxCommitRand?.expiryRound != null
}
