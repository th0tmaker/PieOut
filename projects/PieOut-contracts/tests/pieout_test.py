# tests/pieout_test.py
import base64
import json
import logging
from datetime import datetime

import pytest
from algokit_utils import (
    AppCallMethodCallParams,
    AppClientCompilationParams,
    AssetOptInParams,
    BoxReference,
    CommonAppCallParams,
    FundAppAccountParams,
    OnSchemaBreak,
    OnUpdate,
    PaymentParams,
    SendParams,
    TealTemplateParams,
    micro_algo,
)
from algokit_utils.algorand import AlgorandClient
from algokit_utils.models import SigningAccount
from algosdk.abi import Contract, Method
from algosdk.encoding import encode_address
from algosdk.transaction import SuggestedParams, wait_for_confirmation

from dotenv import load_dotenv
from smart_contracts.artifacts.pieout.pieout_client import (
    PieoutClient,
    PieoutFactory,
    PieoutMethodCallCreateParams,
    PieoutMethodCallDeleteParams,
)
from smart_contracts.pieout import constants as cst

from .helpers import create_payment_txn, send_app_call_txn, view_app_boxes
from .subscriber import (
    AlgorandSubscriber,
    create_subscriber,
    log_subbed_arc28_events,
)

# Setup the logging.Logger
logger = logging.getLogger(__name__)

# Load TestNet environment variables
load_dotenv(".env.testnet")


# Return an instance of the AlgorandClient object from the environment config
@pytest.fixture(scope="session")
def algorand() -> AlgorandClient:
    algorand = AlgorandClient.from_environment()
    algorand.set_default_validity_window(validity_window=100)

    sp = algorand.client.algod.suggested_params()
    sp.min_fee = 1_000

    # logger.info(f"Fee: {sp.fee}")
    # logger.info(f"First Valid Round: {sp.first}")
    # logger.info(f"Last Valid Round: {sp.last}")
    # logger.info(f"Genesis ID: {sp.gen}")
    # logger.info(f"Genesis Hash: {sp.gh}")
    logger.info(f"Min Fee: {sp.min_fee}")
    # logger.info(f"Consensus Version: {sp.consensus_version}")
    # logger.info(f"Flat Fee: {sp.flat_fee}")

    algorand.set_suggested_params_cache(suggested_params=sp)

    return algorand


# Return an instance of the AlgorandSubscriber object to listen for network events
@pytest.fixture(scope="session")
def subscriber(algorand: AlgorandClient) -> AlgorandSubscriber:
    return create_subscriber(algod_client=algorand.client.algod, max_rounds_to_sync=30)


# Return a dispenser account as SigningAccount object that will fund other accounts
@pytest.fixture(scope="session")
def dispenser(algorand: AlgorandClient) -> SigningAccount:
    return algorand.account.dispenser_from_environment()  # LocalNet
    # return algorand.client.get_testnet_dispenser()  # TestNet


# # Generate a random account that will act as the default creator account for testing
# @pytest.fixture(scope="session")
# def creator(algorand: AlgorandClient, dispenser: SigningAccount) -> SigningAccount:
#     # Create a random Algorand account to represent the creator account
#     creator = algorand.account.random()

#     # Send signed payment transaction using the Algorand client
#     algorand.send.payment(
#         PaymentParams(
#             sender=dispenser.address,
#             signer=dispenser.signer,
#             receiver=creator.address,
#             amount=micro_algo(50_000_000),
#         )
#     )
#     # Return the creator account
#     return creator


# Create a dictionary to store any TestNet accounts that were genereated and written to a JSON file
@pytest.fixture(scope="session")
def accs() -> dict[str, SigningAccount]:
    # Load TestNet account data from JSON
    with open("testnet_accs.json") as f:
        testnet_accs = json.load(f)

    # Create a dictionary to store accounts for easy access
    accs = {
        name: SigningAccount(
            private_key=testnet_accs[name]["private_key"],
            address=testnet_accs[name]["address"],
        )
        for name in ["creator"] + [f"randy_{i}" for i in range(1, 10)]
    }  # Change range `stop` param to add more accounts

    # NOTE: Don't forget to fund the accounts with TestNet ALGO!
    # Use a.) `TestNetDispenserApiClient` or b.) `https://bank.testnet.algorand.network/`

    return accs


# Return a typed smart contract factory with default sender and signer
@pytest.fixture(scope="session")
def app_factory(
    algorand: AlgorandClient,
    # creator: SigningAccount,
    accs: dict[str, SigningAccount],
) -> PieoutFactory:
    # Define the on-deployment/compilation parameters
    template_params: TealTemplateParams = {
        "GEN_UNIX": int(datetime.now().timestamp()),
    }

    # Get creator account from accs dict
    creator = accs["creator"]

    # Return typed app factory object
    return algorand.client.get_typed_app_factory(
        PieoutFactory,
        default_sender=creator.address,
        default_signer=creator.signer,
        compilation_params=AppClientCompilationParams(
            deploy_time_params=template_params,
            updatable=None,
            deletable=True,
        ),
    )


# # Create a factory that can generate an arbitrary amount of random localnet test accounts called Randy
# @pytest.fixture(scope="session")
# def randy_factory(algorand: AlgorandClient, dispenser: SigningAccount) -> dict:
#     # Define the number of randy accounts that will be created and used for testing
#     randy_accounts = 9

#     # Create a list to store all the randy accounts that were randomly generated by the Algorand client
#     randies = [algorand.account.random() for _ in range(randy_accounts)]

#     # Create a list to store all the funding amounts (first randy gets 30_000_000, subsequent ones get 1_000_000 less)
#     funding_amounts = [30_000_000 - i * 1_000_000 for i in range(randy_accounts)]

#     # Take the matching indices of both lists and zip them into a tuple then iterate through a new list of these tuples
#     for randy, amount in zip(randies, funding_amounts):
#         algorand.send.payment(
#             PaymentParams(
#                 sender=dispenser.address,
#                 signer=dispenser.signer,
#                 receiver=randy.address,
#                 amount=micro_algo(amount),
#             )
#         )  # Send signed txn through the Algorand client

#     # Return a dict with all randy accounts (output: dict[str, AddressAndSigner])
#     return {f"randy_{i+1}": randy for i, randy in enumerate(randies)}


# Create smart contract client using factory deploy method
@pytest.fixture(scope="session")
def sc_client(app_factory: PieoutFactory) -> PieoutClient:
    # Provide deployment requirements and extract the smart contract client from the app factory object
    sc_client = app_factory.deploy(
        on_update=OnUpdate.ReplaceApp,
        on_schema_break=OnSchemaBreak.ReplaceApp,
        create_params=PieoutMethodCallCreateParams(
            method="generate",
            max_fee=micro_algo(50_000),
            note=b'pieout:j{"concern":"txn.app_call;create_app"}',),
        delete_params=PieoutMethodCallDeleteParams(
            method="terminate",
            max_fee=micro_algo(50_000),
            static_fee=micro_algo(3_000),
            note=b'pieout:j{"concern":"txn.app_call;delete_app"}',),
        # send_params=SendParams(cover_app_call_inner_transaction_fees=True)
    )[0]

    # Return the smart contract client w/ creator account as default sender and signer
    return sc_client


