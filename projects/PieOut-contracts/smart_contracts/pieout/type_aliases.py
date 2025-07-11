# smart_contracts/pieout/type_aliases.py
from typing import TypeAlias

from algopy import arc4

# Type alias from arc4 dynamic array data type
GamePlayersArr: TypeAlias = arc4.DynamicArray[arc4.Address]


