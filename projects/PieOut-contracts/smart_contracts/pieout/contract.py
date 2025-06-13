# smart_contracts/pieout/contract.py
from algopy import (
    Account,
    ARC4Contract,
    Asset,
    Box,
    BoxMap,
    BoxRef,
    Bytes,
    Global,
    OpUpFeeSource,
    String,
    TemplateVar,
    Txn,
    UInt64,
    arc4,
    ensure_budget,
    gtxn,
    itxn,
    op,
    urange,
)

from . import constants as cst
from . import errors as err
from . import structs as stc
from . import subroutines as srt
from . import type_aliases as ta


# Smart contract class
class Pieout(ARC4Contract):
    # Global State type declarations
    game_id: UInt64
    score_id: UInt64
    ath_score: UInt64
    ath_address: Account

    # Application init method
    def __init__(self) -> None:
        # Box Storage type declarations
        self.box_game_state = BoxMap(UInt64, stc.GameState, key_prefix="s_")
        self.box_game_players = BoxMap(UInt64, Bytes, key_prefix="p_")
        self.box_commit_rand = BoxMap(Account, stc.CommitRand, key_prefix="c_")
        self.box_game_trophy = Box(stc.GameTrophy, key="t_")

    # Calculate the minimum balance requirement (MBR) cost for storing a single box unit
    @arc4.abimethod(readonly=True)
    def calc_single_box_cost(
        self, key_size: arc4.UInt8, value_size: arc4.UInt16
    ) -> UInt64:
        # Formula for calculating single box total cost
        base_cost = arc4.UInt16(2_500)  # Base fee (2_500)
        size_cost = arc4.UInt16(400).native * (
            key_size.native + value_size.native
        )  # Size fee (400 per byte * (len(key)+len(value)))

        # Return single box total cost amount
        return base_cost.native + size_cost

    # Read the smart contract application genesis timestamp in Unix format
    @arc4.abimethod(readonly=True)
    def read_gen_unix(self) -> UInt64:
        return TemplateVar[UInt64]("GEN_UNIX")

    # Read the smart contract application game state box for given game id
    @arc4.abimethod(readonly=True)
    def read_box_game_state(self, game_id: UInt64) -> ta.GameStateTuple:
        # Retrieve current game state from box using the game id parameter
        game_state = self.box_game_state[
            game_id
        ].copy()  # Make a copy of the game state data else immutable

        # Return the game state as a tuple
        return ta.GameStateTuple(
            (
                arc4.UInt64(game_id),
                game_state.staking_finalized,
                game_state.max_players,
                game_state.active_players,
                game_state.first_place_score,
                game_state.second_place_score,
                game_state.third_place_score,
                game_state.box_p_start_pos,
                game_state.expiry_ts,
                game_state.prize_pool,
                game_state.admin_address,
                game_state.first_place_address,
                game_state.second_place_address,
                game_state.third_place_address,
            )
        )

    # Read the smart contract application game players box for given game id
    @arc4.abimethod(readonly=True)
    def read_box_game_players(self, game_id: UInt64) -> ta.GamePlayersArr:
        # Retrieve current game players from box using the game id parameter
        game_players = self.box_game_players[game_id]

        # Define a dynamic array to append all remaining players
        players = ta.GamePlayersArr()

        # Iterate through the game players byte array
        for i in urange(0, game_players.length, cst.ADDRESS_SIZE):
            # Extract the bytes representing the player address
            player_addr_bytes = op.extract(game_players, i, cst.ADDRESS_SIZE)
            # Only append address if its bytes do NOT equal to a zeroed byte array of size 32
            if player_addr_bytes != Bytes(cst.ZERO_ADDR_BYTES):
                player_account = Account.from_bytes(player_addr_bytes)
                players.append(arc4.Address(player_account))

        # Return the array containing the remaining players
        return players

    # Read the smart contract application commit round box for given account
    @arc4.abimethod(readonly=True)
    def read_box_commit_rand(self, player: Account) -> ta.CommitRandTuple:
        # Fail transaction unless the assertion below evaluates True
        assert player in self.box_commit_rand, err.BOX_NOT_FOUND

        # Create a copy of the box commit rand contents
        commit_rand = self.box_commit_rand[player].copy()

        # Return a tuple containing commit rand game id, commit round and expiry round
        return ta.CommitRandTuple((commit_rand.game_id, commit_rand.commit_round, commit_rand.expiry_round))

    # Generate the smart contract application client with default values
    @arc4.abimethod(create="require")
    def generate(
        self,
    ) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Txn.sender == Global.creator_address, err.INVALID_CREATOR

        # Assign Global State variables with their default starting value
        self.game_id = UInt64(1)
        self.score_id = UInt64(1)
        self.ath_score = UInt64(0)
        self.ath_address = Global.zero_address

    # Allow application creator to mint a one-time NFT asset used as trophy token to honor the ATH address
    @arc4.abimethod
    def mint_trophy(
        self,
        box_t_pay: gtxn.PaymentTransaction,
        mint_pay: gtxn.PaymentTransaction,
    ) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 3, err.INVALID_GROUP_SIZE
        assert not self.box_game_trophy, err.BOX_FOUND

        assert box_t_pay.amount >= cst.BOX_T_COST, err.INVALID_BOX_PAY_FEE
        assert box_t_pay.sender == Global.creator_address, err.INVALID_BOX_PAY_SENDER
        assert (
            box_t_pay.receiver == Global.current_application_address
        ), err.INVALID_BOX_PAY_RECEIVER

        assert (
            mint_pay.amount >= Global.asset_create_min_balance
        ), err.INVALID_MINT_PAY_FEE
        assert mint_pay.sender == Global.creator_address, err.INVALID_MINT_PAY_SENDER
        assert (
            mint_pay.receiver == Global.current_application_address
        ), err.INVALID_MINT_PAY_RECEIVER

        # Mint a new unique asset representing the game trophy by making an asset config inner transaction
        acfg_itxn = itxn.AssetConfig(
            total=1,
            unit_name="TRFY",
            asset_name="Gamename-ATH-Trophy",
            decimals=0,
            default_frozen=False,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            note=b'pieout:j{"method":"mint_trophy","concern":"itxn.asset_config;create_trophy_asset"}',
        ).submit()

        # Create the box game trophy and assign its default starting values
        self.box_game_trophy.create()
        self.box_game_trophy.value = stc.GameTrophy(
            asset_id=arc4.UInt64(acfg_itxn.created_asset.id),
            owner_address=arc4.Address(Global.zero_address),
        )

    # Allow the ATH address to add the trophy to their asset balance via an asset transfer inner transaction
    @arc4.abimethod
    def claim_trophy(self) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 1, err.STANDALONE_TXN_ONLY
        assert Txn.sender == self.ath_address, err.INVALID_TROPHY_RECEIVER
        assert Txn.sender.is_opted_in(
            Asset(self.box_game_trophy.value.asset_id.native)
        ), err.ASSET_OPT_IN_REQUIRED

        # Transfer game trophy to sender by making an asset transfer inner transaction
        itxn.AssetTransfer(
            xfer_asset=self.box_game_trophy.value.asset_id.native,
            asset_receiver=Txn.sender,
            asset_amount=1,
            note=b'pieout:j{"method":"claim_trophy","concern":"itxn.asset_transfer;transfer_trophy_asset"}',
        ).submit()

    # Create new game instance with a unique ID
    @arc4.abimethod
    def new_game(
        self,
        max_players: UInt64,
        box_s_pay: gtxn.PaymentTransaction,
        box_p_pay: gtxn.PaymentTransaction,
        stake_pay: gtxn.PaymentTransaction,
    ) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 4, err.INVALID_GROUP_SIZE
        assert self.box_game_trophy, err.BOX_NOT_FOUND
        assert (
            max_players >= cst.MAX_PLAYERS_BOT_BOUND
            and max_players <= cst.MAX_PLAYERS_TOP_BOUND
        ), err.INVALID_MAX_PLAYERS

        assert stake_pay.amount == cst.STAKE_AMOUNT_MANAGER, err.INVALID_STAKE_PAY_FEE
        assert box_s_pay.amount == cst.BOX_S_COST, err.INVALID_BOX_PAY_FEE
        assert box_p_pay.amount == self.calc_single_box_cost(
            key_size=arc4.UInt8(10),
            value_size=arc4.UInt16(cst.ADDRESS_SIZE * max_players),
        ), err.INVALID_BOX_PAY_FEE

        assert stake_pay.sender == Txn.sender, err.INVALID_STAKE_PAY_SENDER
        assert box_s_pay.sender == Txn.sender, err.INVALID_BOX_PAY_SENDER
        assert box_p_pay.sender == Txn.sender, err.INVALID_BOX_PAY_SENDER

        assert (
            stake_pay.receiver == Global.current_application_address
        ), err.INVALID_STAKE_PAY_RECEIVER
        assert (
            box_s_pay.receiver == Global.current_application_address
        ), err.INVALID_BOX_PAY_RECEIVER
        assert (
            box_p_pay.receiver == Global.current_application_address
        ), err.INVALID_BOX_PAY_RECEIVER

        # Initialize a new game state box with unique game IQ and write the default starting values inside
        self.box_game_state[self.game_id] = stc.GameState(
            staking_finalized=arc4.Bool(False),  # noqa: FBT003
            max_players=arc4.UInt8(max_players),
            active_players=arc4.UInt8(1),
            first_place_score=arc4.UInt8(0),
            second_place_score=arc4.UInt8(0),
            third_place_score=arc4.UInt8(0),
            box_p_start_pos=arc4.UInt16(cst.ADDRESS_SIZE),
            expiry_ts=arc4.UInt64(Global.latest_timestamp + cst.EXPIRY_INTERVAL),
            prize_pool=arc4.UInt64(stake_pay.amount),
            admin_address=arc4.Address(Txn.sender),
            first_place_address=arc4.Address(Global.zero_address),
            second_place_address=arc4.Address(Global.zero_address),
            third_place_address=arc4.Address(Global.zero_address),
        )

        # Initialize box game players with zeroed bytes to store all player addresses (32 bytes per player)
        self.box_game_players[self.game_id] = op.bzero(cst.ADDRESS_SIZE * max_players)

        # For game players box, replace the sender's address at index 0
        game_players_bref = BoxRef(
            key=self.box_game_players.key_prefix + op.itob(self.game_id)
        )
        game_players_bref.replace(0, Txn.sender.bytes)

        # Increment game id by 1 for next new game instance
        self.game_id += 1

    # Join existing game instance
    @arc4.abimethod
    def join_game(
        self,
        game_id: UInt64,
        stake_pay: gtxn.PaymentTransaction,
    ) -> None:
        # Retrieve current game state from box using the game id parameter
        game_state = self.box_game_state[
            game_id
        ].copy()  # Make a copy of the game state else immutable

        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 2, err.INVALID_GROUP_SIZE
        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND
        assert self.box_game_trophy, err.BOX_NOT_FOUND

        assert stake_pay.amount == cst.STAKE_AMOUNT_MANAGER, err.INVALID_STAKE_PAY_FEE
        assert stake_pay.sender == Txn.sender, err.INVALID_STAKE_PAY_SENDER
        assert (
            stake_pay.receiver == Global.current_application_address
        ), err.INVALID_STAKE_PAY_RECEIVER
        assert (
            srt.check_acc_in_game(  # noqa: E712, RUF100
                game_id=game_id,
                account=Txn.sender,
                box_game_players=self.box_game_players,
                player_count=self.box_game_state[game_id].active_players.native,
                clear_player=False,
            )
            == False
        ), err.PLAYER_ACTIVE

        assert game_state.staking_finalized == False, err.STAKING_FINAL  # noqa: E712
        assert game_state.expiry_ts >= Global.latest_timestamp, err.TIME_CONSTRAINT_VIOLATION
        assert game_state.active_players <= game_state.max_players, err.FULL_GAME_LOBBY
        assert (
            game_state.box_p_start_pos.native
            < cst.ADDRESS_SIZE * game_state.max_players.native
        ), err.BOX_P_START_POS_OVERFLOW

        # For game players box, store the sender's address at the current game state box p_ start position
        game_players_bref = BoxRef(
            key=self.box_game_players.key_prefix + op.itob(game_id)
        )
        game_players_bref.replace(game_state.box_p_start_pos.native, Txn.sender.bytes)

        # Increment number of active players by 1
        game_state.active_players = arc4.UInt8(game_state.active_players.native + 1)

        # Increment current game players box offset by 32 so that next player address can be stored
        game_state.box_p_start_pos = arc4.UInt16(
            game_state.box_p_start_pos.native + cst.ADDRESS_SIZE
        )

        # Increment prize pool by stake payment amount
        game_state.prize_pool = arc4.UInt64(
            game_state.prize_pool.native + stake_pay.amount
        )

        # Check if game is live on every call
        srt.is_game_live(game_state)

        # Copy the modified game state and store it as new value of box
        self.box_game_state[game_id] = game_state.copy()

    # Get box commit rand contents with default start values
    @arc4.abimethod
    def get_box_commit_rand(self, box_c_pay: gtxn.PaymentTransaction) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 2, err.INVALID_GROUP_SIZE
        assert Txn.sender not in self.box_commit_rand, err.BOX_FOUND
        assert self.box_game_trophy, err.BOX_NOT_FOUND

        assert box_c_pay.amount == cst.BOX_C_COST, err.INVALID_BOX_PAY_FEE
        assert box_c_pay.sender == Txn.sender, err.INVALID_BOX_PAY_SENDER
        assert (
            box_c_pay.receiver == Global.current_application_address
        ), err.INVALID_BOX_PAY_RECEIVER

        # Initialize box commit rand w/ default start value
        srt.reset_box_commit_rand(
            box_commit_rand=self.box_commit_rand,
            account=Txn.sender,
            round_delta=UInt64(cst.BOX_C_EXP_ROUND_DELTA),
        )

    # Set box commit rand contents used for obtaining on-chain randomness and playing the game
    @arc4.abimethod
    def set_box_commit_rand(
        self,
        game_id: UInt64,
    ) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 1, err.STANDALONE_TXN_ONLY
        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND
        assert Txn.sender in self.box_commit_rand, err.BOX_NOT_FOUND
        assert (
            self.box_game_state[game_id].staking_finalized == True  # noqa: E712
        ), err.STAKING_FINAL
        assert (
            srt.check_acc_in_game(  # noqa: E712, RUF100
                game_id=game_id,
                account=Txn.sender,
                box_game_players=self.box_game_players,
                player_count=self.box_game_state[game_id].max_players.native,
                clear_player=False,
            )
            == True
        ), err.PLAYER_NOT_FOUND

        # Get box commit rand values
        commit_rand = self.box_commit_rand[
            Txn.sender
        ].copy()  # Make a copy of the game state else immutable

        # Fail transaction unless the assertion below evaluates True
        assert commit_rand.commit_round.native == 0, err.NON_ZERO_COMMIT_ROUND

        # Update commit rand commit round and game id fields with new values
        commit_rand.commit_round = arc4.UInt64(Global.round + 4)
        commit_rand.game_id = arc4.UInt64(game_id)

        # Copy the modified game state and store it as new value of box
        self.box_commit_rand[Txn.sender] = commit_rand.copy()

    # Allow caller to delete box commit rand contents for their own account
    @arc4.abimethod
    def del_box_commit_rand_for_self(
        self,
        game_id: UInt64,
    ) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 1, err.STANDALONE_TXN_ONLY
        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND
        assert Txn.sender in self.box_commit_rand, err.BOX_NOT_FOUND

        assert (self.box_commit_rand[Txn.sender].game_id.native == 0 or
            self.box_commit_rand[Txn.sender].game_id.native == game_id
        ), err.INVALID_GAME_ID

        # Check if box commit rand game id is not equal to zero
        if self.box_commit_rand[Txn.sender].game_id.native != 0:
            # Fail transaction unless the assertion below evaluates True
            assert (
                srt.check_acc_in_game(  # noqa: E712, RUF100
                    game_id=game_id,
                    account=Txn.sender,
                    box_game_players=self.box_game_players,
                    player_count=self.box_game_state[game_id].max_players.native,
                    clear_player=False,
                )
                == False
            ), err.PLAYER_ACTIVE

        # Delete sender box commit rand from the smart contract storage
        del self.box_commit_rand[Txn.sender]

        # Issue MBR refund for box commit rand deletion via a payment inner transaction
        srt.payout_itxn(
            receiver=Txn.sender,
            amount=UInt64(cst.BOX_C_COST),
            note=String(
                'pieout:j{"method":"del_box_commit_rand_for_self","concern":"txn.app_c;mbr_box_c_refund"}'
            ),
        )

    # Allow caller to delete box commit rand contents for another account
    @arc4.abimethod
    def del_box_commit_rand_for_other(self, player: Account) -> None:
        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 1, err.STANDALONE_TXN_ONLY

        assert player in self.box_commit_rand, err.BOX_NOT_FOUND
        assert player != Txn.sender, err.INVALID_CALLER

        assert self.box_commit_rand[player].commit_round.native == 0, err.NON_ZERO_COMMIT_ROUND
        assert self.box_commit_rand[player].expiry_round.native < Global.round, err.TIME_CONSTRAINT_VIOLATION

        # Delete sender box commit rand box from contract storage
        del self.box_commit_rand[player]

        # Resolve box commit rand deletion MBR refund receiver by priority
        receiver = srt.resolve_receiver_by_prio(
            acc1=player,
            acc2=Txn.sender,
            acc3=Global.creator_address,
        )

        # Issue MBR refund for box commit rand deletion via a payment inner transaction
        srt.payout_itxn(
            receiver=receiver,
            amount=UInt64(cst.BOX_C_COST),
            note=String(
                'pieout:j{"method":"del_box_commit_rand_for_other","concern":"itxn.pay;mbr_box_c_refund"}'
            ),
        )

    # Make app call to add extra resource reference budget, must be grouped w/ play game abimethod
    @arc4.abimethod
    def up_ref_budget_for_play_game(self, game_id: UInt64) -> None:
        # Get the second transaction in the group
        second_txn = gtxn.ApplicationCallTransaction(group_index=1)

        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 2, err.INVALID_GROUP_SIZE
        assert Txn.group_index == 0, err.INVALID_GROUP_IDX

        assert second_txn.app_id == Global.current_application_id, err.APP_ID_MISMATCH
        assert second_txn.sender == Txn.sender, err.SENDER_MISMATCH
        assert second_txn.app_args(0) == arc4.arc4_signature("play_game(uint64)void"), err.INVALID_METHOD_SELECTOR

        assert second_txn.app_args(1) == op.itob(game_id), err.INVALID_GAME_ID
        assert second_txn.app_args(1) == op.itob(self.box_commit_rand[Txn.sender].game_id.native)
        assert self.box_commit_rand[Txn.sender].game_id.native == game_id

    # Resolve the player's score associated with the specified game ID, updating game state accordingly
    @arc4.abimethod
    def play_game(self, game_id: UInt64) -> None:
        # Ensure transaction has sufficient opcode budget
        ensure_budget(required_budget=19600, fee_source=OpUpFeeSource.GroupCredit)

        # Get the first transaction in the group
        first_txn = gtxn.ApplicationCallTransaction(group_index=0)

        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 2, err.INVALID_GROUP_SIZE
        assert Txn.group_index == 1, err.INVALID_GROUP_IDX

        assert first_txn.app_id == Global.current_application_id, err.APP_ID_MISMATCH
        assert first_txn.sender == Txn.sender, err.SENDER_MISMATCH
        assert first_txn.app_args(0) == arc4.arc4_signature(
            "up_ref_budget_for_play_game(uint64)void"), err.INVALID_METHOD_SELECTOR

        assert first_txn.app_args(1) == Txn.application_args(1), err.INVALID_GAME_ID
        assert first_txn.app_args(1) == op.itob(self.box_commit_rand[Txn.sender].game_id.native)

        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND
        assert Txn.sender in self.box_commit_rand, err.BOX_NOT_FOUND
        assert self.box_game_trophy, err.BOX_NOT_FOUND
        assert (
            srt.check_acc_in_game(  # noqa: E712, RUF100
                game_id=game_id,
                account=Txn.sender,
                box_game_players=self.box_game_players,
                player_count=self.box_game_state[game_id].max_players.native,
                clear_player=True,
            )
            == True
        ), err.PLAYER_NOT_FOUND

        # Retrieve the game state value from its corresponding box using the game id parameter
        game_state = self.box_game_state[
            game_id
        ].copy()  # Make a copy of the game state else immutable

        # Fail transaction unless the assertions below evaluate True
        assert game_state.staking_finalized == True, err.STAKING_FINAL  # noqa: E712
        assert game_state.expiry_ts >= Global.latest_timestamp, err.TIME_CONSTRAINT_VIOLATION
        assert (
            self.box_commit_rand[Txn.sender].game_id.native == game_id
        ), err.INVALID_GAME_ID
        assert (
            Global.round >= self.box_commit_rand[Txn.sender].commit_round.native
        ), err.COMMIT_ROUND_NOT_REACHED

        # Call the Randomness Beacon smart contract that computes the VRF and outputs a randomness value
        seed = arc4.abi_call[Bytes](
            "must_get(uint64,byte[])byte[]",
            self.box_commit_rand[Txn.sender].commit_round.native,
            Txn.sender.bytes,
            app_id=600011887,  # TestNet VRF Beacon Application ID
        )[0]

        # Calculate player score and assign placement if their score qualifies
        srt.calc_score_get_place(
            game_id=game_id,
            score_id=self.score_id,
            game_state=game_state,
            player=Txn.sender,
            seed=seed,  # Use VRF output as seed outside LocalNet env
        )

        # Increment score id by 1
        self.score_id += 1

        # If game state first place score is higher than the ath score
        if game_state.first_place_score.native > self.ath_score:
            # Update ath score, game state first place score is the new ath score
            self.ath_score = game_state.first_place_score.native

            # If ath address is not empty
            if self.ath_address != Global.zero_address:
                # Use box game trophy contents to check account asset balance for trophy
                asset_balance, asset_exists = op.AssetHoldingGet.asset_balance(
                    self.box_game_trophy.value.owner_address.native,
                    self.box_game_trophy.value.asset_id.native,
                )

                # If asset exists and its balance is 1, perform clawback via asset transfer inner transaction
                if asset_exists and asset_balance == 1:
                    srt.clawback_itxn(
                        asset_id=self.box_game_trophy.value.asset_id.native,
                        asset_sender=self.box_game_trophy.value.owner_address.native,
                        asset_receiver=Global.current_application_address,
                        note=String(
                            'pieout:j{"method":"play_game","subroutine:"clawback_itxn","concern":"itxn.asset_transfer;clawback_trophy_asset"}'
                        ),
                    )

            # Update ath address, transaction sender is the new ath address
            self.ath_address = Txn.sender

            # Update trophy owner address, ath address is the new trophy asset owner address
            self.box_game_trophy.value.owner_address = arc4.Address(self.ath_address)

        # Decrement number of active players by 1
        game_state.active_players = arc4.UInt8(game_state.active_players.native - 1)

        # Reset box commit rand for sender after they have done their play
        srt.reset_box_commit_rand(
            box_commit_rand=self.box_commit_rand,
            account=Txn.sender,
            round_delta=UInt64(cst.BOX_C_EXP_ROUND_DELTA),
        )

        # Check if game is over on every call
        srt.is_game_over(
            game_id=game_id,
            game_state=game_state,
            box_game_players=self.box_game_players,
            box_commit_rand=self.box_commit_rand,
        )

        # Copy the modified game state and store it as new value of box
        self.box_game_state[game_id] = game_state.copy()

    # Allow an active player to check for a game event and trigger its progression
    @arc4.abimethod
    def trigger_game_prog(
        self, game_id: UInt64, trigger_id: arc4.UInt8
    ) -> arc4.Bool:
        # Retrieve current game state from box using the game id parameter
        game_state = self.box_game_state[
            game_id
        ].copy()  # Make a copy of the game state else immutable

        # Fail transaction unless the assertion below evaluates True
        assert Global.group_size == 1, err.STANDALONE_TXN_ONLY
        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND

        # If trigger id 0 corresponds w/ event: Game Live
        if trigger_id.native == 0:
            assert game_state.expiry_ts < Global.latest_timestamp, err.TIME_CONSTRAINT_VIOLATION
            is_game_live = srt.is_game_live(game_state)
            return is_game_live
        # If trigger id 2 corresponds w/ event: Game Over
        elif trigger_id.native == 2:
            assert game_state.staking_finalized == True, err.STAKING_FINAL  # noqa: E712
            assert game_state.expiry_ts < Global.latest_timestamp, err.TIME_CONSTRAINT_VIOLATION
            is_game_over = srt.is_game_over(
                game_id=game_id,
                game_state=game_state,
                box_game_players=self.box_game_players,
                box_commit_rand=self.box_commit_rand,
            )
            return is_game_over
        # Else, trigger id is not found, fail transaction
        else:
            assert False, err.TRIGGER_ID_NOT_FOUND  # noqa: B011

    # Allow admin to reset existing game instance
    @arc4.abimethod
    def reset_game(
        self,
        game_id: UInt64,
        stake_pay: gtxn.PaymentTransaction,
    ) -> None:
        # Fail transaction unless the assertions below evaluate True
        assert Global.group_size == 2, err.INVALID_GROUP_SIZE
        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND

        assert stake_pay.sender == Txn.sender, err.INVALID_STAKE_PAY_SENDER
        assert (
            stake_pay.receiver == Global.current_application_address
        ), err.INVALID_STAKE_PAY_RECEIVER
        assert stake_pay.amount >= cst.STAKE_AMOUNT_MANAGER, err.INVALID_STAKE_PAY_FEE

        # Retrieve current game state from box using the game id parameter
        game_state = self.box_game_state[
            game_id
        ].copy()  # Make a copy of the game state else immutable

        # Fail transaction unless the assertion below evaluates True
        assert game_state.staking_finalized == True, err.STAKING_FINAL  # noqa: E712
        assert game_state.admin_address == Txn.sender, err.INVALID_ADMIN
        assert game_state.prize_pool.native == 0, err.NON_ZERO_PRIZE_POOL
        assert game_state.active_players.native == 0, err.NON_ZERO_ACTIVE_PLAYERS

        # For game players box, replace the sender's address at start index 0
        game_players_bref = BoxRef(
            key=self.box_game_players.key_prefix + op.itob(game_id)
        )
        game_players_bref.replace(0, Txn.sender.bytes)

        # Reset game state fields back to their new game values
        game_state.staking_finalized = arc4.Bool(False)  # noqa: FBT003
        game_state.active_players = arc4.UInt8(1)
        game_state.first_place_score = arc4.UInt8(0)
        game_state.second_place_score = arc4.UInt8(0)
        game_state.third_place_score = arc4.UInt8(0)
        game_state.box_p_start_pos = arc4.UInt16(cst.ADDRESS_SIZE)
        game_state.expiry_ts = arc4.UInt64(
            Global.latest_timestamp + cst.EXPIRY_INTERVAL
        )
        game_state.prize_pool = arc4.UInt64(
            game_state.prize_pool.native + cst.STAKE_AMOUNT_MANAGER
        )
        game_state.first_place_address = arc4.Address(Global.zero_address)
        game_state.second_place_address = arc4.Address(Global.zero_address)
        game_state.third_place_address = arc4.Address(Global.zero_address)

        # Copy the modified game state and store it as new value of box
        self.box_game_state[game_id] = game_state.copy()

    # Allow application creator or admin to delete existing game instance
    @arc4.abimethod
    def delete_game(
        self,
        game_id: UInt64,
    ) -> None:
        # Retrieve current game state from box using the game id parameter
        game_state = self.box_game_state[
            game_id
        ].copy()  # Make a copy of the game state else immutable

        # Fail transaction unless the assertions below evaluate True
        assert Global.group_size == 1, err.STANDALONE_TXN_ONLY
        assert game_id in self.box_game_state, err.GAME_ID_NOT_FOUND
        assert (
            Txn.sender == self.box_game_state[game_id].admin_address.native
            or Txn.sender == Global.creator_address
        ), err.INVALID_CALLER

        # Ensure game has zero active players OR only player left is the admin
        acc_in_game = False
        if game_state.active_players.native == 1:
            acc_in_game = srt.check_acc_in_game(
                game_id=game_id,
                account=self.box_game_state[game_id].admin_address.native,
                box_game_players=self.box_game_players,
                player_count=UInt64(1),
                clear_player=False,
            )

            # Fail transaction unless the assertion below evaluates True
            assert acc_in_game == True, err.ADMIN_SOLE_PLAYER  # noqa: E712

            # Issue prize pool payouts of admin stake if they delete a game where they the sole player
            srt.payout_itxn(
                receiver=Txn.sender,
                amount=game_state.prize_pool.native,
                note=String(
                    'pieout:j{"method":"delete_game","concern":"itxn.pay;prize_pool_admin_stake"}'
                ),
            )

        else:
            # Fail transaction unless the assertion below evaluates True
            assert game_state.active_players.native == 0, err.NON_ZERO_ACTIVE_PLAYERS
            assert game_state.prize_pool.native == 0, err.NON_ZERO_PRIZE_POOL

        # Delete box game state and box game players from contract storage
        del self.box_game_state[game_id]
        del self.box_game_players[game_id]

        # Calculate box game players fee
        box_p_cost = self.calc_single_box_cost(
            key_size=arc4.UInt8(10),
            value_size=arc4.UInt16(cst.ADDRESS_SIZE * game_state.max_players.native),
        )

        # Issue MBR refund for box game state and box game players deletion via a payment inner transaction
        srt.payout_itxn(
            receiver=Txn.sender,
            amount=cst.BOX_S_COST + box_p_cost,
            note=String(
                'pieout:j{"method":"delete_game","concern":"itxn.pay;box_s_mbr_refund+box_p_mbr_refund"}'
            ),
        )

    # Allow application creator to delete the smart contract application
    @arc4.abimethod(allow_actions=["DeleteApplication"])
    def terminate(self) -> None:
        # Fail transaction unless the assertions below evaluate True
        assert TemplateVar[bool]("DELETABLE"), err.DELETEABLE_NOT_TRUE
        assert Txn.sender == Global.creator_address, err.INVALID_CREATOR

        # Check if box game trophy exists
        if self.box_game_trophy:
            # Use box game trophy contents to check app account asset balance for trophy
            asset_balance, asset_exists = op.AssetHoldingGet.asset_balance(
                Global.current_application_address,
                self.box_game_trophy.value.asset_id.native,
            )
            # If asset exists and its balance is 1, perform burn via asset config inner transaction
            if asset_exists and asset_balance == 1:
                srt.burn_itxn(
                    asset_id=self.box_game_trophy.value.asset_id.native,
                    note=String(
                        'pieout:j{"method":"terminate","concern":"itxn.asset_config;burn_trophy_asset"}'),
                )
            # Delete box game trophy from contract storage if it exsists
            del self.box_game_trophy.value

        # Issue payment inner transaction closing all remaining funds in application account balance
        itxn.Payment(
            receiver=Txn.sender,
            amount=0,
            close_remainder_to=Txn.sender,
            note=b'pieout:j{"method":"terminate","concern":"itxn.pay;close_remainder_to"}',
        ).submit()
