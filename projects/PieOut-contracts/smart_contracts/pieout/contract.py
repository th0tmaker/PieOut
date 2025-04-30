from typing import Literal

from algopy import (
    Account,
    ARC4Contract,
    BoxMap,
    Bytes,
    Global,
    OpUpFeeSource,
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

from lib_pcg import pcg16_init, pcg16_random

# Define constants at module level
STAKE_AMOUNT_CREATOR = 272_000
STAKE_AMOUNT_OTHER = 500_000
MAX_PLAYERS = 10
ELIM_THRESHOLD = 10992


# State struct for player box value
class PlayerBoxVal(arc4.Struct):
    turn: arc4.UInt16

    spread: arc4.DynamicArray[arc4.UInt16]



class Pieout(ARC4Contract):
    # Global State type declarations
    total_players: UInt64
    players_pending: UInt64
    players_elim: UInt64

    creator_stake_status: UInt64
    staking_finalized: UInt64

    current_turn: UInt64

    prize_pool: UInt64
    prize_pool_claimed: UInt64

    vrf_commit_id: UInt64

    # Application init method
    def __init__(self) -> None:
        super().__init__()
        # Box Storage type declarations
        self.box_player = BoxMap(Account, PlayerBoxVal, key_prefix=b"p_")

    # Calculate the minimum balance requirement (MBR) fee for data storage in a single box unit
    @arc4.abimethod(readonly=True)
    def calc_single_box_fee(
        self, key_size: arc4.UInt8, value_size: arc4.UInt16
    ) -> UInt64:

        # Formula for calculating single box fee
        base_fee = arc4.UInt16(2_500)  # Base fee (2_500)
        size_fee = arc4.UInt16(400).native * (
            key_size.native + value_size.native
        )  # Size fee (400 per byte * (len(key)+len(value)))

        # Return single box fee
        return base_fee.native + size_fee

    # Retrieve the genesis (creation) timestamp of the contract in Unix format
    @arc4.abimethod(readonly=True)
    def get_gen_unix(self) -> UInt64:
        return TemplateVar[UInt64]("GEN_UNIX")

    # Generate the smart contract application client with default values
    @arc4.abimethod(create="require")
    def generate(self) -> None:
        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            Txn.sender == Global.creator_address
        ), "Transaction sender address must match application creator address."

        # Initialize Global storage with desired value assignments
        self.total_players = UInt64(0)
        self.players_pending = UInt64(0)
        self.players_elim = UInt64(0)

        self.creator_stake_status = UInt64(0)
        self.staking_finalized = UInt64(0)

        self.current_turn = UInt64(0)

        self.prize_pool = UInt64(0)
        self.prize_pool_claimed = UInt64(0)

        self.vrf_commit_id = UInt64(0)


    @arc4.abimethod
    def stake(
        self,
        box_pay: gtxn.PaymentTransaction,
        stake_pay: gtxn.PaymentTransaction,
    ) -> None:
        # Ensure transaction has sufficient opcode budget
        ensure_budget(required_budget=6300, fee_source=OpUpFeeSource.GroupCredit)

        # Local scope cache commonly used values
        txn_id = Txn.tx_id
        txn_sender_address = Txn.sender
        app_address = Global.current_application_address
        creator_address = Global.creator_address
        current_round = Global.round

        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            self.staking_finalized == 0
        ), "stake(): Rejected. Can only stake when staking is not finalized."

        assert (
            txn_sender_address not in self.box_player
        ), "stake(): Transaction sender address already staked."

        if self.creator_stake_status == 0:
            assert (
                txn_sender_address == creator_address
            ), "stake(): Rejected. Application creator account must stake first before any other account."

            self.creator_stake_status = UInt64(1)

        # NOTE: Below applies only if no intention of deleting box and app, otherwise keep one stake amount
        assert (
            stake_pay.amount == (STAKE_AMOUNT_CREATOR if txn_sender_address == creator_address else STAKE_AMOUNT_OTHER)
        ), "stake(): Insufficient amount. Payment transaction does not meet the required stake amount."

        assert (
            box_pay.amount
            >= 97_700  #  self.calc_single_box_fee(key_size=arc4.UInt8(34), value_size=arc4.UInt16(204)
        ), "stake(): Insufficient amount. Box pay amount does not cover application MBR."

        assert (
            txn_sender_address == box_pay.sender and txn_sender_address == stake_pay.sender
        ), "stake(): Box and Stake payment sender address must match transaction sender address."

        assert (
            app_address == box_pay.receiver and app_address == stake_pay.receiver
        ), "stake(): Box and Stake payment reciever address must match transaction sender address."


        assert self.total_players < MAX_PLAYERS, "stake(): Max player limit exceeded."

        # Pseudo-randomly select a round offset of 2, 3, or 4
        round_offset = op.btoi(op.extract(op.sha256(txn_id + op.itob(current_round)), 0, 2)) % 3 + 2

        # Define VRF commit round by adding round offset to current round
        commit_round = current_round + round_offset

        # Define VRF salt data to influence output seed
        commit_salt = op.sha256(
              txn_id
            + box_pay.txn_id
            + stake_pay.txn_id
            + op.itob(self.vrf_commit_id)
        )

        # Fail transaction unless the assertion below evaluates True
        assert (
            current_round >= commit_round  # The commit round is intentionally a future round for security reasons
        ), "Randomness commit round not reached yet."

        # Call the Randomness Beacon smart contract that computes the VRF and outputs a randomness value
        seed = arc4.abi_call[Bytes](
            "must_get(uint64,byte[])byte[]",
            commit_round,
            commit_salt,
            app_id=600011887,  # TestNet VRF Beacon Application ID
        )[0]

        # Take a portion of the seed to generate a sequence of random unsigned 16-bit integers
        state = pcg16_init(seed=op.extract(seed, 16, 8))
        sequence = pcg16_random(state=state, lower_bound=UInt64(1), upper_bound=UInt64(0), length=UInt64(100))[1]

        # Assign player box to transaction sender
        self.box_player[txn_sender_address] = PlayerBoxVal(
            turn=arc4.UInt16(self.current_turn),
            spread=sequence,
        )

        # Increment VRF commit ID by 1
        self.vrf_commit_id += 1

        # Increment total players count by 1 for every new player
        self.total_players += 1

        # Increment prize pool by the stake pay amount
        self.prize_pool += stake_pay.amount

        # When max number of players is reached, finalize staking and open gamba
        if self.total_players == MAX_PLAYERS:
            self.staking_finalized = UInt64(1)

    @arc4.abimethod
    def gamba(self) -> UInt64:
        # Ensure transaction has sufficient opcode budget
        ensure_budget(required_budget=1400, fee_source=OpUpFeeSource.GroupCredit)

        # Local scope cache commonly used values
        txn_id = Txn.tx_id
        txn_sender = Txn.sender
        txn_first_valid = Txn.first_valid
        method_selector = Txn.application_args(0)
        current_app_id = Global.current_application_id.id
        atxn_group_size = Global.group_size
        atxn_group_id = Global.group_id
        current_round = Global.round

        # # NOTE: LOAD COMMIT RAND BOX HERE

        # rand_commit = self.box_rand_commit[txn_sender].copy()

        # # Define VRF salt data to influence output
        # salt = op.sha256(
        #     rand_commit.salt.bytes
        #     + atxn_group_id
        #     + txn_id
        #     + op.itob(txn_first_valid)
        #     + op.itob(self.commit_rand_id)
        # )

        # # Fail transaction unless the assertion below evaluates True
        # assert (
        #     current_round >= rand_commit.round
        # ), "Randomnes commit round not reached yet."


        # # Call the Randomness Beacon smart contract that computes the VRF and outputs a randomness value
        # seed, rand_itxn = arc4.abi_call[Bytes](
        #     "must_get(uint64,byte[])byte[]",
        #     rand_commit.round,
        #     salt,
        #     app_id=600011887,  # TestNet VRF Beacon Application ID
        # )

        # # A temporary RNG seed and roll (use VRF Randomness Beacon call in real use case)
        temp_seed = op.sha256(op.itob(Global.round) + Txn.tx_id)
        roll = op.extract_uint16(temp_seed, 16)

        # Create a copy of the player box and store the value turn value of that copy
        player = self.box_player[txn_sender].copy()
        current_player_turn = player.turn.native

        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            atxn_group_size >= 2 and atxn_group_size <= MAX_PLAYERS
        ), "gamba(): Rejected. Atomic transaction group size is out of bounds."

        for i in urange(0, atxn_group_size):
            txn_i = gtxn.Transaction(i)

            for j in urange(0, i):
                txn_j = gtxn.Transaction(j)

                assert (
                    txn_i.sender.bytes != txn_j.sender.bytes
                ), "gamba(): Rejected. Every transaction in group must have unique sender address."

            assert (
                txn_i.app_args(0) == method_selector
            ), "gamba(): Rejected. Method selector mismatch not allowed."

            assert (
                txn_i.app_id.id == current_app_id
            ), "gamba(): Rejected. Application ID mismatch not allowed."

        assert (
            self.staking_finalized == 1
        ), "gamba(): Rejected. Gamba not available until staking is finalized."

        assert (
            self.total_players >= 2 and self.total_players <= MAX_PLAYERS
        ), "gamba(): Rejected. Total number of players must not be out of bounds."

        assert (
            current_player_turn == self.current_turn
        ), "gamba(): Rejected. Transaction sender turn is not aligned with current turn."


        # If roll is above elimination threshold, player has advanced to next turn
        if roll >= 33333:
            # Increment current player turn and store it as the new turn value in player box
            current_player_turn += 1
            player.turn = arc4.UInt16(current_player_turn)
            self.box_player[txn_sender] = player.copy()
        # If roll is below elimination threshold, player has been eliminated
        else:
            self.players_elim += 1  # Increment the players eliminated counter

            # # NOTE: BELOW CAN NOT BE HERE, NEEDS TO BE IN SEPARATE METHOD
            # del self.box_player[txn_sender]

            # box_player_refund_itxn = itxn.Payment(
            #     receiver=txn_sender,
            #     amount=16_900,
            # ).submit()

            # assert (
            #     box_player_refund_itxn.receiver == txn_sender
            # ), "gamba(): Rejected. Box player refund itxn reciever address must match transaction sender address."


        self.players_pending += 1

        if self.players_pending == self.total_players:
            if self.players_elim != self.total_players:
                self.total_players -= self.players_elim
                self.current_turn += 1

            self.players_elim = UInt64(0)
            self.players_pending = UInt64(0)

        return roll


    @arc4.abimethod
    def claim_prize_pool(self) -> None:
        # Local scope cache commonly used values
        txn_sender = Txn.sender

        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            self.staking_finalized == 1
        ), "claim_prize_pool(): Rejected. Premature attempt to claim prize pool. Staking must be finalized first."

        assert (
            self.total_players == 1
        ), "claim_prize_pool(): Rejected. Premature attempt to claim prize pool. Winner not decided yet."

        assert (
            self.prize_pool_claimed == 0
        ), "claim_prize_pool(): Rejected. Prize pool already claimed."

        assert (
            txn_sender in self.box_player
        ), "claim_prize_pool(): Rejected. Transaction sender has no box player data to evaluate against."

        player = self.box_player[txn_sender].copy()

        assert (
            player.turn == self.current_turn
        ), "claim_prize_pool(): Rejected. Turn mismatch. Transaction sender is not a valid winner address."

        # Mark prize pool as claimed
        self.prize_pool_claimed = UInt64(1)

        # Transaction sender (winner) recieves the prize pool amount via payment inner transaction
        itxn.Payment(
            receiver=txn_sender,
            amount=self.prize_pool,
        ).submit()

        # Clear total players and prize pool
        self.total_players = UInt64(0)
        self.prize_pool = UInt64(0)

    # Allow application creator to delete the smart contract client
    @arc4.abimethod(allow_actions=["DeleteApplication"])
    def terminate(self) -> None:
        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            Txn.sender == Global.creator_address
        ), "Transaction sender address must match application creator address."

        assert TemplateVar[bool](
            "DELETABLE"
        ), "Template variable 'DELETABLE' needs to be 'True' at deploy-time."
