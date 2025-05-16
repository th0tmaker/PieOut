# smart_contracts/pieout/structs.py
from algopy import arc4


# Struct containing game state values
class GameState(arc4.Struct):
    staking_finalized: arc4.Bool
    max_players: arc4.UInt8
    active_players: arc4.UInt8
    highest_score: arc4.UInt8
    box_p_start_pos: arc4.UInt16
    expiry_ts: arc4.UInt64
    prize_pool: arc4.UInt64
    manager_address: arc4.Address
    winner_address: arc4.Address

# Struct containing commit randomness values
class CommitRand(arc4.Struct):
    commit_round: arc4.UInt64
