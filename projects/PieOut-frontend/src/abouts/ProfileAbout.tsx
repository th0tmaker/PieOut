// src/abouts/ProfileAbout.tsx

// Create a description that informs the user what the profile modal is about and it's functionality
const ProfileAboutContent = () => {
  return (
    <div className="text-xs text-white space-y-3">
      <p>
        To use this application, users must first register their account by clicking the 'Register' button below. If a user is not
        registered, the 'Status' field will denote so, and all commitment data values will be displayed as 'N/D' (no data).
      </p>

      <p>Upon registration, each user is assigned a unique set of commitment data required to interact with the application. These are:</p>
      <ul className="list-disc list-inside space-y-2 ml-4">
        <li>
          <strong>Status:</strong> Shows if the user is registered. Unregistered users cannot create or play games.
        </li>
        <li>
          <strong>Account:</strong> The user's Base32 address, which can be copied using the adjacent button.
        </li>
        <li>
          <strong>Hosting Game:</strong> Indicates if the user is currently hosting a game. Only one game can be hosted at a time; users
          must delete an existing game before creating a new one.
        </li>
        <li>
          <strong>Game ID:</strong> If zero, the user can join an existing game. A non-zero value means they’re already in one.
        </li>
        <li>
          <strong>PB Score:</strong> The user's personal best score across all games ever played. This data does NOT persist if account gets
          unregistered from the application.
        </li>
        <li>
          <strong>Commit Round:</strong> The round used to generate a random score. It must be ≤ the current blockchain round.
        </li>
        <li>
          <strong>Expiry Round:</strong> The round after which a user's registration expires. Playing games extends this window. Once
          expired, other users may unregister the account.
        </li>
      </ul>

      <p className="text-xs text-gray-400">
        <strong>Note:</strong> Users can only commit to one game at a time. A non-zero Game ID means the user must first finish or expire
        from the current game before committing again.
      </p>
    </div>
  )
}

export default ProfileAboutContent
