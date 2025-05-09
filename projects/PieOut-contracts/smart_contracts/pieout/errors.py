# smart_contracts/pieout/errors.py
from typing import Final

# Define assert error messages
INVALID_CREATOR: Final[str] = "Transaction sender address must match application creator address."
INVALID_GAME_ID: Final[str] = "Box game state not found. Check if Game ID is valid."
INVALID_PLAYER: Final[str] = "Transaction sender is not recognized as a valid player for this game."
INVALID_MANAGER: Final[str] = "Transaction sender is not recognized as valid manager address for this game."
INVALID_WINNER: Final[str] = "Transaction sender is not recognized as valid winner address for this game."
INVALID_BOX_PAY_SENDER: Final[str] = "Box payment sender address must match transaction sender address."
INVALID_BOX_PAY_RECIEVER: Final[str] = "Box payment reciever address must match application address."
INVALID_BOX_PAY_FEE: Final[str] = "Insufficient funds. Box pay amount is not enough to cover application MBR."
INVALID_STAKE_PAY_SENDER: Final[str] = "Stake payment sender address must match transaction sender address."
INVALID_STAKE_PAY_RECIEVER: Final[str] = "Stake payment reciever address must match application address."
INVALID_STAKE_PAY_FEE: Final[str] = "Insufficient funds. Stake pay amount is not enough to cover application MBR."
PLAYER_CAP_OVERFLOW: Final[str] = "Player cap overflow. Max players limit must not be exceeded."
PLAYER_ACTIVE: Final[str] = "Transaction sender is already recognized as a valid player for this game."
NON_ZERO_ACTIVE_PLAYERS: Final[str] = "Game lobby not empty. Number of active players must be zero."
FULL_GAME_LOBBY: Final[str] = "Number of active players must not exceed number of max players."
STAKING_FINAL: Final[str] = "Game state staking finalized value missmatch."
BOX_P_START_POS_OVERFLOW: Final[str] = "Players box start position index overflow. Can not store more addresses."
COMMIT_ROUND_NOT_REACHED: Final[str] = "Randomness commit round not reached yet."
