import base64
from logging import Logger

from algosdk.encoding import encode_address

from smart_contracts.artifacts.pieout.pieout_client import PieoutClient


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

            logger.info(f"Box Name: {box_name}, Box Value: {list(box_value)}")

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

    except Exception as e:
        logger.error(f"Failed to retrieve boxes: {e}")
