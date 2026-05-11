import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CardEntry } from '../types/card'

type Props = {
  history: CardEntry[]
  onPickCard: (card: CardEntry) => void
  onClear: () => void
}

function DraggableHistoryItem({
  card,
  onPick,
}: {
  card: CardEntry
  onPick: (card: CardEntry) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `history-${card.oracleId}`,
      data: { type: 'sidebar-card', card },
    })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      className="sidebar-item"
      onClick={() => onPick(card)}
      title={`${card.englishName}（ドラッグでキャンバスへ配置できます）`}
      {...attributes}
      {...listeners}
    >
      <img src={card.imageUrl} alt="" loading="lazy" />
      <span className="sidebar-item-name">{card.displayName}</span>
    </button>
  )
}

export function Sidebar({ history, onPickCard, onClear }: Props) {
  return (
    <aside className="sidebar" aria-label="検索履歴">
      <header className="sidebar-header">
        <h2>履歴 ({history.length})</h2>
        {history.length > 0 && (
          <button type="button" className="sidebar-clear" onClick={onClear}>
            クリア
          </button>
        )}
      </header>
      {history.length === 0 ? (
        <p className="sidebar-empty">検索したカードがここに残ります</p>
      ) : (
        <ul className="sidebar-list">
          {history.map((card) => (
            <li key={card.oracleId}>
              <DraggableHistoryItem card={card} onPick={onPickCard} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
