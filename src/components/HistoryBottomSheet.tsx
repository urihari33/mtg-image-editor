import type { CardEntry } from '../types/card'

type Props = {
  history: CardEntry[]
  onPickCard: (card: CardEntry) => void
  onClear: () => void
}

export function HistoryBottomSheet({ history, onPickCard, onClear }: Props) {
  const handleClear = () => {
    if (history.length === 0) return
    if (window.confirm(`履歴 ${history.length} 件を削除しますか？`)) {
      onClear()
    }
  }
  return (
    <div className="history-bar" role="region" aria-label="検索履歴">
      <button
        type="button"
        className="history-bar-clear"
        onClick={handleClear}
        disabled={history.length === 0}
        aria-label="履歴をクリア"
        title="履歴をクリア"
      >
        ×
      </button>
      <span className="history-bar-label">📚 ({history.length})</span>
      {history.length === 0 ? (
        <span className="history-bar-empty">履歴なし</span>
      ) : (
        <ul className="history-bar-list">
          {history.map((card) => (
            <li key={card.oracleId}>
              <button
                type="button"
                className="history-bar-item"
                onClick={() => onPickCard(card)}
                title={card.englishName}
                aria-label={`${card.displayName} を最後の行に追加`}
              >
                <img
                  src={card.imageUrl}
                  alt=""
                  loading="lazy"
                  draggable={false}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
