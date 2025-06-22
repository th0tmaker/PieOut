//src/hooks/useCurrentTimestamp.ts
import { useEffect, useState } from 'react'

export function useCurrentTimestamp() {
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return currentTimestamp
}
