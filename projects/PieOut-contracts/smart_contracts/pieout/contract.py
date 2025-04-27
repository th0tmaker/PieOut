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
    op,
    urange,
)

# Define constants at module level
STAKE_AMOUNT = 200_000
MAX_PLAYERS = 10
ELIM_THRESHOLD = 10992


# State struct for player box value
class PlayerBoxVal(arc4.Struct):
    id: arc4.UInt8  # Player unique game ID
    turn: arc4.UInt8  # Current game turn player has reached
    staked: arc4.Bool  # Whether the player has staked (if True, they are valid player)
    pending: (
        arc4.Bool
    )  # Whether the player is in pending mode (if True, they already use gamba this turn)
    eliminated: arc4.Bool  # Whether the player is eliminated (if True, game over)
    winner: arc4.Bool  # Whether the player has won (if True, eligable for prize)


class Pieout(ARC4Contract):
    # Global State type declarations
    total_players: UInt64
    players_pending: UInt64
    players_elim: UInt64

    total_stake: UInt64
    creator_stake_status: UInt64
    staking_finalized: UInt64

    pa_box_offset: UInt64
    current_turn: UInt64

    # Application init method
    def __init__(self) -> None:
        super().__init__()
        # Box Storage type declarations
        self.box_player = BoxMap(Account, PlayerBoxVal, key_prefix=b"p_")
        self.box_player_addrs = BoxMap(Bytes, Bytes, key_prefix=b"")

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

        self.total_players = UInt64(0)
        self.players_pending = UInt64(0)
        self.players_elim = UInt64(0)

        self.total_stake = UInt64(0)
        self.creator_stake_status = UInt64(0)
        self.staking_finalized = UInt64(0)

        self.pa_box_offset = UInt64(0)
        self.current_turn = UInt64(0)

    @arc4.abimethod
    def create_player_addrs_box(self, box_pay: gtxn.PaymentTransaction) -> None:
        # Get and store commonly used addresses
        txn_sender = Txn.sender

        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            txn_sender == Global.creator_address
        ), "Transaction sender address must match application creator address."

        assert (
            txn_sender == box_pay.sender
        ), "stake(): Box payment sender address must match transaction sender address."

        assert (
            Global.current_application_address == box_pay.receiver
        ), "stake(): Box payment reciever address must match transaction sender address."

        assert box_pay.amount >= self.calc_single_box_fee(
            key_size=arc4.UInt8(3), value_size=arc4.UInt16(320)
        ), "stake(): Insufficient amount. Box pay amount does not cover application MBR."

        # Create new box that will store every player address that staked
        self.box_player_addrs[Bytes(b"pa_")] = op.bzero(320)

    @arc4.abimethod
    def stake(
        self, box_pay: gtxn.PaymentTransaction, stake_pay: gtxn.PaymentTransaction
    ) -> None:
        # Get and store commonly used addresses
        txn_sender = Txn.sender
        app_address = Global.current_application_address
        creator_address = Global.creator_address

        assert (
            self.staking_finalized == 0
        ), "stake(): Rejected. Can only stake when staking is not finalized."

        # Fail transaction unless the assertion/s below evaluate/s True
        if self.creator_stake_status == 0:
            assert (
                txn_sender == creator_address
            ), "stake(): Rejected. Application creator account must stake first before any other account."

            self.creator_stake_status = UInt64(1)

        assert (
            txn_sender not in self.box_player
        ), "stake(): Transaction sender address already staked."

        assert (
            txn_sender == box_pay.sender and txn_sender == stake_pay.sender
        ), "stake(): Box and Stake payment sender address must match transaction sender address."

        assert (
            app_address == box_pay.receiver and app_address == stake_pay.receiver
        ), "stake(): Box and Stake payment reciever address must match transaction sender address."

        assert (
            box_pay.amount
            >= 17_300  #  self.calc_single_box_fee(key_size=arc4.UInt8(34), value_size=arc4.UInt16(3)
        ), "stake(): Insufficient amount. Box pay amount does not cover application MBR."

        assert (
            stake_pay.amount == STAKE_AMOUNT
        ), "stake(): Insufficient amount. Stake pay amount does not cover minimum entry fee."

        assert self.total_players < MAX_PLAYERS, "stake(): Max player limit exceeded."

        # Assign a Player box to transaction sender
        # Store sender address as box key and PlayerBoxVal struct as box value
        is_true = arc4.Bool(True)  # noqa: FBT003
        is_false = arc4.Bool(False)  # noqa: FBT003
        self.box_player[txn_sender] = PlayerBoxVal(
            id=arc4.UInt8(self.total_players),
            turn=arc4.UInt8(self.current_turn),
            staked=is_true,
            pending=is_false,
            eliminated=is_false,
            winner=is_false,
        )

        # Increment total stake count by the stake pay amount
        self.total_stake += stake_pay.amount

        # Increment total players count by 1 for every new player
        self.total_players += 1

        # When max number of players is reached, finalize staking and open gamba
        if self.total_players == MAX_PLAYERS:
            self.staking_finalized = UInt64(1)

        # Replace 32 bytes of zeroes in player addresses box with the transaction sender address
        if self.pa_box_offset <= 288:
            op.Box.replace(b"pa_", self.pa_box_offset, txn_sender.bytes)
            self.pa_box_offset += 32  # Increment offset by address length

    # @arc4.abimethod
    # def up_ref_budget(self) -> UInt64:
    #     return UInt64(1337)

    # subroutine
    # def advance_turn(self) -> UInt64:
    #     if self.total_pending == MAX_PLAYERS or # Turn time has expired

    @arc4.abimethod
    def gamba(self) -> UInt64:
        # Ensure transaction has sufficient opcode budget
        ensure_budget(required_budget=1400, fee_source=OpUpFeeSource.GroupCredit)

        # Get and store commonly used addresses
        txn_sender = Txn.sender
        method_selector = Txn.application_args(0)

        current_app_id = Global.current_application_id.id
        atxn_group_size = Global.group_size

        player = self.box_player[txn_sender].copy()
        current_player_turn = player.turn.native

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

        temp_seed = op.sha256(op.itob(Global.round) + Txn.tx_id)
        roll = op.extract_uint16(temp_seed, 16)

        if roll >= ELIM_THRESHOLD:
            current_player_turn += 1
            player.turn = arc4.UInt8(current_player_turn)
            self.box_player[txn_sender] = player.copy()
        else:
            self.players_elim += 1

        self.players_pending += 1

        if self.players_pending == self.total_players:
            if self.players_elim != self.total_players:
                self.total_players -= self.players_elim
                self.current_turn += 1

            # RESET LOGIC
            self.players_elim = UInt64(0)
            self.players_pending = UInt64(0)

        # if self.total_pending == MAX_PLAYERS:

        #     # self.up_ref_budget()

        #     player_addrs = self.player_addrs[Bytes(b"pa_")]
        #     for i in urange(0, player_addrs.length, 32):
        #         addr = Account.from_bytes(op.extract(player_addrs, i, 32))
        #         player = self.player[addr].copy()
        #         player.pending = arc4.Bool(False)  # noqa: FBT003
        #         self.player[addr] = player.copy()

        return roll

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
