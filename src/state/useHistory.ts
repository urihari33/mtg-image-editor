import { useCallback, useState } from 'react'
import type { CardEntry } from '../types/card'
import {
  DEFAULT_HISTORY_MAX,
  addToHistory,
  clearHistoryStorage,
  loadHistory,
  saveHistory,
} from './history'

export function useHistory(maxSize: number = DEFAULT_HISTORY_MAX) {
  const [history, setHistory] = useState<CardEntry[]>(loadHistory)

  const addCard = useCallback(
    (card: CardEntry) => {
      setHistory((prev) => {
        const next = addToHistory(prev, card, maxSize)
        saveHistory(next)
        return next
      })
    },
    [maxSize],
  )

  const clear = useCallback(() => {
    clearHistoryStorage()
    setHistory([])
  }, [])

  return { history, addCard, clear }
}
