//src/blurs/HonorsBlurb.tsx
const HonorsBlurbContent = () => {
  return (
    <div className="text-sm text-white space-y-3">
      <p>
        The <strong>Honors</strong> portal showcases the all-time highest score achieved across all games on this app, the wallet address of
        the top-scoring player (referred to as the <strong>Highscorer</strong>), and the exclusive <em>Trophy</em> NFT awarded for reaching
        that milestone.
      </p>

      <ul className="list-disc list-inside space-y-2 ml-4">
        <li>
          <strong>High Score:</strong> The all-time highest score recorded across all games played.
        </li>
        <li>
          <strong>Highscorer:</strong> The wallet address (Base32 format) of the player who achieved the high score. Use the copy button
          next to the address to copy it to your clipboard.
        </li>
        <li>
          <strong>Trophy (Asset ID):</strong> The unique NFT asset awarded to the highscorer. Only the current top scorer can claim it.
        </li>
      </ul>

      <p className="text-xs text-gray-400">
        To claim the <strong>Trophy</strong>, the highscorer must first opt in to the asset. Once opted in, the app transfers the asset to
        the highscorer account. If a new player sets a higher score in some later game, the app will reclaim the asset via clawback and make
        it available to the new highscorer via the 'Claim' button.
      </p>
    </div>
  )
}

export default HonorsBlurbContent
