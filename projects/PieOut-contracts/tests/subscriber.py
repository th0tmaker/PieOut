from algokit_subscriber import AlgorandSubscriber
from algosdk.v2client import algod, indexer

# Global watermark for Alogrand App Subsbcriber config
watermark = 0

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
                {"name": "high_score", "type": "uint8"},
                {"name": "first_place_address", "type": "address"},
                {"name": "second_place_address", "type": "address"},
                {"name": "third_place_address", "type": "address"},
            ]
        },
    ],
    "continue_on_error": False
}


# --- Create the AlgorandSubscriber ---
def create_subscriber(algod_client: algod.AlgodClient, indexer_client: indexer.IndexerClient, max_rounds_to_sync: int) -> AlgorandSubscriber:
    global watermark
    config = {
        "filters": [
            {
                "name": "pieout_filter",
                "filter": {
                    # "app_id": 1001, <- Your App ID
                    # "arc28_events": [
                    #     {"group_name": "pieout", "event_name": "game_live"},
                    #     {"group_name": "pieout", "event_name": "player_score"},
                    #     {"group_name": "pieout", "event_name": "game_over"},
                    # ]
                    "arc28_events": [
                        {"group_name": event["group_name"], "event_name": event["name"]}
                        for event in pieout_events["events"]
                    ]
                },
            }
        ],
        "arc28_events": [pieout_events],
        "watermark_persistence": {
            "get": lambda: watermark,
            "set": lambda new_watermark: globals().update(watermark=new_watermark),
        },
        "sync_behaviour": "sync-oldest-start-now",
        "frequency_in_seconds": 40,
        "max_rounds_to_sync": max_rounds_to_sync,
    }

    return AlgorandSubscriber(
        config=config,
        algod_client=algod_client,
        indexer_client=indexer_client,
    )


# --- Self-built ARC-28 Event Logging Handler ---
# def log_subbed_arc28_events(
#     logger: Logger,
#     events_to_log: Optional[list[str]] = None
# ) -> Callable[[dict, str], None]:
#     # Define expected args per event name
#     event_arg_keys: dict[str, list[str]] = {
#         "game_live": ["game_id", "staking_finalized", "expiry_ts"],
#         "player_score": ["game_id", "player", "score"],
#         "game_over": ["game_id", "high_score", "first_place_address", "second_place_address", "third_place_address"]
#     }

#     tracked_events = set(events_to_log or event_arg_keys.keys())

#     def handler(transaction: dict[str, Any], _: str) -> None:
#         for event in transaction.get("arc28_events", []):
#             event = event  # type: ARC28Event

#             name = event.get("event_name")
#             if name not in tracked_events:
#                 continue

#             args = event.get("args", [])
#             keys = event_arg_keys.get(name, [f"arg{i}" for i in range(len(args))])
#             args_dict = dict(zip(keys, args))

#             logger.info(
#                 f"Received ARC-28 Event: {name} in transaction {transaction.get(
#                     'id', 'unknown_txn')}, args: {args_dict}"
#             )

#     return handler
