import type { CardEntry } from '../types/card'

export const HISTORY_STORAGE_KEY = 'mtgImageEditor.history.v1'
export const DEFAULT_HISTORY_MAX = 100

export function addToHistory(
  history: CardEntry[],
  card: CardEntry,
  maxSize: number = DEFAULT_HISTORY_MAX,
): CardEntry[] {
  const deduped = history.filter((entry) => entry.oracleId !== card.oracleId)
  return [card, ...deduped].slice(0, maxSize)
}

export function saveHistory(history: CardEntry[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  } catch (error) {
    console.warn('Failed to save history to localStorage', error)
  }
}

export function loadHistory(): CardEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCardEntry)
  } catch (error) {
    console.warn('Failed to load history from localStorage', error)
    return []
  }
}

export function clearHistoryStorage(): void {
  localStorage.removeItem(HISTORY_STORAGE_KEY)
}

function isCardEntry(value: unknown): value is CardEntry {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.oracleId === 'string' &&
    typeof v.scryfallId === 'string' &&
    typeof v.englishName === 'string' &&
    typeof v.displayName === 'string' &&
    typeof v.hasJapanese === 'boolean' &&
    typeof v.imageUrl === 'string' &&
    typeof v.setCode === 'string' &&
    typeof v.releasedAt === 'string'
  )
}
