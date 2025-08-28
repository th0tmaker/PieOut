from algokit_subscriber import AlgorandSubscriber
from algosdk.v2client import algod, indexer

# Define a global watermark to track the last processed round to ensure continuous synchronized event monitoring
watermark = 0

# Event schema defining the structure of game events emitted by the smart contract for the subscriber to monitor
PIEOUT_EVENTS = {
    "group_name": "game_events",  # Logical grouping for related events
    "arc28_events": [
        {
            "name": "game_live",  # Emitted when a new game starts and is ready for players
            "args": [
                {"name": "game_id", "type": "uint64"},
                {"name": "staking_finalized", "type": "bool"},
                {"name": "expiry_ts", "type": "uint64"},
            ],
        },
        {
            "name": "player_score",  # Emitted when a player achieves a score in the game
            "args": [
                {"name": "game_id", "type": "uint64"},
                {"name": "player", "type": "address"},
                {"name": "score", "type": "uint8"},
            ],
        },
        {
            "name": "game_over",  # Emitted when a game ends with final rankings
            "args": [
                {"name": "game_id", "type": "uint64"},
                {"name": "high_score", "type": "uint8"},
                {"name": "first_place_address", "type": "address"},
                {"name": "second_place_address", "type": "address"},
                {"name": "third_place_address", "type": "address"},
            ],
        },
    ],
    "continue_on_error": False,  # Stop processing if event parsing fails
}

def update_watermark(new_watermark: int) -> None:
    global watermark
    watermark = new_watermark

def get_watermark() -> int:
    return watermark

def create_subscriber(
    algod_client: algod.AlgodClient,
    indexer_client: indexer.IndexerClient,
    app_id: int,
    max_rounds_to_sync: int,
    frequency_seconds: int = 40
) -> AlgorandSubscriber:
    config = {
        # Define which events to filter and capture from the blockchain
        "filters": [
            {
                "name": "game_events",  # Identifier for this specific filter
                "filter": {
                    "app_id": app_id,  # Only monitor events from this specific smart contract
                    "arc28_events": [
                        {
                            "group_name": PIEOUT_EVENTS["group_name"],
                            "event_name": event["name"]
                        }
                        for event in PIEOUT_EVENTS["arc28_events"]  # Generate filter for each event type
                    ]
                },
            }
        ],
        # Provide event schemas so the subscriber can parse event data
        "arc28_events": [PIEOUT_EVENTS],
        # Configure watermark persistence to maintain processing state across restarts
        "watermark_persistence": {
            "get": get_watermark,  # Function to retrieve last processed round
            "set": update_watermark,  # Function to save current processing position
        },
        # Start from oldest unprocessed events, then monitor new ones in real-time
        "sync_behaviour": "sync-oldest-start-now",
        # Poll frequency - how often to check for new events (in seconds)
        "frequency_in_seconds": frequency_seconds,
        # Set maximum number of rounds processed per sync to prevent overwhelming the system
        "max_rounds_to_sync": max_rounds_to_sync,
    }

    return AlgorandSubscriber(
        algod_client=algod_client,
        indexer_client=indexer_client,
        config=config
    )