# Create a dict called apps that stores as many smart contract clients as needed
@pytest.fixture(scope="session")
def apps(
    sc_client: PieoutClient,
) -> dict:
    # Initialize new dict w/ that stores the creator smart contract (named "app_client_1") as its first element
    apps = {"pieout_client_1": PieoutClient(app_client=sc_client.app_client)}

    # Log
    logger.info(
        f"APP CLIENT 1 ID: {apps['pieout_client_1'].app_id}"
    )  #  Check client 1 app ID

    # Return apps dict with app clients (output: dict[str, PieoutClient])
    return apps


# # Return an ABI compliant Contract object made from the smart contract json file
# @pytest.fixture(scope="session")
# def sc() -> Contract:
#     with open("./smart_contracts/artifacts/pieout/Pieout.arc56.json") as f:
#         js = json.load(f)

#     # return Contract.from_json(json.dumps(js["methods"])) <- if you want specific key
#     return Contract.from_json(json.dumps(js))


# # Helper method to retrieve the winning player from a JSON file
# @pytest.fixture(scope="session")
# def winner_account() -> SigningAccount | None:
#     try:
#         with open("winner_account.json") as f:
#             data = json.load(f)

#         address = data["address"]
#         private_key = data["private_key"]

#         return SigningAccount(address=address, private_key=private_key)
#     except (FileNotFoundError, KeyError, json.JSONDecodeError):
#         return None


# Fund smart contract app account (app creator is account doing the funding, implied by use of their client instance)
def test_fund_app_mbr(apps: dict[str, PieoutClient]) -> None:
    # Get smart contract application client from from apps dict
    app_client = apps["pieout_client_1"].app_client

    # Send a payment transaction to make the app account operable by funding its base minimum balance requirement
    fund_app_txn = app_client.fund_app_account(
        FundAppAccountParams(
            note=b'pieout:j{"method":"fund_app_account","concern":"txn.pay;fund_app_base_mbr"}',
            amount=micro_algo(100_000),
        )
    )

    # Verify transaction was confirmed by the network
    wait_for_confirmation(
        app_client.algorand.client.algod, fund_app_txn.tx_id, 3
    )
    assert (
        fund_app_txn.confirmation
    ), "fund_app_txn.confirmation transaction failed confirmation."


# Test case for executing an app call transaction to the `mint_trophy` method of the smart contract
def test_mint_trophy(
    # creator: SigningAccount,
    apps: dict[str, PieoutClient],
    accs: dict[str, SigningAccount],
) -> None:
    # Get creator account from accs dict
    creator = accs["creator"]

    # Get smart contract application from from apps dict
    app = apps["pieout_client_1"]

    # Define nested function that attemps to call the `mint_trophy` method
    def try_mint_trophy_txn(
        sender: SigningAccount,
        note: bytes | str | None = None
    ) -> None:
        # Create the required payment transactions
        box_t_pay = create_payment_txn(
            app=app,
            sender=sender,
            amount=cst.BOX_T_COST,
            note=b'pieout:j{"concern":"txn.pay;box_t_mbr_pay"}'
        )  # Box game trophy MBR cost payment

        mint_pay = create_payment_txn(
            app=app,
            sender=sender,
            amount=100_000,
            note=b'pieout:j{"concern":"txn.pay;asset_create_pay"}'
        )  # Asset creation payment

        # Send app call transaction to execute smart contract method `mint_trophy`
        send_app_call_txn(
            logger=logger,
            app=app,
            sender=sender,
            method=app.send.mint_trophy,
            args=(box_t_pay, mint_pay),
            max_fee=micro_algo(100_000),
            note=note,
            send_params=SendParams(cover_app_call_inner_transaction_fees=True),
            description="Mint Trophy App Call",
        )

    # Call try mint trophy transaction function
    try_mint_trophy_txn(
        sender=creator,
        note=b'pieout:j{"method":"mint_trophy","concern":"txn.app_call;mint_trophy_asset"}',
        )

    # Second call should trip assert error cause trophy already exists
    # try_mint_trophy_txn(
    #     sender=creator,
    #     note=b'pieout:j{"method":"mint_trophy","concern":"txn.app_call;mint_trophy_asset2"}',
    #     )


# # Test case for executing an app call transaction to the `new_game` method of the smart contract
# def test_new_game(
#     # creator: SigningAccount,
#     # randy_factory: dict[str, SigningAccount],
#     apps: dict[str, PieoutClient],
#     accs: dict[str, SigningAccount],
# ) -> None:
#     # Get creator account from accs dict
#     # creator = accs["creator"]
#     admin_1 = accs["randy_1"]
#     admin_2 = accs["randy_1"]

#     # Get smart contract applicationfrom from apps dict
#     app = apps["pieout_client_1"]

#     # Define nested function that attemps to call the `new_game` method
#     def try_new_game_txn(
#         sender: SigningAccount,
#         max_players: int,
#         note: bytes | str | None = None
#     ) -> None:
#         # Define payment amounts
#         box_p_cost = apps["pieout_client_1"].send.calc_single_box_cost(
#             (10, max_players * 32)
#         ).abi_return

#         # Create the required payment transactions
#         box_s_pay = create_payment_txn(
#             app=app,
#             sender=sender,
#             amount=cst.BOX_S_COST,
#             note=b'pieout:j{"concern":"txn.pay;box_s_mbr_pay"}'
#         )  # Box game state MBR cost payment
#         box_p_pay = create_payment_txn(
#             app=app,
#             sender=sender,
#             amount=box_p_cost,
#             note=b'pieout:j{"concern":"txn.pay;box_p_mbr_pay"}'
#         )  # Box game players MBR cost payment
#         stake_pay = create_payment_txn(
#             app=app,
#             sender=sender,
#             amount=cst.STAKE_AMOUNT_MANAGER,
#             note=b'pieout:j{"concern":"txn.pay;admin_stake_deposit_pay"}'
#         )  # Admin stake deposit for prize pool payment

#         # Send app call transaction to execute smart contract method `new_game`
#         send_app_call_txn(
#             logger=logger,
#             app=app,
#             sender=sender,
#             method=app.send.new_game,
#             args=(max_players, box_s_pay, box_p_pay, stake_pay),
#             max_fee=micro_algo(3_000),
#             note=note,
#             description="New Game App Call",
#         )

#     # Call try new game transaction function
#     # try_new_game_txn(account=randy_factory["randy_1"], max_players=8)  # LocalNet
#     try_new_game_txn(
#         sender=admin_1,
#         max_players=8,
#         note=b'pieout:j{"method":"new_game","concern":"txn.app_call;new_game1"}'
#         )
#     try_new_game_txn(
#         sender=admin_2,
#         max_players=10,
#         note=b'pieout:j{"method":"new_game","concern":"txn.app_call;new_game2"}'
#         )


