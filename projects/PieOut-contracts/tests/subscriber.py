from logging import Logger
from typing import Any, Callable, Optional, TypedDict

from algokit_subscriber import AlgorandSubscriber
from algosdk.v2client import algod


class ARC28Event(TypedDict):
    group_name: str
    event_name: str
    args: list[Any]

pieout_events = {
    "group_name": "pieout",
    "events": [
        {
            "name": "game_live",
            "args": [
                {"name": "game_id", "type": "uint64"},
                {"name": "staking_finalized", "type": "bool"},
                {"name": "expiry_ts", "type": "uint64"},
            ]
        },
        {
            "name": "player_score",
            "args": [
                {"name": "game_id", "type": "uint64"},
                {"name": "player", "type": "address"},
                {"name": "score", "type": "uint8"},
            ]
        },
        {
            "name": "game_over",
            "args": [
                {"name": "game_id", "type": "uint64"},
                {"name": "winner", "type": "address"},
                {"name": "highest_score", "type": "uint8"},
            ]
        },
    ],
    "continue_on_error": False
}


# --- Create the AlgorandSubscriber ---

def create_subscriber(algod_client: algod.AlgodClient, max_rounds_to_sync: int) -> AlgorandSubscriber:
    config = {
        "filters": [
            {
                "name": "filter1",
                "filter": {
                    "arc28_events": [
                        {"group_name": "pieout", "event_name": "game_live"},
                        {"group_name": "pieout", "event_name": "player_score"},
                        {"group_name": "pieout", "event_name": "game_over"},
                    ]
                },
            }
        ],
        "arc28_events": [pieout_events],
        "watermark_persistence": {
            "get": lambda: 0,
            "set": lambda x: None,
        },
        "sync_behaviour": "skip-sync-newest",
        "max_rounds_to_sync": max_rounds_to_sync,
    }

    return AlgorandSubscriber(
        config=config,
        algod_client=algod_client,
    )


# --- ARC-28 Event Logging Handler ---

def log_subbed_arc28_events(
    logger: Logger,
    events_to_log: Optional[list[str]] = None
) -> Callable[[dict, str], None]:
    # Define expected args per event name
    event_arg_keys: dict[str, list[str]] = {
        "game_live": ["game_id", "staking_finalized", "expiry_ts"],
        "player_score": ["game_id", "player", "score"],
        "game_over": ["game_id","winner", "highest_score"]
    }

    tracked_events = set(events_to_log or event_arg_keys.keys())

    def handler(transaction: dict[str, Any], _: str) -> None:
        for event in transaction.get("arc28_events", []):
            event = event  # type: ARC28Event

            name = event.get("event_name")
            if name not in tracked_events:
                continue

            args = event.get("args", [])
            keys = event_arg_keys.get(name, [f"arg{i}" for i in range(len(args))])
            args_dict = dict(zip(keys, args))

            logger.info(
                f"Received ARC-28 Event: {name} in transaction {transaction.get(
                    'id', 'unknown_txn')}, args: {args_dict}"
            )

    return handler
