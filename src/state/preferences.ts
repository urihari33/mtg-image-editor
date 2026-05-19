export type PreferLanguage = 'ja' | 'en'
export type PreferAge = 'oldest' | 'newest'
export type OutputAlignment = 'left' | 'center' | 'right'
export type UiMode = 'auto' | 'mobile' | 'desktop'

export type Preferences = {
  preferLanguage: PreferLanguage
  preferAge: PreferAge
  outputAlignment: OutputAlignment
  pickPrintMode: boolean
  uiMode: UiMode
}

export const PREFERENCES_STORAGE_KEY = 'mtgImageEditor.preferences.v1'

export const DEFAULT_PREFERENCES: Preferences = {
  preferLanguage: 'ja',
  preferAge: 'oldest',
  outputAlignment: 'left',
  pickPrintMode: false,
  uiMode: 'auto',
}

const VALID_ALIGNMENTS: ReadonlySet<OutputAlignment> = new Set([
  'left',
  'center',
  'right',
])

const VALID_UI_MODES: ReadonlySet<UiMode> = new Set([
  'auto',
  'mobile',
  'desktop',
])

export function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_PREFERENCES
    const v = parsed as Record<string, unknown>
    return {
      preferLanguage:
        v.preferLanguage === 'en' ? 'en' : DEFAULT_PREFERENCES.preferLanguage,
      preferAge:
        v.preferAge === 'newest' ? 'newest' : DEFAULT_PREFERENCES.preferAge,
      outputAlignment:
        typeof v.outputAlignment === 'string' &&
        VALID_ALIGNMENTS.has(v.outputAlignment as OutputAlignment)
          ? (v.outputAlignment as OutputAlignment)
          : DEFAULT_PREFERENCES.outputAlignment,
      pickPrintMode:
        typeof v.pickPrintMode === 'boolean'
          ? v.pickPrintMode
          : DEFAULT_PREFERENCES.pickPrintMode,
      uiMode:
        typeof v.uiMode === 'string' && VALID_UI_MODES.has(v.uiMode as UiMode)
          ? (v.uiMode as UiMode)
          : DEFAULT_PREFERENCES.uiMode,
    }
  } catch (error) {
    console.warn('Failed to load preferences from localStorage', error)
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.warn('Failed to save preferences to localStorage', error)
  }
}

export function clearPreferencesStorage(): void {
  localStorage.removeItem(PREFERENCES_STORAGE_KEY)
}