# # Test case for executing an app call transaction to the `join_game` method of the smart contract
# def test_join_game(
#     # creator: SigningAccount,
#     # randy_factory: dict[str, SigningAccount],
#     accs: dict[str, SigningAccount],
#     apps: dict[str, PieoutClient],
#     subscriber: AlgorandSubscriber,
# ) -> None:
#     # Get creator account from accs dict
#     creator = accs["creator"]

#     # Get smart contract applicationfrom from apps dict
#     app = apps["pieout_client_1"]

#     # Register the event handler for filtered name `filter1`
#     subscriber.on(
#         "filter1",
#         log_subbed_arc28_events(
#             logger, events_to_log=["game_live", "player_score", "game_over"]
#         ),
#     )

#     # Define nested function that attemps to call the `join_game` method
#     def try_join_game_txn(
#         sender: SigningAccount,
#         game_id: int,
#         note: bytes | str | None = None
#     ) -> None:
#         # Create the required payment transactions
#         stake_pay = create_payment_txn(
#             app=app,
#             sender=sender,
#             amount=cst.STAKE_AMOUNT_MANAGER,
#             note=b'pieout:j{"concern":"txn.pay;player_stake_deposit_pay"}'
#         )  # Player stake deposit for prize pool payment

#         # Send app call transaction to execute smart contract method `join_game`
#         send_app_call_txn(
#             logger=logger,
#             app=app,
#             sender=sender,
#             method=app.send.join_game,
#             args=(game_id, stake_pay),
#             max_fee=micro_algo(50_000),
#             note=note,
#             description="Join Game App Call",
#         )

#     # NOTE: Accounts joinging Game 1 for TestNet testing
#     players_game_1 = [
#         "creator",
#         "randy_2",
#         "randy_3",
#         "randy_4",
#         "randy_5",
#         "randy_6",
#         "randy_7",
#         "randy_8",
#         "randy_9",
#     ]
#     for player in players_game_1:
#         # Since they are admin of Game 1, randy_1 acc is already a player by default
#         try_join_game_txn(
#             account=accs[player],
#             game_id=1,
#             note=b'pieout:j{"method":"join_game","concern":"txn.app_call;join_game_id_1_enum"}'
#         )

#     # NOTE: Accounts joinging Game 2 for TestNet testing
#     players_game_2 = [
#         "creator",
#         "randy_1",
#         "randy_3",
#         "randy_4",
#         "randy_5",
#         "randy_6",
#         "randy_7",
#     ]

#     for player in players_game_2:
#         # Since they are admin of Game 2, randy_2 acc is already a player by default
#         try_join_game_txn(
#             account=accs[player],
#             game_id=2,
#             note=b'pieout:j{"method":"join_game","concern":"txn.app_call;join_game_id_2_enum"}'
#         )

#     # # NOTE: Accounts joining Game 1 for LocalNet testing
#     # try_join_game_txn(account=creator, game_id=1)
#     # players_game_1 = ["randy_2", "randy_3", "randy_4", "randy_5", "randy_6", "randy_7"]
#     # for player in players_game_1:
#     #     try_join_game_txn(account=randy_factory[player], game_id=1)

#     # # NOTE: Accounts joining Game 2 for LocalNet testing
#     # players_game_2 = [
#     #     "randy_1",
#     #     "randy_3",
#     #     "randy_4",
#     #     "randy_5",
#     #     "randy_6",
#     #     "randy_7",
#     #     "randy_8",
#     #     "randy_9",
#     # ]

#     # try_join_game_txn(account=creator, game_id=2)
#     # for player in players_game_2:
#     #     try_join_game_txn(account=randy_factory[player], game_id=2)

#     read_game1_state_txn = app.send.read_game_state(
#         args=(1,),
#         params=CommonAppCallParams(
#             sender=creator.address,
#             signer=creator.signer,
#         ),
#     )

#     read_game2_state_txn = app.send.read_game_state(
#         args=(2,),
#         params=CommonAppCallParams(
#             sender=creator.address,
#             signer=creator.signer,
#         ),
#     )

#     # Log read game state transaction abi returns
#     logger.info(read_game1_state_txn.abi_return)
#     logger.info(read_game2_state_txn.abi_return)

#     # Log App Global State
#     logger.info(f"Global State: {app.state.global_state.get_all()}")


# # Test case for executing an app call transaction to the `get_box_commit_rand` method of the smart contract
# def test_get_box_commit_rand(
#     # creator: SigningAccount,
#     # randy_factory: dict[str, SigningAccount],
#     accs: dict[str, SigningAccount],
#     apps: dict[str, PieoutClient],
# ) -> None:
#     # Get smart contract applicationfrom from apps dict
#     app = apps["pieout_client_1"]

#     # Define nested function that attemps to call the `get_box_commit_rand` method
#     def try_get_box_commit_rand_txn(
#         sender: SigningAccount,
#         note: bytes | str | None = None
#     ) -> None:
#         # Create the required payment transactions
#         box_c_pay = create_payment_txn(
#             app=app,
#             sender=sender,
#             amount=cst.BOX_C_COST,
#             note=b'pieout:j{"concern":"txn.pay;box_c_mbr_pay"}'
#         )  # Box commit rand MBR cost payment

#         # Send app call transaction to execute smart contract method `get_box_commit_rand`
#         send_app_call_txn(
#             logger=logger,
#             app=app,
#             sender=sender,
#             method=app.send.get_box_commit_rand,
#             args=(box_c_pay,),
#             max_fee=micro_algo(50_000),
#             note=note,
#             description="Get Box Commit Rand App Call",
#         )

#     # NOTE: Accounts joinging Game 1 for TestNet testing
#     players_game_1 = [
#         "creator",
#         "randy_2",
#         "randy_3",
#         "randy_4",
#         "randy_5",
#         "randy_6",
#         "randy_7",
#         "randy_8",
#         "randy_9",
#     ]
#     for player in players_game_1:
#         # Since they are admin of Game 1, randy_1 acc is already a player by default
#         try_get_box_commit_rand_txn(
#             sender=accs[player],
#             note=b'pieout:j{"method":"join_game","concern":"txn.app_call;get_box_commit_rand"}'
#         )

#     # NOTE: Accounts joinging Game 2 for TestNet testing
#     players_game_2 = [
#         "creator",
#         "randy_1",
#         "randy_3",
#         "randy_4",
#         "randy_5",
#         "randy_6",
#         "randy_7",
#     ]

#     for player in players_game_2:
#         # Since they are admin of Game 2, randy_2 acc is already a player by default
#         try_get_box_commit_rand_txn(
#             sender=accs[player],
#             note=b'pieout:j{"method":"get_box_commit_rand","concern":"txn.app_call;get_box_commit_rand"}'
#         )

