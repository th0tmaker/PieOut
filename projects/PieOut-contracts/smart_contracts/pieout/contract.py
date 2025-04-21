from algopy import (
    Account,
    ARC4Contract,
    BoxMap,
    Global,
    TemplateVar,
    Txn,
    UInt64,
    arc4,
    gtxn,
)


# State struct for player box value
class PlayerBoxVal(arc4.Struct):
    id: arc4.UInt8  # Player unique game ID
    round: arc4.UInt8  # Current game round player has reached
    nxnce: arc4.UInt16  # Nxnce for state change tracking
    staked: arc4.Bool  # Whether the player has staked (if True, they are valid player)
    eliminated: arc4.Bool  # Whether the player is eliminated (if True, game over)
    winner: arc4.Bool  # Whether the player has won (if True, eligable for prize)


class Pieout(ARC4Contract):
    # Global State type declarations
    total_stake: UInt64
    total_players: UInt64

    def __init__(self) -> None:
        super().__init__()
        # Box Storage type declarations
        self.player = BoxMap(Account, PlayerBoxVal, key_prefix=b"p_")

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

    # Generate the smart contract application client with default values
    @arc4.abimethod(create="require")
    def generate(self) -> None:
        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            Txn.sender == Global.creator_address
        ), "Transaction sender address must match application creator address."

        self.total_stake = UInt64(0)
        self.total_players = UInt64(1)

    @arc4.abimethod
    def stake(
        self, box_pay: gtxn.PaymentTransaction, stake_pay: gtxn.PaymentTransaction
    ) -> None:
        # Fail transaction unless the assertion/s below evaluate/s True
        assert (
            box_pay.sender == Txn.sender and stake_pay.sender == Txn.sender
        ), "stake(): Box and Stake payment sender address must match transaction sender address."

        assert (
            box_pay.receiver == Global.current_application_address
            and stake_pay.receiver == Global.current_application_address
        ), "stake(): Box and Stake payment reciever address must match transaction sender address."

        assert box_pay.amount >= self.calc_single_box_fee(
            key_size=arc4.UInt8(34), value_size=arc4.UInt16(7)
        ), "stake(): Insufficient amount. Box pay amount does not cover application MBR."

        assert (
            stake_pay.amount == 200_000
        ), "stake(): Insufficient amount. Stake pay amount does not cover minimum entry fee."

        assert (
            Txn.sender not in self.player
        ), "stake(): Transaction sender address already recognized as active player."

        assert self.total_players <= 10, "stake(): Max player limit exceeded."

        # Assign a Player box to transaction sender
        # Store sender address as box key and PlayerBoxVal struct as box value
        self.player[Txn.sender] = PlayerBoxVal(
            id=arc4.UInt8(self.total_players),
            round=arc4.UInt8(0),
            nxnce=arc4.UInt16(0),
            staked=arc4.Bool(True),  # noqa: FBT003
            eliminated=arc4.Bool(False),  # noqa: FBT003
            winner=arc4.Bool(False),  # noqa: FBT003
        )

        # Increment total stake count by the stake pay amount
        self.total_stake += stake_pay.amount

        # Increment total players count by 1 for every new player
        self.total_players += 1

    # Retrieve the genesis (creation) timestamp of the contract in Unix format
    @arc4.abimethod(readonly=True)
    def get_gen_unix(self) -> UInt64:
        return TemplateVar[UInt64]("GEN_UNIX")

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
