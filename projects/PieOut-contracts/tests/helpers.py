# test/helpers.py
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


# Define a helper method that creates of a payment transaction
def create_payment_txn(app: PieoutClient, sender: SigningAccount, amount: int, note: bytes | str | None = None) -> Transaction:
    return app.algorand.create_transaction.payment(
        PaymentParams(
            sender=sender.address,
            signer=sender.signer,
            receiver=app.app_address,
            amount=micro_algo(amount),
            note=note,
        )
    )

# Define a helper method that send an app call transaction to an abimethod inside the contract
def send_app_call_txn(
    logger: Logger,
    app: PieoutClient,
    sender: SigningAccount,
    method: Callable[..., SendAppTransactionResult],
    args: Optional[tuple] = None,
    max_fee: int = 1000,
    note: bytes | str | None = None,
    send_params: Optional[SendParams] = None,
    description: str = "App call",
) -> None:
    # Define the commonly used app call params
    params = CommonAppCallParams(
        max_fee=micro_algo(max_fee),
        sender=sender.address,
        signer=sender.signer,
        note=note,
    )

    # Perform try and except
    try:
        # Inspect the method signature and check it contains the 'args' field
        if "args" in inspect.signature(method).parameters:
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

        # Wait 3 rounds for confirmation
        wait_for_confirmation(app.algorand.client.algod, result.tx_id, 3)

        # Assert transaction was successfully confirmed
        assert result.confirmation, f"{description} transaction failed confirmation."

        # If the send app transcation result has a return value that is not None
        if result.abi_return is not None:
            # Log the call abimethod return value
            logger.info(f"{description} ABI return value: {result.abi_return}")
    # Log error if failure
    except Exception as e:
        logger.warning(f"{description} transaction failed: {e}")

# Define a helper method that makes a read-only app call to read various game data
def read_game_data(
    app_client: PieoutClient,
    sender: SigningAccount,
    player: SigningAccount,
    game_id: int,
    data: str,
    logger: Logger,
) -> None:
    # Perform try and except
    try:
        # Define the commonly used app call params
        params = CommonAppCallParams(sender=sender.address, signer=sender.signer)

        # Check data string arg and perform the corresponding read data app call
        if data == "state":
            result = app_client.send.read_game_state(args=(game_id,), params=params)
        elif data == "players":
            result = app_client.send.read_game_players(args=(game_id,), params=params)
        elif data == "commit_rand":
            result = app_client.send.read_commit_rand(args=(player,), params=params)
        else:
            raise ValueError(f"No readable reference found for: '{data}' data parameter.")

        # Log the data abimethod return value
        logger.info(f"Game {data} data: {result.abi_return}")

    # Log error if failure
    except Exception as e:
        logger.info(f"[read_game_data()] Error reading game data: {e}")
        return None

# Define a helper method that takes an address as bytes, encodes it into base32 and logs it if it's not empty
def log_address(label: str, addr_bytes: bytes, logger: Logger):
    # If address is equal to zeroed bytes of size 32, log EMPTY
    if addr_bytes == b"\x00" * 32:
        logger.info(f"{label}: EMPTY")
    else:
        # Perform try and except
        try:
            # Encode address bytes into their corresponding base32 representation and log address
            base32_addr = encode_address(addr_bytes)
            logger.info(f"{label}: {base32_addr}")
        # Log error if failure
        except Exception as e:
            logger.warning(f"Failed to decode {label.lower()}: {e}")

# Define a helper method that takes the game players box name and value and logs its output
def log_box_game_players(box_name: bytes, box_value: bytes, logger: Logger) -> None:
    # In step of 32, iterate through the entire box value, which is a byte array w/ all player addressses in game
    for i in range(0, len(box_value), 32):
        # Everything after the first two bytes of the box name is the key representing the game id
        game_id_bytes = box_name[2:]
        # Convert the game id bytes into an integer
        game_id = int.from_bytes(bytes=game_id_bytes, byteorder="big")
        # Create a chunk for each address
        chunk = box_value[i:i + 32]
        # Construct a label with the game id and the player address
        label = f"Game ID [{game_id}] - Player address [{i // 32}]"
        # Use the log address helper method
        log_address(label, chunk, logger)