# # # # Test case 1 for executing an app call transaction to the `commit_rand` method of the smart contract
# # # # NOTE: Test case 1 should work for deleting, as Game ID == 0
# # # def test_alt_box_commit_rand_for_self(
# # #     creator: SigningAccount,
# # #     randy_factory: dict[str, SigningAccount],
# # #     apps: dict[str, PieoutClient],
# # #     # accs: dict[str, SigningAccount],
# # # ) -> None:
# # #     # Get the app client from the apps dict
# # #     app_client = apps["pieout_client_1"]
# # #     # creator = accs["creator"]

# # #     # Define nested function to try `del_box_commit_rand` method call
# # #     def try_alt_box_commit_rand_for_self_txn(
# # #         account: SigningAccount,
# # #         game_id: int,
# # #     ) -> None:

# # #         # Send app call transaction to smart contract method `commit_rand`
# # #         send_app_call_txn(
# # #             logger=logger,
# # #             app_client=app_client,
# # #             account=account,
# # #             method=app_client.send.del_box_commit_rand_for_self,
# # #             args=(game_id, ),
# # #             max_fee=micro_algo(2_000),
# # #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# # #             description="Del Box Commit Rand For Self App Call",
# # #         )

# # #     # Accounts playing game 1
# # #     try_alt_box_commit_rand_for_self_txn(account=creator, game_id=2)
# # #     players_game_1 = [
# # #         "randy_1",
# # #         "randy_2",
# # #         "randy_3",
# # #         "randy_4",
# # #         "randy_5",
# # #         "randy_6",
# # #         "randy_7",
# # #         "randy_8",
# # #         "randy_9",
# # #     ]

# # #     for player in players_game_1:
# # #         try_alt_box_commit_rand_for_self_txn(account=randy_factory[player], game_id=2)

# # #     # # Accounts playing game 1
# # #     # players_game_1 = [
# # #     #     # "creator",
# # #     #     "randy_1",
# # #     #     "randy_2",
# # #     #     "randy_3",
# # #     #     "randy_4",
# # #     #     "randy_5",
# # #     #     "randy_6",
# # #     #     "randy_7",
# # #     # ]

# # #     # try_del_box_commit_rand_txn(creator)
# # #     # for player in players_game_1:
# # #     #     try_del_box_commit_rand_txn(randy_factory[player], 1)

# # #     # Log App Global State
# # #     logger.info(f"Global State: {apps["pieout_client_1"].state.global_state.get_all()}")

# # # # Test case 1 for executing an app call transaction to the `commit_rand` method of the smart contract
# # # # NOTE: Test case 1 should FAIL because box commit rand expiry round hasn't been reached yet
# # # def test_del_box_commit_rand_for_other(
# # #     creator: SigningAccount,
# # #     randy_factory: dict[str, SigningAccount],
# # #     apps: dict[str, PieoutClient],
# # #     # accs: dict[str, SigningAccount],
# # # ) -> None:

# # #     # Define nested function to try `del_box_commit_rand` method call
# # #     def try_del_box_commit_rand_for_other_txn(
# # #         account: SigningAccount,
# # #         player: SigningAccount,
# # #     ) -> None:

# # #         # Send app call transaction to smart contract method `commit_rand`
# # #         send_app_call_txn(
# # #             logger=logger,
# # #             app_client=apps["pieout_client_1"],
# # #             account=account,
# # #             method=apps["pieout_client_1"].send.del_box_commit_rand_for_other,
# # #             args=(player.address, ),
# # #             max_fee=micro_algo(2_000),
# # #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# # #             description="Del Box Commit Rand For Other App Call",
# # #         )

# # #     read_game1_players_txn = apps["pieout_client_1"].send.read_game_players(
# # #         args=(1,),
# # #         params=CommonAppCallParams(
# # #             sender=creator.address,
# # #             signer=creator.signer
# # #         ),
# # #     )

# # #     logger.info(f"Game ID: 1 - player list: {read_game1_players_txn.abi_return}")

# # #     try_del_box_commit_rand_for_other_txn(
# # #         account=randy_factory["randy_4"],
# # #         player=creator,
# # #     )

# # #     # Log App Global State
# # #     logger.info(f"Global State: {apps["pieout_client_1"].state.global_state.get_all()}")


# # Test case for executing an app call transaction to the `commit_rand` method of the smart contract
# def test_set_box_commit_rand(
#     # creator: SigningAccount,
#     # randy_factory: dict[str, SigningAccount],
#     accs: dict[str, SigningAccount],
#     apps: dict[str, PieoutClient],
# ) -> None:
#     # Get smart contract applicationfrom from apps dict
#     app = apps["pieout_client_1"]

#     # Define nested function to try `set_box_commit_rand` method call
#     def try_set_box_commit_rand_txn(
#         sender: SigningAccount,
#         game_id: int,
#         note: bytes | str | None = None
#     ) -> None:
#         # Send app call transaction to smart contract method `commit_rand`
#         send_app_call_txn(
#             logger=logger,
#             app=app,
#             sender=sender,
#             method=app.send.set_box_commit_rand,
#             args=(game_id,),
#             description="Get Box Commit Rand App Call",
#         )

#     # NOTE: Accounts joinging Game 1 for TestNet testing
#     players = [
#         "creator",
#         "randy_2",
#         "randy_3",
#         "randy_4",
#         "randy_5",
#         "randy_6",
#         "randy_7",
#         "randy_8",
#         "randy_9",
#     ]

#     for player in players:
#         try_set_box_commit_rand_txn(
#             sender=accs[player],
#             note=b'pieout:j{"method":"set_box_commit_rand","concern":"txn.app_call;set_box_commit_rand_enum"}'
#         )

#     # Log App Global State
#     logger.info(f"Global State: {apps["pieout_client_1"].state.global_state.get_all()}")

# # # Test case 2 for executing an app call transaction to the `commit_rand` method of the smart contract
# # # NOTE: Test case 2 should FAIL because Game ID mismatch or player is still active!
# # def test_del_box_commit_rand_for_self_2(
# #     creator: SigningAccount,
# #     randy_factory: dict[str, SigningAccount],
# #     apps: dict[str, PieoutClient],
# #     # accs: dict[str, SigningAccount],
# # ) -> None:
# #     # Get the app client from the apps dict
# #     # creator = accs["creator"]

# #     # Define nested function to try `del_box_commit_rand` method call
# #     def try_del_box_commit_rand_for_self_2_txn(
# #         account: SigningAccount,
# #         game_id: int,
# #     ) -> None:

# #         # Send app call transaction to smart contract method `commit_rand`
# #         send_app_call_txn(
# #             logger=logger,
# #             app_client=apps["pieout_client_1"],
# #             account=account,
# #             method=apps["pieout_client_1"].send.del_box_commit_rand_for_self,
# #             args=(game_id, ),
# #             max_fee=micro_algo(2_000),
# #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# #             description="Del Box Commit Rand For Self App Call",
# #         )

