export type PlayerScoreProps = {
  name: string
  txId: string
  args: {
    game_id: string | bigint
    score: number
    player: string
  }
}
