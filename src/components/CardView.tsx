import type { LayoutItem } from '../types/card'

type Props = {
  item: LayoutItem
  onRemove?: (itemId: string) => void
}

export function CardView({ item, onRemove }: Props) {
  const { card } = item
  const titleText = card.hasJapanese
    ? `《${card.displayName}》`
    : `《${card.displayName}》(英語版のみ)`
  return (
    <div className="card-view" title={titleText}>
      <img
        src={card.imageUrl}
        alt={card.displayName}
        width={488}
        height={680}
        loading="lazy"
        draggable={false}
      />
      {!card.hasJapanese && (
        <span
          className="no-ja-badge"
          title="このカードは日本語版が登録されていません"
        >
          EN
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          className="card-remove"
          aria-label={`${card.displayName} を削除`}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(item.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ×
        </button>
      )}
    </div>
  )
}
