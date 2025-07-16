# smart_contracts/pieout/structs.py
from algopy import arc4


# Struct containing game state values
class GameState(arc4.Struct):
    staking_finalized: arc4.Bool
    max_players: arc4.UInt8
    active_players: arc4.UInt8
    best_score: arc4.UInt8
    first_place_score: arc4.UInt8
    second_place_score: arc4.UInt8
    third_place_score: arc4.UInt8
    box_p_start_pos: arc4.UInt16
    expiry_ts: arc4.UInt64
    prize_pool: arc4.UInt64
    admin_address: arc4.Address
    first_place_address: arc4.Address
    second_place_address: arc4.Address
    third_place_address: arc4.Address


# Struct containing game trophy values
class GameTrophy(arc4.Struct):
    high_score: arc4.UInt8
    asset_id: arc4.UInt64
    highscorer_address: arc4.Address


# Struct containing game register values
class GameRegister(arc4.Struct):
    hosting_game: arc4.Bool
    best_score: arc4.UInt8
    game_id: arc4.UInt64
    expiry_round: arc4.UInt64
    commit_rand_round: arc4.UInt64
