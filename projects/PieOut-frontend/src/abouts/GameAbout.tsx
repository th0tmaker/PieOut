//src/abouts/GameAbout.tsx

// Create a description that informs the user what the game modal is about and it's functionality
const GameAboutContent = () => {
  return (
    <div className="text-sm text-white space-y-3">
      <p>
        The <strong>Game</strong> portal displays all currently active games by their unique Game ID in ascending order. Each game entry
        also shows the admin address, which is the wallet that created and manages that specific game instance.
      </p>
      <ul className="list-disc list-inside space-y-2 ml-4">
        <li>
          <strong>Quick Play:</strong> When enabled, grants the admin flexibility to start the game early with a minimum of two players.
          When disabled, the game begins automatically only when the lobby reaches full max players capacity or the queue timer expires.
        </li>
        <li>
          <strong>Max Players:</strong> The maximum number of participants allowed in the game, defined by the creator at the time of game
          creation.
        </li>
        <li>
          <strong>Game ID:</strong> A unique identifier assigned to each game lobby, useful for tracking and distinguishing between games.
        </li>
        <li>
          <strong>Admin:</strong> The wallet address of the user who created the game. The creator is also assigned the admin role and is
          always included as a player in their own game.
        </li>
      </ul>
      <p className="text-xs text-gray-400">
        To create a new game you must first specify a valid `Max Players` value (between 3 and 16). Each Algorand address can only host one
        game at a time. To create a new game with different settings, the existing game must be deleted first.
      </p>
    </div>
  )
}

export default GameAboutContent
