import { useCallback, useState } from 'react'
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from './preferences'

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    typeof window === 'undefined' ? DEFAULT_PREFERENCES : loadPreferences(),
  )

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences((prev) => {
        if (prev[key] === value) return prev
        const next = { ...prev, [key]: value }
        savePreferences(next)
        return next
      })
    },
    [],
  )

  return { preferences, setPreference }
}
