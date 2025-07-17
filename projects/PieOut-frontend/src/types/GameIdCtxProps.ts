//src/types/GameIdCtxProps.ts

// Define the Game ID Context Props type
export type GameIdCtxProps = {
  gameId: bigint | null
  setGameId: (id: bigint) => void
}