# #     # Accounts playing game 2
# #     try_del_box_commit_rand_for_self_2_txn(account=creator, game_id=2)
# #     players_game_2 = [
# #         "randy_1",
# #         "randy_2",
# #         "randy_3",
# #         "randy_4",
# #         "randy_5",
# #         "randy_6",
# #         "randy_7",
# #         "randy_8",
# #         "randy_9",
# #     ]

# #     for player in players_game_2:
# #         try_del_box_commit_rand_for_self_2_txn(account=randy_factory[player], game_id=2)

# #     # # Accounts playing game 1
# #     # players_game_1 = [
# #     #     # "creator",
# #     #     "randy_1",
# #     #     "randy_2",
# #     #     "randy_3",
# #     #     "randy_4",
# #     #     "randy_5",
# #     #     "randy_6",
# #     #     "randy_7",
# #     # ]

# #     # try_del_box_commit_rand_txn(creator)
# #     # for player in players_game_1:
# #     #     try_del_box_commit_rand_txn(randy_factory[player], 1)

# #     # Log App Global State
# #     logger.info(f"Global State: {apps["pieout_client_1"].state.global_state.get_all()}")

# # # Test case 2 for executing an app call transaction to the `commit_rand` method of the smart contract
# # # NOTE: Test case 2 should FAIL because all players are still active
# # def test_alt_box_commit_rand_for_other_2(
# #     creator: SigningAccount,
# #     randy_factory: dict[str, SigningAccount],
# #     apps: dict[str, PieoutClient],
# #     # accs: dict[str, SigningAccount],
# # ) -> None:
# #     # Get the app client from the apps dict
# #     app_client = apps["pieout_client_1"]
# #     # creator = accs["creator"]

# #     game_1_admin = randy_factory["randy_1"]
# #     game_2_admin = randy_factory["randy_2"]

# #     # Define nested function to try `del_box_commit_rand` method call
# #     def try_alt_box_commit_rand_for_other_2_txn(
# #         account: SigningAccount,
# #         game_id: int,
# #         player: SigningAccount,
# #     ) -> None:

# #         # Send app call transaction to smart contract method `commit_rand`
# #         send_app_call_txn(
# #             logger=logger,
# #             app_client=app_client,
# #             account=account,
# #             method=app_client.send.alt_box_commit_rand_for_other,
# #             args=(game_id, player.address),
# #             max_fee=micro_algo(2_000),
# #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# #             description="Alt Box Commit Rand For Other App Call",
# #         )

# #     read_game1_players_txn = app_client.send.read_game_players(
# #         args=(1,),
# #         params=CommonAppCallParams(
# #             sender=creator.address,
# #             signer=creator.signer
# #         ),
# #     )

# #     logger.info(f"Game ID: 1 - player list: {read_game1_players_txn.abi_return}")

# #     try_alt_box_commit_rand_for_other_2_txn(
# #         account=game_1_admin,
# #         game_id=1,
# #         player=creator,
# #     )

# #     # Log App Global State
# #     logger.info(f"Global State: {app_client.state.global_state.get_all()}")


# Test case for executing an app call transaction to the `play_game` method of the smart contract
def test_play_game(
    # creator: SigningAccount,
    # randy_factory: dict[str, SigningAccount],
    subscriber: AlgorandSubscriber,
    accs: dict[str, SigningAccount],
    apps: dict[str, PieoutClient],
) -> None:
    # Get smart contract application from from apps dict
    app = apps["pieout_client_1"]

    box_t_ = app.algorand.client.algod.application_box_by_name(
        app.app_id, b"t_"
    )

    box_t_bytes = base64.b64decode(box_t_["value"])
    asset_id = int.from_bytes(box_t_bytes[:8], byteorder="big")
    owner_address = encode_address(box_t_bytes[8:])

    logger.info(f"Box Trophy Raw Bytes: {list(box_t_bytes)}")
    logger.info(f"Box Trophy Asset ID: {asset_id}")
    logger.info(f"Box Trophy Owner Address: {owner_address}")
    logger.info(f"ATH address before play {app.state.global_state.ath_address}")

    # for pl in players_game_2:
    #     result = app_client.send.read_commit_rand(
    #         args=(randy_factory[pl].address, ),
    #         params=CommonAppCallParams(
    #             sender=creator.address,
    #             signer=creator.signer,
    #         ),
    #     )

    #     logger.info(result.abi_return)

    # # Send app call transaction to smart contract method `commit_rand`
    # # NOTE: Should fail because Game ID mismatch or player still active
    # send_app_call_txn(
    #     logger=logger,
    #     app_client=app_client,
    #     account=randy_factory["randy_5"],
    #     method=app_client.send.del_box_commit_rand_for_self,
    #     args=(2, ),
    #     max_fee=micro_algo(2_000),
    #     send_params=SendParams(cover_app_call_inner_transaction_fees=True),
    #     description="Del Box Commit Rand For Self App Call",
    # )

    # Define nested function that attemps to call the `play_game` method
    def try_play_game_txn(
        sender: SigningAccount,
        game_id: int,
        note: bytes | str | None = None
    ) -> None:

        # Send app call transaction to smart contract method `play_game`
        send_app_call_txn(
            logger=logger,
            app=app,
            sender=sender,
            method=app.send.play_game,
            args=(game_id,),
            max_fee=micro_algo(40_000),
            note=note,
            send_params=SendParams(cover_app_call_inner_transaction_fees=True),
            description="Play Game App Call",
        )

    # NOTE: Accounts joinging Game 1 for TestNet testing
    players_game_1 = [
        "creator",
        "randy_2",
        "randy_3",
        "randy_4",
        "randy_5",
        "randy_6",
        "randy_7",
        "randy_8",
        "randy_9",
    ]
    for player in players_game_1:
        try_play_game_txn(
            sender=accs[player],
            game_id=1,
            note=b'pieout:j{"method":"join_game","concern":"txn.app_call;play_game_id_1_enum"}'
        )

    # # NOTE: Accounts joinging Game 2 for TestNet testing
    # players_game_2 = [
    #     "creator",
    #     "randy_1",
    #     "randy_3",
    #     "randy_4",
    #     "randy_5",
    #     "randy_6",
    #     "randy_7",
    # ]

    # for player in players_game_2:
    #     # Since they are admin of Game 2, randy_2 acc is already a player by default
    #     try_play_game_txn(
    #         account=accs[player],
    #         game_id=2,
    #         note=b'pieout:j{"method":"play_game","concern":"txn.app_call;play_game_id_2_enum"}'
    #     )

    # Run subscriber in poll once mode
    subscriber.poll_once()

    # Send app call transaction to smart contract method `commit_rand`
    # NOTE: Should FAIL because box expiry round not reached yet
    # send_app_call_txn(
    #     logger=logger,
    #     app_client=app_client,
    #     account=randy_factory["randy_5"],
    #     method=app_client.send.del_box_commit_rand_for_other,
    #     args=(randy_factory["randy_3"].address, ),
    #     max_fee=micro_algo(2_000),
    #     send_params=SendParams(cover_app_call_inner_transaction_fees=True),
    #     description="Del Box Commit Rand For Self App Call",
    # )

    # View box data
    # view_app_boxes(app_client, {b"s_", b"p_"}, logger)


