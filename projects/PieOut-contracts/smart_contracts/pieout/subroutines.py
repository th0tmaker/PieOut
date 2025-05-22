# smart_contracts/pieout/subroutines.py
from algopy import (
    Account,
    BoxMap,
    BoxRef,
    Bytes,
    Global,
    Txn,
    UInt64,
    arc4,
    itxn,
    op,
    subroutine,
    urange,
)
from lib_pcg import pcg16_init, pcg16_random

from . import constants as cst
from . import structs as stc


# Check if transaction sender is active player in a valid game instance
@subroutine
def check_sender_in_game(
    game_id: UInt64,
    box_game_players: BoxMap[UInt64, Bytes],
    player_count: UInt64,
    clear_player: bool,  # noqa: FBT001
) -> bool:
    # Calculate total byte length to iterate over based on player count and address size
    game_players_length = player_count * cst.ADDRESS_SIZE

    # Initialize flag to track if the transaction sender is found in the game
    txn_sender_in_game = False

    # Iterate through the player byte array in 32-byte chunks (one address per chunk)
    for i in urange(0, game_players_length, cst.ADDRESS_SIZE):
        # Extract the 32-byte player address at start index i
        player_addr_bytes = op.extract(box_game_players[game_id], i, cst.ADDRESS_SIZE)

        # Check if the extracted player address matches the transaction sender address
        if Txn.sender.bytes == player_addr_bytes:
            txn_sender_in_game = True

            # Optionally clear this player from the box by replacing their address with zero bytes
            if clear_player:
                players_ref = BoxRef(key=box_game_players.key_prefix + op.itob(game_id))
                players_ref.replace(i, cst.ZERO_ADDR_BYTES)

            # Exit loop early since sender was found
            break

    # Return True if sender was found in the game, else False
    return txn_sender_in_game

# Use the PCG AVM library to generate a sequence of rolls and compute a score
@subroutine
def roll_score(game_id: UInt64, seed: Bytes, game_state: stc.GameState, player: Account) -> None:
    # Initialize the PCG pseudo-random generator state using 8 bytes from the given seed
    state = pcg16_init(seed=op.extract(seed, 16, 8))

    # Generate a sequence of 100 random 16-bit integers (UInt16)
    sequence = pcg16_random(
        state=state,  # Data type is UInt16
        lower_bound=UInt64(1),  # Lower bound is 1 (to disallow 0 as a value)
        upper_bound=UInt64(0),  # Upper bound is 0 (to indicate full range)
        length=UInt64(255),  # Number of values generated is 255
    )[1]

    # Initialize the player's score
    score = UInt64(0)

    # Iterate through the sequence as a byte array starting at byte index 2 (skip array header bytes)
    for i in urange(2, sequence.bytes.length, 2):
        # Extract a 16-bit unsigned integer from the byte sequence
        roll = op.extract_uint16(sequence.bytes[2:], i)

        # Stop accumulating score if the roll is below or equal to the elimination threshold
        if roll <= cst.ELIM_THRESHOLD:
            break

        # Increment score for each roll above the threshold
        score += 1

    # Type cast score as an unsigned 8-bit integer
    uint8_score = arc4.UInt8(score)

    # Emit ARC-28 event for off-chain tracking
    arc4.emit(
        "player_score(uint64,address,uint8)",
        game_id,
        player,
        uint8_score,
    )

    # If this score beats the current high score, update the game state
    if uint8_score > game_state.highest_score:
        game_state.highest_score = uint8_score  # Update game state high score
        game_state.winner_address = arc4.Address(
            player
        )  # Update game state winner address

# Check if game is live and execute its conditional logic
@subroutine
def is_game_live(game_state: stc.GameState) -> arc4.Bool:
    # Check game live criteria
    if (
        game_state.expiry_ts < Global.latest_timestamp  # If deadline expired
        or game_state.active_players == game_state.max_players  # If lobby full
    ):
        # Mark join phase as complete when staking finalized evaluates True
        game_state.staking_finalized = arc4.Bool(True)  # noqa: FBT003

        # Establish game play window by setting expiry timestamp
        game_state.expiry_ts = arc4.UInt64(
            Global.latest_timestamp + UInt64(cst.EXPIRY_INTERVAL)
        )

        # Emit ARC-28 event for off-chain tracking
        arc4.emit(
            "game_live(bool,uint64)",
            game_state.staking_finalized,
            game_state.expiry_ts,
        )

        return arc4.Bool(True)  # noqa: FBT003
    else:
        return arc4.Bool(False)  # noqa: FBT003


# Check if game is over and execute its conditional logic
@subroutine
def is_game_over(game_id: UInt64, game_state: stc.GameState, box_game_players: BoxMap[UInt64, Bytes]) -> arc4.Bool:
    # Check game over criteria
    if (
        game_state.expiry_ts < Global.latest_timestamp  # If deadline expired
        or game_state.active_players.native == 0  # If no more active players
    ):
        # Clear box game players data by setting its value to all zeroes
        box_game_players[game_id] = op.bzero(
            cst.ADDRESS_SIZE * game_state.max_players.native
        )

        # Mark game as over by setting active players to zero
        game_state.active_players = arc4.UInt8(0)

        # Emit ARC-28 event for off-chain tracking
        arc4.emit(
            "game_over(address,uint8)",
            game_state.winner_address,
            game_state.highest_score,
        )

        # Default prize pool reciever is game winner address
        receiver = game_state.winner_address.native

        # If game winner address is empty, reciever is game manager
        if game_state.winner_address.native == Global.zero_address:
            receiver = game_state.manager_address.native

        # Make application account send prize pool amount of algo through a payment inner transaction
        itxn.Payment(
            receiver=receiver,
            amount=game_state.prize_pool.native,
            note="Prize pool game_over_critera payment inner transaction",
        ).submit()

        # Set prize pool amount to zero
        game_state.prize_pool = arc4.UInt64(0)

        return arc4.Bool(True)  # noqa: FBT003
    else:
        return arc4.Bool(False)  # noqa: FBT003
