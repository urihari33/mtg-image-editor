import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  clearPreferencesStorage,
  loadPreferences,
  savePreferences,
} from './preferences'

beforeEach(() => {
  localStorage.clear()
})

describe('loadPreferences', () => {
  it('returns defaults when storage is empty', () => {
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
  })

  it('round-trips through savePreferences', () => {
    savePreferences({
      preferLanguage: 'en',
      preferAge: 'newest',
      outputAlignment: 'right',
      pickPrintMode: true,
    })
    expect(loadPreferences()).toEqual({
      preferLanguage: 'en',
      preferAge: 'newest',
      outputAlignment: 'right',
      pickPrintMode: true,
    })
  })

  it('accepts valid outputAlignment from storage', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        preferLanguage: 'ja',
        preferAge: 'oldest',
        outputAlignment: 'center',
      }),
    )
    expect(loadPreferences().outputAlignment).toBe('center')
  })

  it('rejects unknown outputAlignment and falls back to default', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        preferLanguage: 'ja',
        preferAge: 'oldest',
        outputAlignment: 'diagonal',
      }),
    )
    expect(loadPreferences().outputAlignment).toBe(
      DEFAULT_PREFERENCES.outputAlignment,
    )
  })

  it('falls back to defaults on malformed JSON and logs a warning', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{not-json')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('falls back to defaults when stored value is not an object', () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(['array']))
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
  })

  it('uses defaults for unrecognized field values', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ preferLanguage: 'fr', preferAge: 'middle' }),
    )
    expect(loadPreferences()).toEqual(DEFAULT_PREFERENCES)
  })
})

describe('clearPreferencesStorage', () => {
  it('removes the storage key', () => {
    savePreferences({
      preferLanguage: 'en',
      preferAge: 'newest',
      outputAlignment: 'right',
      pickPrintMode: false,
    })
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).not.toBeNull()
    clearPreferencesStorage()
    expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull()
  })
})