# Test case 3 for executing an app call transaction to the `commit_rand` method of the smart contract
# NOTE: Test case 3 should PASS as long as there is no Game ID mismatch
def test_del_box_commit_rand_for_self(
    # creator: SigningAccount,
    # randy_factory: dict[str, SigningAccount],
    accs: dict[str, SigningAccount],
    apps: dict[str, PieoutClient],
) -> None:
    # Get smart contract application from from apps dict
    app = apps["pieout_client_1"]

    # Define nested function that attemps to call the `del_box_commit_rand_for_self` method
    def try_del_box_commit_rand_for_self_txn(
        sender: SigningAccount,
        game_id: int,
        note: bytes | str | None = None
    ) -> None:

        # Send app call transaction to execute smart contract method `del_box_commit_rand_for_self`
        send_app_call_txn(
            logger=logger,
            app=app,
            sender=sender,
            method=app.send.del_box_commit_rand_for_self,
            args=(game_id, ),
            max_fee=micro_algo(20_000),
            note=note,
            send_params=SendParams(cover_app_call_inner_transaction_fees=True),
            description="Del Box Commit Rand For Self App Call",
        )

    # Accounts playing game
    players = [
        "creator"
        "randy_1",
        "randy_2",
        "randy_3",
        "randy_4",
        "randy_5",
        "randy_6",
        "randy_7",
        "randy_8",
        "randy_9",
    ]

    for player in players:
        try_del_box_commit_rand_for_self_txn(
            account=accs[player],
            game_id=1,
            note=b'pieout:j{"method":"del_box_commit_rand_for_self","concern":"txn.app_call;box_c_deletion"}'
        )


    # Log App Global State
    logger.info(f"Global State: {app.state.global_state.get_all()}")


# # # Test case 3 for executing an app call transaction to the `commit_rand` method of the smart contract
# # # NOTE: Test case 3 should PASS because all players have already played
# # def test_del_box_commit_rand_for_other_3(
# #     creator: SigningAccount,
# #     randy_factory: dict[str, SigningAccount],
# #     apps: dict[str, PieoutClient],
# #     # accs: dict[str, SigningAccount],
# # ) -> None:
# #     # Get the app client from the apps dict
# #     app_client = apps["pieout_client_1"]
# #     # creator = accs["creator"]

# #     game_1_admin = randy_factory["randy_1"]
# #     game_2_admin = randy_factory["randy_2"]

# #     # Define nested function to try `del_box_commit_rand` method call
# #     def try_del_box_commit_rand_for_other_3_txn(
# #         account: SigningAccount,
# #         game_id: int,
# #         player: SigningAccount,
# #     ) -> None:

# #         # Send app call transaction to smart contract method `commit_rand`
# #         send_app_call_txn(
# #             logger=logger,
# #             app_client=app_client,
# #             account=account,
# #             method=app_client.send.del_box_commit_rand_for_other,
# #             args=(game_id, player.address),
# #             max_fee=micro_algo(2_000),
# #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# #             description="Alt Box Commit Rand For Other App Call",
# #         )

# #     read_game1_players_txn = app_client.send.read_game_players(
# #         args=(1,),
# #         params=CommonAppCallParams(
# #             sender=creator.address,
# #             signer=creator.signer
# #         ),
# #     )

# #     logger.info(f"Game ID: 1 - player list: {read_game1_players_txn.abi_return}")

# #     # Accounts playing game 2
# #     players_game_2 = [
# #         "randy_1",
# #         "randy_2",
# #         "randy_3",
# #         "randy_4",
# #         "randy_5",
# #         "randy_6",
# #         "randy_7",
# #         "randy_8",
# #         "randy_9",
# #     ]

# #     # Should throw error because creator is playing game 1
# #     # try_del_box_commit_rand_for_other_3_txn(
# #     #     account=game_2_admin,
# #     #     game_id=2,
# #     #     player=creator,
# #     # )

# #     # Should pass/succeed
# #     try_del_box_commit_rand_for_other_3_txn(
# #         account=game_1_admin,
# #         game_id=1,
# #         player=creator,
# #     )

# #     for player in players_game_2:
# #         try_del_box_commit_rand_for_other_3_txn(account=game_2_admin, game_id=2, player=randy_factory[player])

# #     # Log App Global State
# #     logger.info(f"Global State: {app_client.state.global_state.get_all()}")

# Test case for executing an app call transaction to the `expiry_payout` method of the smart contract
def test_trigger_game_prog(
    # creator: SigningAccount,
    # randy_factory: dict[str, SigningAccount],
    accs: dict[str, SigningAccount],
    apps: dict[str, PieoutClient],
) -> None:
    # Get creator account from accs dict
    creator = accs["creator"] 

    # Get smart contract application from from apps dict
    app = apps["pieout_client_1"]

    # Define nested function that attemps to call the `trigger_game_prog` method
    def try_trigger_game_prog_txn(
        sender: SigningAccount,
        game_id: int,
        trigger_id: int,
        note: bytes | str | None = None
    ) -> None:

        # Send app call transaction to execute smart contract method `trigger_game_prog`
        send_app_call_txn(
            logger=logger,
            app=app,
            sender=sender,
            method=app.send.trigger_game_prog,
            args=(game_id, trigger_id),
            max_fee=micro_algo(2_000),
            note=note,
            send_params=SendParams(cover_app_call_inner_transaction_fees=True),
            description="Trigger Game Prog App Call",
        )

    try_trigger_game_prog_txn(
        sender=creator,
        game_id=1,
        trigger_id=2,
        note=b'pieout:j{"method":"trigger_game_prog","concern":"txn.app_call;trigger_game_id_1_game_event_id_2_prog"}',
    )

    # # Log box data
    # log_app_boxes(app_client=app_client, logger=logger)

    # read_game0_state_txn = app_client.send.read_game_state(
    #     args=(0,),
    #     params=CommonAppCallParams(
    #         sender=creator.address,
    #         signer=creator.signer
    #         # sender=accs["creator"].address,
    #         # signer=accs["creator"].signer
    #     ),
    # )

    # read_game1_state_txn = app_client.send.read_game_state(
    #     args=(1,),
    #     params=CommonAppCallParams(
    #         sender=creator.address,
    #         signer=creator.signer
    #         # sender=accs["creator"].address,
    #         # signer=accs["creator"].signer
    #     ),
    # )

    # logger.info(read_game0_state_txn.abi_return)
    # logger.info(read_game1_state_txn.abi_return)
    logger.info(f"Global State: {app.state.global_state.get_all()}")

