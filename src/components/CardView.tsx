import type { LayoutItem } from '../types/card'

type Props = {
  item: LayoutItem
  onRemove?: (itemId: string) => void
  onFlip?: (itemId: string) => void
}

function getActiveFaceFields(item: LayoutItem) {
  const { card, faceIndex } = item
  if (faceIndex !== undefined && card.faces && card.faces[faceIndex]) {
    const face = card.faces[faceIndex]
    return {
      imageUrl: face.imageUrl,
      displayName: face.displayName,
      hasJapanese: face.hasJapanese,
    }
  }
  return {
    imageUrl: card.imageUrl,
    displayName: card.displayName,
    hasJapanese: card.hasJapanese,
  }
}

export function CardView({ item, onRemove, onFlip }: Props) {
  const { card } = item
  const { imageUrl, displayName, hasJapanese } = getActiveFaceFields(item)
  const isDoubleFaced = !!card.faces && card.faces.length >= 2
  const titleText = hasJapanese
    ? `《${displayName}》`
    : `《${displayName}》(英語版のみ)`
  return (
    <div className="card-view" title={titleText}>
      <img
        src={imageUrl}
        alt={displayName}
        width={488}
        height={680}
        loading="lazy"
        draggable={false}
      />
      {!hasJapanese && (
        <span
          className="no-ja-badge"
          title="このカードは日本語版が登録されていません"
        >
          EN
        </span>
      )}
      {isDoubleFaced && onFlip && (
        <button
          type="button"
          className="card-flip"
          aria-label={`${displayName} の面を切り替え`}
          title="裏返す"
          onClick={(e) => {
            e.stopPropagation()
            onFlip(item.id)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ↻
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          className="card-remove"
          aria-label={`${displayName} を削除`}
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
