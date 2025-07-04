// src/components/UserMsgText.tsx
import React from 'react'

const ProfileText = () => {
  return (
    <div className="text-sm text-white space-y-3">
      <p>
        To use this application, users must first register their account by clicking the 'Register' button below. If a user is not
        registered, the 'Status' field will denote so, and all commitment data values will be displayed as 'N/D' (no data).
      </p>

      <p>Upon registration, each user is assigned a unique set of commitment data required to interact with the application. These are:</p>

      <ul className="list-disc list-inside space-y-2 ml-4">
        <li>
          <strong>Status:</strong> Indicates whether the user is currently registered. Users that are not officially registered cannot start
          new games or join and play existing ones.
        </li>
        <li>
          <strong>Account:</strong> The Base32 Address representation of the user registered account. This address can be copied to the
          clipboard via the button to the right of the address.
        </li>
        <li>
          <strong>Game ID:</strong> If value is zero, the user is registered and able to create a new game or join an existing one. If value
          is non-zero, the user is already committed to an existing game.
        </li>
        <li>
          <strong>Commit Round:</strong> The round used to generate a random score when playing. This round must not be greater than the
          current round to ensure the random score will be available.
        </li>
        <li>
          <strong>Expiry Round:</strong> The round after which the user registration expires. Continually playing games extends the expiry
          window. If the current round is greater than the expiry round, any account can be unregistered by another user.
        </li>
      </ul>

      <p className="text-xs text-gray-400">
        Note: Users can only commit to one game at a time, only if the Game ID value is zero. When Game ID value is non-zero, users must
        first play through (or expire out of) their committed game. This will set the Game ID value back to zero and enable the user to set
        a new commitment.
      </p>
    </div>
  )
}

export default ProfileText