# # # Test case for simulating an app call `read_only=True` transaction to read current game state and get winner account
# # def test_read_game_get_winner(
# #     # creator: SigningAccount,
# #     # randy_factory: dict[str, SigningAccount],
# #     apps: dict[str, PieoutClient],
# #     accs: dict[str, SigningAccount],
# # ) -> None:
# #     # Get the app client from the apps dict
# #     app_client = apps["pieout_client_1"]
# #     creator = accs["creator"]
# #     randy_1 = accs["randy_1"]
# #     # Define nested function to try and read game data
# #     def try_read_game(account: SigningAccount, game_id: int, data: str) -> str | None:
# #         params = CommonAppCallParams(sender=account.address, signer=account.signer)

# #         try:
# #             if data == "state":
# #                 result = app_client.send.read_game_state(args=(game_id,), params=params)
# #                 logger.info(result.abi_return)
# #                 winner_address = result.abi_return[9]
# #                 logger.info(winner_address)
# #                 return str(winner_address)
# #             elif data == "players":
# #                 result = app_client.send.read_game_players(
# #                     args=(game_id,), params=params
# #                 )
# #             else:
# #                 logger.info(
# #                     f"No readable reference found for: '{data}' data parameter."
# #                 )
# #                 return

# #             logger.info(f"ABI return - {data.upper()} - {result.abi_return}")

# #         except Exception as e:
# #             logger.error(f"Failed to read '{data}' for game ID {game_id}: {e}")

# #     try_read_game(account=randy_1, game_id=0, data="players")
# #     # winner_address = try_read_game(account=creator, game_id=0, data="state")

# #     try_read_game(account=randy_1, game_id=1, data="players")
# #     winner_address = try_read_game(account=creator, game_id=1, data="state")

# #     # Combine all accounts
# #     accounts = [*list(accs.values())]
# #     for acc in accounts:
# #         if acc.address == winner_address:
# #             winner_acc = {"address": acc.address, "private_key": acc.signer.private_key}

# #             # Write the winner account into a json file
# #             with open("winner_account.json", "w") as file:
# #                 json.dump(winner_acc, file, indent=2)

# #             logger.info("Winner data written to winner_account.json")
# #             break
# #     else:
# #         logger.warning("No matching account found for winner address.")


# # # Test case for executing an app call transaction to the `claim_prize_pool` method of the smart contract
# # def test_claim_prize_pool(
# #     # creator: SigningAccount,
# #     apps: dict[str, PieoutClient],
# #     accs: dict[str, SigningAccount],
# #     winner_account: SigningAccount | None,
# # ) -> None:
# #     # Get the app client from the apps dict
# #     app_client = apps["pieout_client_1"]

# #     # Exit function with warning if winner account is None
# #     if winner_account is None:
# #         logger.warning(
# #             "Exited test_claim_prize_pool before completion. No winner account found."
# #         )
# #         return

# #     # Define nested function to try `claim_prize_pool` method call
# #     def try_claim_prize_pool(
# #         account: SigningAccount,
# #         game_id: int,
# #     ) -> None:

# #         # Send app call transaction to smart contract method `claim_prize_pool`
# #         send_app_call_txn(
# #             app_client=app_client,
# #             account=account,
# #             method=app_client.send.claim_prize_pool,
# #             args=(game_id,),
# #             max_fee=micro_algo(2_000),
# #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# #             description="Claim Prize Pool App Call"
# #         )

# #     # try_claim_prize_pool(account=winner_account, game_id=0)
# #     try_claim_prize_pool(account=winner_account, game_id=1)

# #     read_game_state_txn = app_client.send.read_game_state(
# #         args=(1, ),
# #         params=CommonAppCallParams(sender=accs["creator"].address, signer=accs["creator"].signer),
# #     )

# #     logger.info(read_game_state_txn.abi_return)

# Test case for executing an app call transaction to the `reset_game` method of the smart contract
def test_reset_game(
    # creator: SigningAccount,
    # randy_factory: dict[str, SigningAccount],
    accs: dict[str, SigningAccount],
    apps: dict[str, PieoutClient],
) -> None:
    # Get creator account from accs dict
    # creator = accs["creator"]

    # Get smart contract application from from apps dict
    app = apps["pieout_client_1"]

    admin_1 = accs["randy_1"]
    # admin_2 = accs["randy_2"]

    # Define nested function that attemps to call the `reset_game` method
    def try_reset_game_txn(
        sender: SigningAccount,
        game_id: int,
        note: bytes | str | None = None
    ) -> None:
        # Create the required payment transactions
        stake_pay = create_payment_txn(
            app=app,
            sender=sender,
            amount=cst.STAKE_AMOUNT_MANAGER,
            note=b'pieout:j{"concern":"txn.pay;admin_stake_deposit_pay"}'
        )  # Admin stake deposit for prize pool payment

        # Send app call transaction to execute smart contract method `reset_game`
        send_app_call_txn(
            logger=logger,
            app=app,
            sender=sender,
            method=app.send.reset_game,
            args=(game_id, stake_pay),
            note=note,
            description="Reset Game App Call",
        )

    try_reset_game_txn(
        sender=admin_1,
        game_id=1,
        note=b'pieout:j{"method":"reset_game","concern":"txn.app_call;reset_game_id_1"}',
    )

# # # Test case for executing an app call transaction to the `reset_game` method of the smart contract
# # def test_get_trophy(
# #     creator: SigningAccount,
# #     randy_factory: dict[str, SigningAccount],
# #     apps: dict[str, PieoutClient],
# #     # accs: dict[str, SigningAccount],
# # ) -> None:
# #     # Get the app client from the apps dict
# #     app_client = apps["pieout_client_1"]
# #     # creator = accs["creator"]
# #     # randy_1 = accs["randy_1"]
# #     ath_address = app_client.state.global_state.ath_address

# #     # Find the matching SigningAccount
# #     ath_account = next(
# #         (acc for acc in randy_factory.values() if acc.address == ath_address), None
# #     )

# #     assert ath_account is not None, "ATH address not found in randy accounts"

# #     asset_id_bytes = base64.b64decode(
# #         app_client.algorand.client.algod.application_box_by_name(
# #             app_client.app_id, b"t_"
# #         )["value"]
# #     )
# #     asset_id = int.from_bytes(bytes=asset_id_bytes, byteorder="big", signed=False)
# #     logger.info(asset_id)

# #     def try_get_trophy_txn(
# #         account: SigningAccount,
# #     ) -> None:

# #         # Perform asset opt-in using the matched SigningAccount
# #         app_client.algorand.send.asset_opt_in(
# #             params=AssetOptInParams(
# #                 sender=ath_account.address,
# #                 signer=ath_account.signer,
# #                 asset_id=asset_id,
# #             )
# #         )

