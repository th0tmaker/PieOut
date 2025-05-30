import base64
import inspect
from logging import Logger
from typing import Callable, Optional

from algokit_utils import CommonAppCallParams, PaymentParams, SendParams, micro_algo
from algokit_utils.models import SigningAccount
from algokit_utils.transactions.transaction_sender import SendAppTransactionResult
from algosdk.encoding import encode_address
from algosdk.transaction import Transaction, wait_for_confirmation

from smart_contracts.artifacts.pieout.pieout_client import PieoutClient


# Define a nested function that handles payment transaction creation
def create_payment_txn(app_client: PieoutClient, account: SigningAccount, amount: int) -> Transaction:
    return app_client.algorand.create_transaction.payment(
        PaymentParams(
            sender=account.address,
            signer=account.signer,
            receiver=app_client.app_address,
            amount=micro_algo(amount),
        )
    )

def send_app_call_txn(
    logger: Logger,
    app_client: PieoutClient,
    account: SigningAccount,
    method: Callable[..., SendAppTransactionResult],
    args: Optional[tuple] = None,
    max_fee: int = 1000,
    note: bytes | str | None = None,
    send_params: Optional[SendParams] = None,
    description: str = "App call",
) -> None:
    params = CommonAppCallParams(
        max_fee=micro_algo(max_fee),
        sender=account.address,
        signer=account.signer,
        note=note,
    )

    try:
        # Check method signature to see if it accepts 'args'
        sig = inspect.signature(method)
        accepts_args = "args" in sig.parameters

        if accepts_args:
            # Call with args (can be empty tuple)
            result = method(
                args=args or (),
                params=params,
                send_params=send_params,
            )
        else:
            # Call without args
            result = method(
                params=params,
                send_params=send_params,
            )

        wait_for_confirmation(app_client.algorand.client.algod, result.tx_id, 3)

        assert result.confirmation, f"{description} transaction failed confirmation."

        if result.abi_return is not None:
            logger.info(f"{description} ABI return value: {result.abi_return}")

    except Exception as e:
        logger.warning(f"{description} transaction failed: {e}")

def read_game_data(
    app_client: PieoutClient,
    game_id: int,
    account: SigningAccount,
    data: str,
    logger: Logger,
) -> None:
    try:
        params = CommonAppCallParams(sender=account.address, signer=account.signer)

        if data == "state":
            result = app_client.send.read_game_state(args=(game_id,), params=params)
        elif data == "players":
            result = app_client.send.read_game_players(args=(game_id,), params=params)
        else:
            raise ValueError(f"No readable reference found for: '{data}' data parameter.")

        logger.info(f"Game {data} data: {result.abi_return}")

    except Exception as e:
        logger.info(f"[read_game_data()] Error reading game data: {e}")
        return None

def log_address(label: str, addr_bytes: bytes, logger: Logger):
    zero_32b = b"\x00" * 32
    if addr_bytes == zero_32b:
        logger.info(f"{label}: EMPTY")
    else:
        try:
            decoded = encode_address(addr_bytes)
            logger.info(f"{label}: {decoded}")
        except Exception as e:
            logger.warning(f"Failed to decode {label.lower()}: {e}")

def log_box_game_players(box_value: bytes, logger: Logger) -> None:
    for i in range(0, len(box_value), 32):
        chunk = box_value[i:i + 32]
        label = f"Player address [{i // 32}]"
        log_address(label, chunk, logger)

def log_box_game_state(box_value: bytes, logger: Logger) -> None:
    manager_bytes = box_value[-128:-96]
    first_place_addr_bytes = box_value[-96:-64]
    second_place_addr_bytes = box_value[-64:-32]
    third_place_addr_bytes = box_value[-32:]

    log_address("Manager address", manager_bytes, logger)
    log_address("First place address", first_place_addr_bytes, logger)
    log_address("Second place address", second_place_addr_bytes, logger)
    log_address("Third place address", third_place_addr_bytes, logger)

def log_box_commit_rand(box_name: bytes, box_value: bytes, logger: Logger) -> None:
    player_bytes = box_name[-32:]
    try:
        player_address = encode_address(player_bytes)
    except Exception as e:
        player_address = f"INVALID ({e})"

    try:
        commit_round = int.from_bytes(box_value[:8], byteorder="big", signed=False)
        logger.info(f"Commit Round - Player: {player_address}, Round: {commit_round}")
    except Exception as e:
        logger.error(f"Player: {player_address}, Failed to decode commit round: {e}")

def view_app_boxes(app_client: PieoutClient, box_key_prefixes: set[bytes] | None, logger: Logger) -> None:
    try:
        response = app_client.algorand.client.algod.application_boxes(application_id=app_client.app_id)

        for box in response.get("boxes", []):
            box_name = base64.b64decode(box["name"])
            prefix = box_name[:2]

            # If prefixes filter exists, skip boxes not in the set
            if box_key_prefixes is not None and prefix not in box_key_prefixes:
                continue

            box_value = base64.b64decode(
                app_client.algorand.client.algod.application_box_by_name(
                    application_id=app_client.app_id,
                    box_name=box_name,
                )["value"]
            )

            if prefix == b"p_":
                log_box_game_players(box_value, logger)
            elif prefix == b"s_":
                log_box_game_state(box_value, logger)
            elif prefix == b"c_":
                log_box_commit_rand(box_name, box_value, logger)

    except Exception as e:
        logger.error(f"Failed to retrieve boxes: {e}")
