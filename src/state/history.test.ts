import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardEntry } from '../types/card'
import {
  HISTORY_STORAGE_KEY,
  addToHistory,
  clearHistoryStorage,
  loadHistory,
  saveHistory,
} from './history'

function makeCard(oracleId: string, englishName = `card-${oracleId}`): CardEntry {
  return {
    oracleId,
    scryfallId: `s-${oracleId}`,
    englishName,
    displayName: englishName,
    hasJapanese: false,
    imageUrl: `https://example.com/${oracleId}.jpg`,
    setCode: 'tst',
    releasedAt: '2024-01-01',
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('addToHistory', () => {
  it('prepends the new card at the head', () => {
    const a = makeCard('a')
    const b = makeCard('b')
    const next = addToHistory(addToHistory([], a), b)
    expect(next.map((c) => c.oracleId)).toEqual(['b', 'a'])
  })

  it('moves an already-existing oracleId to the head (dedup)', () => {
    const a = makeCard('a')
    const b = makeCard('b')
    const next = addToHistory(addToHistory(addToHistory([], a), b), a)
    expect(next.map((c) => c.oracleId)).toEqual(['a', 'b'])
  })

  it('caps the history at the provided maxSize, dropping the oldest', () => {
    const cards = Array.from({ length: 5 }, (_, i) => makeCard(`c${i}`))
    let history: CardEntry[] = []
    for (const c of cards) history = addToHistory(history, c, 3)
    expect(history.map((c) => c.oracleId)).toEqual(['c4', 'c3', 'c2'])
  })

  it('uses default maxSize of 100', () => {
    let history: CardEntry[] = []
    for (let i = 0; i < 101; i += 1) {
      history = addToHistory(history, makeCard(`c${i}`))
    }
    expect(history).toHaveLength(100)
    expect(history[0].oracleId).toBe('c100')
    expect(history[history.length - 1].oracleId).toBe('c1')
  })
})

describe('loadHistory & saveHistory', () => {
  it('round-trips through localStorage', () => {
    const a = makeCard('a')
    const b = makeCard('b')
    saveHistory([b, a])
    expect(loadHistory().map((c) => c.oracleId)).toEqual(['b', 'a'])
  })

  it('returns an empty array when storage is missing', () => {
    expect(loadHistory()).toEqual([])
  })

  it('returns an empty array on malformed JSON and logs a warning', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, '{not-json')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(loadHistory()).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns an empty array when stored value is not an array', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify({ foo: 'bar' }))
    expect(loadHistory()).toEqual([])
  })

  it('filters out entries that do not match the CardEntry shape', () => {
    const valid = makeCard('a')
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([valid, { oracleId: 'incomplete' }, null]),
    )
    expect(loadHistory().map((c) => c.oracleId)).toEqual(['a'])
  })
})

describe('clearHistoryStorage', () => {
  it('removes the storage key', () => {
    saveHistory([makeCard('a')])
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).not.toBeNull()
    clearHistoryStorage()
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull()
  })
})