# #         # Send app call transaction to smart contract method `new_game`
# #         send_app_call_txn(
# #             logger=logger,
# #             app_client=app_client,
# #             account=account,
# #             method=app_client.send.get_trophy,
# #             max_fee=micro_algo(2_000),
# #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# #             description="Get Trophy App Call",
# #         )

# #     try_get_trophy_txn(ath_account)

# #     app_account_trophy = app_client.algorand.client.algod.account_asset_info(
# #         address=app_client.app_address, asset_id=asset_id
# #     )["asset-holding"]

# #     ath_account_trophy = app_client.algorand.client.algod.account_asset_info(
# #         address=ath_account.address, asset_id=asset_id
# #     )["asset-holding"]

# #     logger.info(f"App Account Trophy Asset Holding {app_account_trophy}")
# #     logger.info(f"Ath Account Trophy Asset Holding {ath_account_trophy}")

# # Perform asset opt-in using the matched SigningAccount
# # app_client.algorand.send.asset_opt_in(
# #     params=AssetOptInParams(
# #         sender=creator.address,
# #         signer=creator.signer,
# #         asset_id=asset_id,
# #     )
# # )

# # # Perform asset opt-out
# # app_client.algorand.send.asset_opt_out(
# #     params=AssetOptOutParams(
# #         sender=ath_account.address,
# #         signer=ath_account.signer,
# #         note="sender:ath_address,reciever:app_address,concern:asset_opt_out",
# #         asset_id=asset_id,
# #         creator=app_client.app_address,
# #     ),
# #     ensure_zero_balance=False,
# # )

# # app_account_trophy = app_client.algorand.client.algod.account_asset_info(
# #     address=app_client.app_address, asset_id=asset_id
# # )["asset-holding"]

# # logger.info(f"App Account Trophy Asset Holding {app_account_trophy}")


# Test case for executing an app call transaction to the `delete_game` method of the smart contract
def test_delete_game(
    # creator: SigningAccount,
    # randy_factory: dict[str, SigningAccount],
    accs: dict[str, SigningAccount],
    apps: dict[str, PieoutClient],
) -> None:
    # Get the app client from the apps dict
    app = apps["pieout_client_1"]
    # creator = accs["creator"]
    admin_1 = accs["randy_1"]
    # admin_2 = accs["randy_2"]

    # Define nested function that attemps to call the `delete_game` method
    def try_delete_game_txn(
        sender: SigningAccount,
        game_id: int,
        note: bytes | str | None = None
    ) -> None:

        # Send app call transaction to execute smart contract method `delete_game`
        send_app_call_txn(
            logger=logger,
            app=app,
            sender=sender,
            method=app.send.delete_game,
            args=(game_id,),
            max_fee=micro_algo(5_000),
            note=note,
            send_params=SendParams(cover_app_call_inner_transaction_fees=True),
            description="Delete Game App Call",
        )

    # Below should FAIL because game lobby not empty
    # try_delete_game_txn(account=creator, game_id=1)
    try_delete_game_txn(
        sender=admin_1,
        game_id=1,
        note=b'pieout:j{"method":"delete_game","concern":"txn.app_call;delete_game_id_1"}',
    )


# # # Test case 4 for executing an app call transaction to the `commit_rand` method of the smart contract
# # # NOTE: Test case 4 should FAIL because Game ID != 0, Game ID mismatch or player is still active!
# # def test_alt_box_commit_rand_for_self_4(
# #     creator: SigningAccount,
# #     randy_factory: dict[str, SigningAccount],
# #     apps: dict[str, PieoutClient],
# #     # accs: dict[str, SigningAccount],
# # ) -> None:
# #     # Get the app client from the apps dict
# #     app_client = apps["pieout_client_1"]
# #     # creator = accs["creator"]

# #     # Define nested function to try `del_box_commit_rand` method call
# #     def try_alt_box_commit_rand_for_self_4_txn(
# #         account: SigningAccount,
# #         game_id: int,
# #         delete_box: bool,  # noqa: FBT001
# #     ) -> None:

# #         # Send app call transaction to smart contract method `commit_rand`
# #         send_app_call_txn(
# #             logger=logger,
# #             app_client=app_client,
# #             account=account,
# #             method=app_client.send.alt_box_commit_rand_for_self,
# #             args=(game_id, delete_box),
# #             max_fee=micro_algo(2_000),
# #             send_params=SendParams(cover_app_call_inner_transaction_fees=True),
# #             description="Alt Box Commit Rand For Self App Call",
# #         )

# #     # Accounts playing game 2
# #     try_alt_box_commit_rand_for_self_4_txn(account=creator, game_id=2, delete_box=False)
# #     players_game_2 = [
# #         "randy_1",
# #         "randy_2",
# #         "randy_3",
# #         "randy_4",
# #         "randy_5",
# #         "randy_6",
# #         "randy_7",
# #         "randy_8",
# #         "randy_9",
# #     ]

# #     for player in players_game_2:
# #         try_alt_box_commit_rand_for_self_4_txn(account=randy_factory[player], game_id=2, delete_box=False)

# #     for player in players_game_2:
# #         try_alt_box_commit_rand_for_self_4_txn(account=randy_factory[player], game_id=2, delete_box=True)

#     # # Accounts playing game 1
#     # players_game_1 = [
#     #     # "creator",
#     #     "randy_1",
#     #     "randy_2",
#     #     "randy_3",
#     #     "randy_4",
#     #     "randy_5",
#     #     "randy_6",
#     #     "randy_7",
#     # ]

#     # try_del_box_commit_rand_txn(creator)
#     # for player in players_game_1:
#     #     try_del_box_commit_rand_txn(randy_factory[player], 1)

#     # Log App Global State
#     logger.info(f"Global State: {apps["pieout_client_1"].state.global_state.get_all()}")

        # composer = app_client.new_group().composer()

        # composer.add_app_call_method_call(
        #     params=AppCallMethodCallParams(
        #         sender=account.address,
        #         signer=account.signer,
        #         max_fee=micro_algo(2_000),
        #         app_id=app_client.app_id,
        #         method=Method.from_signature("get_box_commit_rand(pay)void"),
        #         args=[box_c_pay],
        #         )
        #     )

        # composer.add_app_call_method_call(
        #     params=AppCallMethodCallParams(
        #         sender=account.address,
        #         signer=account.signer,
        #         max_fee=micro_algo(2_000),
        #         app_id=app_client.app_id,
        #         method=Method.from_signature("get_commit_rand_round(uint64)void"),
        #         args=[game_id],
        #         )
        #     )

        # composer.add_app_call_method_call(
        #     params=AppCallMethodCallParams(
        #         sender=account.address,
        #         signer=account.signer,
        #         max_fee=micro_algo(40_000),
        #         app_id=app_client.app_id,
        #         method=Method.from_signature("play_game(uint64)void"),
        #         args=[game_id],
        #         # account_references=play_game_acc_refs,
        #         # box_references=play_game_box_refs,
        #         )
        #     )
