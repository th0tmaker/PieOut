# smart_contracts/pieout/subroutines.py
from algopy import (
    Account,
    BoxMap,
    BoxRef,
    Bytes,
    Global,
    String,
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


# Define am asset config inner transaction that burns the asset
@subroutine
def burn_itxn(
    asset_id: UInt64,
    note: String,
) -> None:
    itxn.AssetConfig(
        config_asset=asset_id,
        note=note,
    ).submit()


# Define a clawback asset transfer inner transaction of single amount
@subroutine
def clawback_itxn(
    asset_id: UInt64,
    asset_sender: Account,
    asset_receiver: Account,
    note: String,
) -> None:
    itxn.AssetTransfer(
        asset_receiver=asset_receiver,
        xfer_asset=asset_id,
        asset_sender=asset_sender,
        asset_amount=1,
        note=note,
    ).submit()


# Define a payout payment inner transaction
@subroutine
def payout_itxn(receiver: Account, amount: UInt64, note: String) -> None:
    itxn.Payment(
        receiver=receiver,
        amount=amount,
        note=note,
    ).submit()


# Resolve reciever account address by priority
@subroutine
def resolve_receiver_by_prio(
    acc1: Account,
    acc2: Account,
    acc3: Account,
) -> Account:
    if acc1 != Global.zero_address and op.AcctParamsGet.acct_balance(acc1)[1]:
        return acc1
    elif acc2 != Global.zero_address and op.AcctParamsGet.acct_balance(acc2)[1]:
        return acc2
    elif acc3 != Global.zero_address and op.AcctParamsGet.acct_balance(acc3)[1]:
        return acc3
    elif (
        Txn.sender != Global.zero_address
        and op.AcctParamsGet.acct_balance(Txn.sender)[1]
    ):
        return Txn.sender
    else:
        return Global.current_application_address


# Reset game commit values inside the game register box back to their initial default state
@subroutine
def reset_game_commit_values(
    box_game_register: BoxMap[Account, stc.GameRegister],
    account: Account,
    round_delta: UInt64,
) -> None:
    box_game_register[account].game_id = arc4.UInt64(0)
    box_game_register[account].commit_rand_round = arc4.UInt64(0)
    box_game_register[account].expiry_round = arc4.UInt64(Global.round + round_delta)


# Check if account is an active player of a game
@subroutine
def check_acc_in_game(
    game_id: UInt64,
    account: Account,
    box_game_players: BoxMap[UInt64, Bytes],
    player_count: UInt64,
    clear_player: bool,  # noqa: FBT001
) -> bool:
    # Calculate total byte length to iterate over based on player count and address size
    game_players_length = player_count * cst.ADDRESS_SIZE

    # Initialize flag to track if account is found in game
    acc_in_game = False

    # Iterate through the player byte array in 32-byte chunks (one address per chunk)
    for i in urange(0, game_players_length, cst.ADDRESS_SIZE):
        # Extract the 32-byte player address at start index i
        player_addr_bytes = op.extract(box_game_players[game_id], i, cst.ADDRESS_SIZE)

        # Check if the extracted player address bytes match up with the account bytes
        if account.bytes == player_addr_bytes:
            acc_in_game = True

            # Optionally clear this player from the box by replacing their address with zero bytes
            if clear_player:
                game_players_bref = BoxRef(
                    key=box_game_players.key_prefix + op.itob(game_id)
                )
                game_players_bref.replace(i, cst.ZERO_ADDR_BYTES)

            # Exit loop early since sender was found
            break

    # Return True if account was found in the game, else False
    return acc_in_game


# Use the PCG AVM library to generate a sequence of numbers and compute the final score and placement
@subroutine
def calc_score_get_place(
    game_id: UInt64,
    game_state: stc.GameState,
    game_register: stc.GameRegister,
    player: Account,
    seed: Bytes,
) -> None:
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

    # Emit ARC-28 event for off-chain tracking
    arc4.emit(
        "player_score(uint64,address,uint8)",
        game_id,
        player,
        arc4.UInt8(score),
    )

    # Check if score is greater than the game state's top score
    if score > game_state.top_score.native:
        game_state.top_score = arc4.UInt8(score)  # Update top score
        game_state.topscorer_address = arc4.Address(player)  # Update topscorer address

    # Check if score is greater than the game register account's best score across every game played
    if score > game_register.best_score.native:
        game_register.best_score = arc4.UInt8(score)  # Update personal top score

    # Check if score is great enough for a top three placement and arrange leaderboard accordingly
    if (
        # First Place
        game_state.first_place_address == arc4.Address(Global.zero_address)
        or score > game_state.first_place_score.native
    ):
        # Assign: Second -> Third
        game_state.third_place_score = game_state.second_place_score
        game_state.third_place_address = game_state.second_place_address
        # Assign: First -> Second
        game_state.second_place_score = game_state.first_place_score
        game_state.second_place_address = game_state.first_place_address
        # Assign: Score -> First
        game_state.first_place_score = arc4.UInt8(score)
        game_state.first_place_address = arc4.Address(player)
    elif (
        # Second Place
        game_state.second_place_address == arc4.Address(Global.zero_address)
        or score > game_state.second_place_score.native
    ):
        # Assign: Second -> Third
        game_state.third_place_score = game_state.second_place_score
        game_state.third_place_address = game_state.second_place_address
        # Assign: Score -> Second
        game_state.second_place_score = arc4.UInt8(score)
        game_state.second_place_address = arc4.Address(player)
    elif (
        # Third Place
        game_state.third_place_address == arc4.Address(Global.zero_address)
        or score > game_state.third_place_score.native
    ):
        # Assign: Score -> Third
        game_state.third_place_score = arc4.UInt8(score)
        game_state.third_place_address = arc4.Address(player)


# Check if game is live and execute its conditional logic
@subroutine
def is_game_live(game_id: UInt64, game_state: stc.GameState) -> None:
    # Check game live criteria
    if (
        game_state.expiry_ts < Global.latest_timestamp  # If deadline expired
        or game_state.active_players == game_state.max_players  # If lobby full
    ):
        # Mark join phase as complete when staking finalized evaluates True
        game_state.staking_finalized = arc4.Bool(True)  # noqa: FBT003

        # Establish game play window by setting expiry timestamp
        game_state.expiry_ts = arc4.UInt64(
            Global.latest_timestamp + UInt64(cst.PHASE_EXPIRY_INTERVAL)
        )

        # Emit ARC-28 event for off-chain tracking
        arc4.emit(
            "game_live(uint64,bool,uint64)",
            game_id,
            game_state.staking_finalized,
            game_state.expiry_ts,
        )


# Check if game is over and execute its conditional logic
@subroutine
def is_game_over(
    game_id: UInt64,
    game_state: stc.GameState,
    box_game_register: BoxMap[Account, stc.GameRegister],
    box_game_players: BoxMap[UInt64, Bytes],
) -> None:
    # Check game over criteria
    if (
        game_state.expiry_ts < Global.latest_timestamp  # If deadline expired
        or game_state.active_players.native == 0  # If no more active players
        or (
            game_state.active_players == 1  # If only one active player AND
            and Txn.sender == game_state.admin_address  # If sender is admin address AND
            and game_state.staking_finalized == False  # noqa: E712
        )  # If staking is not finalized
    ):
        # Reset game register box contents to their default starting values for any remaining players
        game_players_bref = BoxRef(key=box_game_players.key_prefix + op.itob(game_id))
        for i in urange(0, game_players_bref.length, 32):
            player_addr_bytes = game_players_bref.extract(i, 32)
            if player_addr_bytes != Bytes(cst.ZERO_ADDR_BYTES):
                player = Account.from_bytes(player_addr_bytes)
                # Reset game commit values in game register box for player after they obtained a score
                reset_game_commit_values(
                    box_game_register=box_game_register,
                    account=player,
                    round_delta=UInt64(cst.BOX_R_EXP_ROUND_DELTA),
                )

        # Clear box game players data by setting its value to all zeroes
        box_game_players[game_id] = op.bzero(
            cst.ADDRESS_SIZE * game_state.max_players.native
        )

        # Mark game as over by setting active players to zero
        game_state.active_players = arc4.UInt8(0)

        # Emit ARC-28 event for off-chain tracking
        arc4.emit(
            "game_over(uint64,uint8,uint8,uint8,address,address,address)",
            game_id,
            game_state.first_place_score,
            game_state.second_place_score,
            game_state.third_place_score,
            game_state.first_place_address,
            game_state.second_place_address,
            game_state.third_place_address,
        )

        # If only 1 player in lobby after game goes live, they get entire prize pool
        if game_state.prize_pool.native == cst.STAKE_AMOUNT:
            first_prize_share = game_state.prize_pool.native
            second_prize_share = UInt64(0)
            third_prize_share = UInt64(0)
        # Elif, only 2 players in lobby after game goes live, split prize pool: 60% / remainder / 0
        elif game_state.prize_pool.native == 2 * cst.STAKE_AMOUNT:
            first_prize_share = game_state.prize_pool.native * UInt64(60) // UInt64(100)
            second_prize_share = game_state.prize_pool.native - first_prize_share
            third_prize_share = UInt64(0)  # No third player
        # Else, split prize pool: 50% / 30% / remainder
        else:
            first_prize_share = game_state.prize_pool.native * UInt64(50) // UInt64(100)
            second_prize_share = (
                game_state.prize_pool.native * UInt64(30) // UInt64(100)
            )
            third_prize_share = (
                game_state.prize_pool.native - first_prize_share - second_prize_share
            )

        # Resolve prize pool win share receivers by priority
        first_place_receiver = resolve_receiver_by_prio(
            acc1=game_state.first_place_address.native,
            acc2=game_state.admin_address.native,
            acc3=Global.creator_address,
        )
        second_place_receiver = resolve_receiver_by_prio(
            acc1=game_state.second_place_address.native,
            acc2=game_state.admin_address.native,
            acc3=Global.creator_address,
        )
        third_place_receiver = resolve_receiver_by_prio(
            acc1=game_state.third_place_address.native,
            acc2=game_state.admin_address.native,
            acc3=Global.creator_address,
        )

        # Issue prize pool share payouts to first, second and third place accounts if their share is non-zero amount
        if first_prize_share > UInt64(0):
            payout_itxn(
                receiver=first_place_receiver,
                amount=first_prize_share,
                note=String(
                    'pieout:j{"method":"play_game","subroutine:"is_game_over","concern":"itxn.pay;first_prize_share"}'
                ),
            )
        if second_prize_share > UInt64(0):
            payout_itxn(
                receiver=second_place_receiver,
                amount=second_prize_share,
                note=String(
                    'pieout:j{"method":"play_game","subroutine:"is_game_over","concern":"itxn.pay;second_prize_share"}'
                ),
            )
        if third_prize_share > UInt64(0):
            payout_itxn(
                receiver=third_place_receiver,
                amount=third_prize_share,
                note=String(
                    'pieout:j{"method":"play_game","subroutine:"is_game_over","concern":"itxn.pay;third_prize_share"}'
                ),
            )

        # Set prize pool amount to zero after making payouts
        game_state.prize_pool = arc4.UInt64(0)
