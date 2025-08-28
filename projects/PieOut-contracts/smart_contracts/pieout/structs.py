# smart_contracts/pieout/structs.py
from algopy import arc4


# Struct containing game state values
class GameState(arc4.Struct):
    staking_finalized: arc4.Bool  # If True, game is live, else players can join

    # NEW FEATURE BELOW:
    quick_play_enabled: arc4.Bool  # If True, admin can start live phase

    max_players: arc4.UInt8  # Max num of players per game instance
    active_players: arc4.UInt8  # Active num of players currently
    first_place_score: arc4.UInt8  # First place score per round
    second_place_score: arc4.UInt8  # Second place score per round
    third_place_score: arc4.UInt8  # Third place score per round
    top_score: arc4.UInt8  # Top score for this game instance
    box_p_start_pos: arc4.UInt16  # Index where to add new address bytes to players box
    expiry_ts: arc4.UInt64  # Expiry timestamp of game phase, queue or live
    prize_pool: arc4.UInt64  # Prize pool amount for payouts
    admin_address: arc4.Address  # Game creator address, assigned as admin
    first_place_address: arc4.Address  # First place address per round
    second_place_address: arc4.Address  # Second place address per round
    third_place_address: arc4.Address  # Third place address per round
    topscorer_address: arc4.Address  # Topscorer address for this game instance


# Struct containing game trophy values
class GameTrophy(arc4.Struct):
    ath_score: arc4.UInt8  # All-time highest score per app
    asset_id: arc4.UInt64  # Trophy asset ID
    ath_address: arc4.Address  # All-time highest scorer address


# Struct containing game register values
class GameRegister(arc4.Struct):
    hosting_game: arc4.Bool  # Track if user is already hosting a game
    best_score: arc4.UInt8  # User personal best score across all games played on app
    game_id: arc4.UInt64  # Game ID user has made a commitment towards playing
    commit_rand_round: arc4.UInt64  # VRF Beacon smart contract commitment round value
    expiry_round: (
        arc4.UInt64
    )  # Round after which registration expires and box can be deleted by others
