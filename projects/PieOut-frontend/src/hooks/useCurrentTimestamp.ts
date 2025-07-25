//src/hooks/useCurrentTimestamp.ts
import { useEffect, useState, useRef } from 'react'

// Define a custom React hook that tracks the current timestamp based on the user's local machine system clock
export function useCurrentTimestamp(intervalMs = 1000) {
  // --- States ---
  // Store current timestamp (number of ms elapsed since midnight, January 1, 1970, UTC)
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now())

  // --- Refs ---
  const intervalRef = useRef<NodeJS.Timeout>() // Hold interval ID for polling (so it can be cleared later)

  // --- Effect: Update timestamp at interval---
  useEffect(() => {
    // Function to update the current timestamp state with the latest system time
    const updateTimestamp = () => setCurrentTimestamp(Date.now())

    // Start a repeating interval to update timestamp every intervalMs milliseconds
    intervalRef.current = setInterval(updateTimestamp, intervalMs)

    // Cleanup function to clear the interval when the component unmounts or intervalMs changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [intervalMs])

  // Return the current timestamp value from the hook
  return currentTimestamp
}
