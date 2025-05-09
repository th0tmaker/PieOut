# smart_contracts/pieout/contract.py
from typing import TypeAlias

from algopy import arc4

# Type alias from arc4 tuple data type
GameStateTuple: TypeAlias = arc4.Tuple[
    arc4.UInt64,
    arc4.Bool,
    arc4.UInt8,
    arc4.UInt8,
    arc4.UInt8,
    arc4.UInt16,
    arc4.UInt64,
    arc4.Address,
    arc4.Address
]

# Type alias from arc4 dynamic array data type
GamePlayersArr: TypeAlias = arc4.DynamicArray[arc4.Address]
