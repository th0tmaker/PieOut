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
          <strong>ATH Score:</strong> The all-time highest score recorded across all games played.
        </li>
        <li>
          <strong>ATH Address:</strong> The wallet address (Base32) of the player who achieved the all-time highest score. Use the copy
          button next to the address to copy it to your clipboard.
        </li>
        <li>
          <strong>Trophy (Asset ID):</strong> The unique NFT asset awarded to the highscorer. Only the current top scorer can claim it.
        </li>
      </ul>

      <p className="text-xs text-gray-400">
        To claim the <strong>Trophy</strong>, the highscorer must first opt in to the asset. Once opted in, the user can request the asset
        be transfered to their account balance by using the 'Claim' button. If a new player sets a higher score in some later game, the app
        will reclaim the asset from the current holder via a clawback transaction and make it available to the new highscorer if they want
        to claim it.
      </p>
    </div>
  )
}

export default HonorsBlurbContent
