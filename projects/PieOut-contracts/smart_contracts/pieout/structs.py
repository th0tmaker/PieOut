# smart_contracts/pieout/structs.py
from algopy import arc4


# Struct containing game state values
class GameState(arc4.Struct):
    staking_finalized: arc4.Bool
    max_players: arc4.UInt8
    active_players: arc4.UInt8
    high_score: arc4.UInt8
    box_p_start_pos: arc4.UInt16
    prize_pool: arc4.UInt64
    manager_address: arc4.Address
    winner_address: arc4.Address

# Struct containing commit randomness values
class CommitRand(arc4.Struct):
    game_id: arc4.UInt64
    commit_round: arc4.UInt64
