import { useEffect } from 'react'
import type { CardEntry } from '../types/card'

type Props = {
  title: string
  printings: CardEntry[]
  loading: boolean
  error?: string | null
  onPick: (card: CardEntry) => void
  onClose: () => void
}

export function PrintPickerModal({
  title,
  printings,
  loading,
  error,
  onPick,
  onClose,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="print-picker-overlay"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="print-picker"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} のプリント一覧`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="print-picker-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="print-picker-close"
            onClick={onClose}
            aria-label="閉じる"
            title="閉じる (Esc)"
          >
            ×
          </button>
        </header>
        <p className="print-picker-meta-text">
          画像をクリックするとそのプリントが配置されます
        </p>
        {loading && (
          <p className="print-picker-status" role="status">
            プリント一覧を取得中…
          </p>
        )}
        {error && (
          <p className="print-picker-status is-error" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && printings.length === 0 && (
          <p className="print-picker-status">プリントが見つかりませんでした</p>
        )}
        {printings.length > 0 && (
          <ul className="print-picker-grid">
            {printings.map((card) => (
              <li key={card.scryfallId}>
                <button
                  type="button"
                  className="print-picker-card"
                  onClick={() => onPick(card)}
                  title={`${card.setCode.toUpperCase()} (${card.releasedAt})${
                    card.hasJapanese ? ' / 日本語版' : ' / 英語版のみ'
                  }`}
                >
                  <img
                    src={card.imageUrl}
                    alt={card.displayName}
                    loading="lazy"
                    draggable={false}
                  />
                  <span className="print-picker-card-meta">
                    {card.setCode.toUpperCase()} · {card.releasedAt}
                    {!card.hasJapanese && ' · EN'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
