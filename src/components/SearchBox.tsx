import { useEffect, useId, useRef, useState } from 'react'
import { searchAutocomplete } from '../api/scryfall'
import type { CardSuggestion } from '../types/card'

type Props = {
  onPickSuggestion: (englishName: string) => void
  disabled?: boolean
}

const DEBOUNCE_MS = 200

export function SearchBox({ onPickSuggestion, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<CardSuggestion[]>([])
  const [suggestionsForQuery, setSuggestionsForQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const listboxId = useId()
  const optionIdPrefix = useId()
  const requestSeqRef = useRef(0)

  const trimmedQuery = query.trim()
  const visibleSuggestions =
    trimmedQuery && trimmedQuery === suggestionsForQuery ? suggestions : []
  const showList = isOpen && visibleSuggestions.length > 0
  const showLoading = isLoading && !!trimmedQuery
  const activeId = showList ? `${optionIdPrefix}-${highlightedIndex}` : undefined

  useEffect(() => {
    if (!trimmedQuery) return
    const seq = ++requestSeqRef.current
    const timer = setTimeout(() => {
      setIsLoading(true)
      searchAutocomplete(trimmedQuery)
        .then((result) => {
          if (seq !== requestSeqRef.current) return
          setSuggestions(result)
          setSuggestionsForQuery(trimmedQuery)
          setHighlightedIndex(0)
          setIsOpen(result.length > 0)
        })
        .catch(() => {
          if (seq !== requestSeqRef.current) return
          setSuggestions([])
          setSuggestionsForQuery(trimmedQuery)
          setIsOpen(false)
        })
        .finally(() => {
          if (seq === requestSeqRef.current) setIsLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmedQuery])

  const pick = (index: number) => {
    const item = visibleSuggestions[index]
    if (!item) return
    onPickSuggestion(item.englishName)
    setQuery('')
    setSuggestions([])
    setSuggestionsForQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) {
      if (event.key === 'ArrowDown' && visibleSuggestions.length > 0) {
        setIsOpen(true)
        event.preventDefault()
      }
      return
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % visibleSuggestions.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setHighlightedIndex(
          (prev) =>
            (prev - 1 + visibleSuggestions.length) % visibleSuggestions.length,
        )
        break
      case 'Enter':
        event.preventDefault()
        pick(highlightedIndex)
        break
      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="search-box">
      <input
        type="search"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        placeholder="カード名で検索（日本語 / 英語）"
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (visibleSuggestions.length > 0) setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
      />
      {showLoading && (
        <span className="search-loading" aria-hidden="true">
          …
        </span>
      )}
      {showList && (
        <ul id={listboxId} role="listbox" className="search-suggestions">
          {visibleSuggestions.map((s, idx) => {
            const id = `${optionIdPrefix}-${idx}`
            const selected = idx === highlightedIndex
            return (
              <li
                key={`${s.englishName}-${idx}`}
                id={id}
                role="option"
                aria-selected={selected}
                className={selected ? 'is-highlighted' : undefined}
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(idx)
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <span className="suggestion-en">{s.englishName}</span>
                {s.japaneseName && (
                  <span className="suggestion-ja">{s.japaneseName}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