# Define a helper method that takes the game state box name and value and logs its admin and placement addresses
def log_box_game_state(box_name: bytes, box_value: bytes, logger: Logger) -> None:
    # Everything after the first two bytes of the box name is the key representing the game id
    game_id = int.from_bytes(bytes=box_name[2:], byteorder="big")
    # Slice byte array from behind
    third_place_addr_bytes = box_value[-32:]  # Last 32 bytes of box value is third place addr bytes
    second_place_addr_bytes = box_value[-64:-32]  # Last 32 to last 64 bytes of box value is second place addr bytes
    first_place_addr_bytes = box_value[-96:-64]  # Last 64 to last 96 bytes of box value is first place addr bytes
    admin_bytes = box_value[-128:-96]  # From last 96 to last 128 bytes of box value admin addr bytes

    # Log the admin and the top three placement addresses
    log_address(f"Game ID [{game_id}] - Admin address", admin_bytes, logger)
    log_address(f"Game ID [{game_id}] - First place address", first_place_addr_bytes, logger)
    log_address(f"Game ID [{game_id}] - Second place address", second_place_addr_bytes, logger)
    log_address(f"Game ID [{game_id}] - Third place address", third_place_addr_bytes, logger)

# Define a helper method that takes the commit rand box name and value and logs its data
def log_box_commit_rand(box_name: bytes, box_value: bytes, logger: Logger) -> None:
    # Perform try and except
    try:
        # Get box owner from the last 32 bytes of the box name
        owner_bytes = box_name[-32:]
        # Encode owner bytes into a valid base32 addresss
        owner_addr = encode_address(owner_bytes)
        # First 8 bytes of box value is game id value
        game_id = int.from_bytes(bytes=box_value[:8], byteorder="big")
        # 8-16 bytes of box value is commit round value
        commit_round = int.from_bytes(bytes=box_value[8:16], byteorder="big")
        # 16-24 bytes of box value is expiry round value
        expiry_round = int.from_bytes(bytes=box_value[16:24], byteorder="big")

        # Log all the box commit rand values
        logger.info(
            f"Box Commit Rand - Player: {owner_addr},\n"
            f"Game ID: {game_id}, Commit Round: {commit_round}, Expiry Round: {expiry_round}"
        )

    # Log error if failure
    except Exception as e:
        logger.error(f"Player: {owner_addr}, Failed to decode commit round: {e}")

# Define a helper method that fethes app boxes and views their contents
def view_app_boxes(app_client: PieoutClient, box_key_prefixes: set[bytes] | None, logger: Logger) -> None:
    # Perform try and except
    try:
        # Use Algod to query all existing boxes in the smart contract application storage
        response = app_client.algorand.client.algod.application_boxes(application_id=app_client.app_id)

        # Iterate over all the boxes
        for box in response.get("boxes", []):
            # Decode the box name from base64 to bytes
            box_name = base64.b64decode(box["name"])
            # First 2 bytes of the box name is the key prefix
            prefix = box_name[:2]
            # If prefixes filter exists, skip boxes not in the set
            if box_key_prefixes is not None and prefix not in box_key_prefixes:
                continue

            # Decode the box value from base64 to bytes
            box_value = base64.b64decode(
                app_client.algorand.client.algod.application_box_by_name(
                    application_id=app_client.app_id,
                    box_name=box_name,
                )["value"]
            )

            # If prefix is found inside set, log corresponding box
            if prefix == b"s_":
                game_id = int.from_bytes(bytes=box_name[2:], byteorder="big")
                logger.info(f"Checking Box Game State Admin and Winners for Game ID: {game_id}")
                log_box_game_state(box_name, box_value, logger)
            elif prefix == b"p_":
                game_id = int.from_bytes(bytes=box_name[2:], byteorder="big")
                logger.info(f"Checking Box Game Players for Game ID: {game_id}")
                log_box_game_players(box_name, box_value, logger)
            elif prefix == b"c_":
                log_box_commit_rand(box_name, box_value, logger)

    # Log error if failure
    except Exception as e:
        logger.error(f"Failed to retrieve boxes: {e}")
