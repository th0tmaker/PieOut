# class GameContract(ARC4Contract):
#     def __init__(self):
#         # Global counters and settings
#         self.game_counter = GlobalState(UInt64, 0)

#         # Game-specific data in boxes
#         self.game_states = BoxMap(UInt64, GameState, key_prefix=b"game_")
#         self.game_players = BoxMap(UInt64, PlayerList, key_prefix=b"players_")
#         self.game_winners = BoxMap(UInt64, WinnerData, key_prefix=b"winner_")

#         # Player participation tracking
#         self.player_games = BoxMap(Account, GameList, key_prefix=b"account_")

#     @arc4.abimethod
#     def create_game(self):
#         # Only creator can create games
#         assert Txn.sender == Global.creator_address

#         # Create new game ID
#         game_id = self.game_counter.value + 1
#         self.game_counter.value = game_id

#         # Initialize game state
#         self.game_states[game_id] = GameState(
#             status=GameStatus.REGISTRATION,
#             start_time=Global.latest_timestamp + 3600,  # Start in 1 hour
#             end_time=Global.latest_timestamp + 86400   # End in 24 hours
#         )

#         # Initialize empty player list
#         self.game_players[game_id] = PlayerList()

#         # Initialize winner data
#         self.game_winners[game_id] = WinnerData(
#             high_score=UInt64(0),
#             winner=Account()
#         )

#         return game_id

#     @arc4.abimethod
#     def play_game(self, game_id: UInt64):
#         # Verify player is registered
#         player_games = self.player_games[Txn.sender]
#         assert player_games.is_registered(game_id), "Not registered for this game"

#         # Verify game is active
#         game_state = self.game_states[game_id]
#         assert game_state.status == GameStatus.ACTIVE

#         # Game logic to generate player score
#         player_score = calculate_score()

#         # Update winner if better score
#         winner_data = self.game_winners[game_id]
#         if player_score > winner_data.high_score:
#             self.game_winners[game_id] = WinnerData(
#                 high_score=player_score,
#                 winner=Txn.sender
#             )

# class Pieout(ARC4Contract):
#     # Global State type declarations
#     game_id: UInt64
#     vrf_commit_id: UInt64
#     max_players: UInt64  # Store the max players as global state

#     def __init__(self) -> None:
#         super().__init__()
#         # Box Storage type declarations
#         self.box_game = BoxMap(UInt64, GameBoxVal, key_prefix=b"g_")
#         self.box_players = BoxMap(UInt64, arc4.DynamicArray[arc4.Address], key_prefix=b"p_")

#     @arc4.abimethod
#     def create_game(self, player_count: UInt64) -> UInt64:
#         # Validate player count is within acceptable range
#         assert player_count > UInt64(0)
#         assert player_count <= self.max_players
        
#         # Create a new game ID
#         new_game_id = self.game_id
#         self.game_id += UInt64(1)
        
#         # Initialize the game box
#         self.box_game[new_game_id] = GameBoxVal(
#             creator_stake_status=arc4.Bool(False),
#             staking_finalized=arc4.Bool(False),
#             prize_pool_claimed=arc4.Bool(False),
#             total_players=arc4.UInt8(player_count),  # Store the player count
#             high_score=arc4.UInt16(0),
#             winner_address=arc4.Address(),
#             prize_pool=arc4.UInt64(0)
#         )
        
#         # Initialize an empty players array
#         self.box_players[new_game_id] = arc4.DynamicArray[arc4.Address]()
        
#         return new_game_id
        
#     # When adding a player, enforce the limit
#     @arc4.abimethod
#     def add_player(self, game_id: UInt64, player: arc4.Address) -> None:
#         game = self.box_game[game_id]
#         players = self.box_players[game_id]
        
#         # Check if we've reached the player limit for this game
#         assert players.length < game.total_players
        
#         # Add the player
#         players.push(player)
#         self.box_players[game_id] = players
