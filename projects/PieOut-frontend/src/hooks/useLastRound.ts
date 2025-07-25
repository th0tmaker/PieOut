//src/hooks/useLastRound.ts
import { useCallback, useEffect, useState, useRef } from 'react'
import { AlgodClient } from 'algosdk/dist/types/client/v2/algod/algod'

// Define a custom React hook to track the last round number from the Algorand blockchain.
export function useLastRound(algod: AlgodClient | undefined, pollInterval = 2000) {
  // --- States ---
  const [lastRound, setLastRound] = useState<number | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // --- Refs ---
  const intervalRef = useRef<NodeJS.Timeout>() // Hold interval ID for polling (so it can be cleared later)

  // --- Methods (Callback) ---
  // Define a memoized async function that attempts to get the latest round number from the blockchain
  const getLastRound = useCallback(async () => {
    // If no instance of `AlgodClient` exsists, return
    if (!algod) return

    // Try block
    try {
      // Get node status response
      const status = await algod.status().do()
      // Get last block round from status response
      const lastRoundStatus = Number(status.lastRound)

      // Set last round state
      setLastRound((prev) => {
        // Check if the new value `lastRoundStatus` is different from the previous state (prev)
        if (prev !== lastRoundStatus) {
          // If different, update the state to the new value
          return lastRoundStatus
        }
        // If same, return the previous state (no state update)
        return prev
      })

      // Clear any previous errors if get method was successful
      if (error) setError(null)
      // Catch error
    } catch (err) {
      setError(err instanceof Error ? err : new Error('[getLastRound()] Error: Could not get last round from AlgodClient node status'))
    }
  }, [algod, error])

  // --- Effect: Reset Last Round and Error state---
  useEffect(() => {
    // If no instance of `AlgodClient` exsists, reset last round and error states and return
    if (!algod) {
      setLastRound(null)
      setError(null)
      return
    }

    // Initial Call of `getLastRound()`
    getLastRound()

    // Set up polling to call `getLastRound()` at the specified interval set in the function's params
    intervalRef.current = setInterval(getLastRound, pollInterval)

    // Short cleanup function to stop polling when the component unmounts or the specified dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [algod, pollInterval, getLastRound])

  // Return and expose access to the hook's state and function externally
  return {
    lastRound, // The most recently fetched round number
    getLastRound, // The function to manually trigger a fetch
    error, // Any error encountered while fetching
  }
}
