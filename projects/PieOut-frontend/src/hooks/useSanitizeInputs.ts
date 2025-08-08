import { useCallback } from 'react'

export const useGameIdSanitizer = (setGameId: (val: string) => void) =>
  useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const numOnlyInput = e.target.value.replace(/\D/g, '')
      setGameId(numOnlyInput)
    },
    [setGameId],
  )

export const useAddressSanitizer = (setAddress: (val: string) => void) =>
  useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const base32Sanitized = e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '')
      setAddress(base32Sanitized)
    },
    [setAddress],
  )
