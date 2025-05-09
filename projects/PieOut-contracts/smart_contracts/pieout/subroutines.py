# smart_contracts/pieout/subroutines.py
from algopy import Account, BoxMap, BoxRef, Bytes, Txn, UInt64, arc4, op, subroutine, urange
from lib_pcg import pcg16_init, pcg16_random

from . import constants as cst
from . import structs as stc


@subroutine
def check_sender_in_game(
    game_id: UInt64,
    box_game_players: BoxMap[UInt64, Bytes],
    player_count: UInt64,
    clear_player: bool,  # noqa: FBT001
) -> bool:
    # Retrieve current players addresses from box using the game id parameter
    game_players = box_game_players[game_id]

    game_players_length = player_count * cst.ADDRESS_SIZE

    # Check if transaction sender is a recognized player of this game instance
    txn_sender_in_game = False  # Flag to track if sender is already in game

    # Iterate through the players box value, 32 bytes at a time, in order to access each player address
    for i in urange(0, game_players_length, cst.ADDRESS_SIZE):
        # From players box value byte array, starting at position i, extract 32 bytes
        player_addr_bytes = op.extract(game_players, i, cst.ADDRESS_SIZE)

        # If match between sender address bytes and player address bytes exists
        if Txn.sender.bytes == player_addr_bytes:
            txn_sender_in_game = True  # Sender is already in game

            # Replace the player address bytes data with 32 zeroed bytes at position i
            if clear_player:
                players_ref = BoxRef(key=box_game_players.key_prefix + op.itob(game_id))
                players_ref.replace(i, cst.ZERO_ADDR_BYTES)

            break

    return txn_sender_in_game


@subroutine
def roll_score(seed: Bytes, game_state: stc.GameState, player: Account) -> None:
    # Take a portion of the seed to generate a sequence of random unsigned 16-bit integers
    state = pcg16_init(seed=op.extract(seed, 16, 8))
    sequence = pcg16_random(
        state=state,
        lower_bound=UInt64(1),
        upper_bound=UInt64(0),
        length=UInt64(100),
    )[1]

    score = UInt64(0)
    for i in urange(2, sequence.bytes.length, 2):
        roll = op.extract_uint16(sequence.bytes[2:], i)

        if roll <= cst.ELIM_THRESHOLD:
            break

        score += 1

    new_score = arc4.UInt8(score)
    if new_score > game_state.high_score:
        game_state.high_score = new_score
        game_state.winner_address = arc4.Address(player)
