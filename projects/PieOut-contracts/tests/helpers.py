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
    send_params: Optional[SendParams] = None,
    description: str = "App call",
) -> None:
    params = CommonAppCallParams(
        max_fee=micro_algo(max_fee),
        sender=account.address,
        signer=account.signer,
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


# def send_app_call_txn(
#     logger: Logger,
#     app_client: PieoutClient,
#     account: SigningAccount,
#     method: Callable[..., SendAppTransactionResult],
#     args: tuple = (),
#     # params: Optional[CommonAppCallParams] = None,
#     max_fee: int = 1000,
#     send_params: Optional[SendParams] = None,
#     description: str = "App call",
# ) -> None:

#     params = CommonAppCallParams(
#         max_fee=micro_algo(max_fee),
#         sender=account.address,
#         signer=account.signer,
#     )

#     try:
#         if send_params:
#             result = method(args=args, params=params, send_params=send_params)
#         else:
#             result = method(args=args, params=params)

#         wait_for_confirmation(app_client.algorand.client.algod, result.tx_id, 3)

#         assert result.confirmation, f"{description} transaction failed confirmation."

#         if result.abi_return is not None:
#             logger.info(f"{description} ABI return value: {result.abi_return}")

#     except Exception as e:
#         logger.warning(f"{description} transaction failed: {e}")


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


def log_app_boxes(app_client: PieoutClient, logger: Logger) -> None:
    try:
        response = app_client.algorand.client.algod.application_boxes(
            application_id=app_client.app_id
        )

        for box in response.get("boxes", []):
            box_name = base64.b64decode(box["name"])
            box_value = base64.b64decode(
                app_client.algorand.client.algod.application_box_by_name(
                    application_id=app_client.app_id, box_name=box_name
                )["value"]
            )

            # logger.info(f"Box Name: {box_name}, Box Value: {list(box_value)}")

            if box_name.startswith(b"p_"):
                for i in range(0, len(box_value), 32):
                    chunk = box_value[i:i + 32]
                    if len(chunk) == 32 and any(chunk):
                        try:
                            address = encode_address(chunk)
                            logger.info(f"Player address [{i // 32}]: {address}")
                        except Exception as e:
                            logger.warning(f"Failed to decode address at index {i}: {e}")
                    else:
                        logger.info(f"Player address [{i // 32}]: EMPTY")

            elif box_name.startswith(b"s_"):
                manager_bytes = box_value[-64:-32]
                winner_bytes = box_value[-32:]

                zero_32b = b"\x00" * 32

                if manager_bytes == zero_32b:
                    logger.info("Manager address: EMPTY")
                else:
                    try:
                        manager_address = encode_address(manager_bytes)
                        logger.info(f"Manager address: {manager_address}")
                    except Exception as e:
                        logger.warning(f"Failed to decode manager address: {e}")

                if winner_bytes == zero_32b:
                    logger.info("Winner address: EMPTY")
                else:
                    try:
                        winner_address = encode_address(winner_bytes)
                        logger.info(f"Winner address: {winner_address}")
                    except Exception as e:
                        logger.warning(f"Failed to decode winner address: {e}")

            elif box_name.startswith(b"c_"):
                try:
                    player_address = encode_address(box_name[-32:])

                    commit_round = int.from_bytes(box_value[:8], byteorder="big", signed=False)

                    logger.info(f"Player address: {player_address}, Commit Round: {commit_round}")

                except Exception as e:
                    logger.error(f"Failed to decode commit box: {e}")

    except Exception as e:
        logger.error(f"Failed to retrieve boxes: {e}")
