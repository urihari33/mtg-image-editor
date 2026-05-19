import { useEffect } from 'react'
import type { Layout, LayoutItem } from '../types/card'
import { findItem } from '../state/layout'

type Props = {
  layout: Layout
  selectedItemId: string
  onMoveLeft: () => void
  onMoveRight: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onFlip: () => void
  onDelete: () => void
  onStartOverlay: () => void
  onClearOverlay: () => void
  onClose: () => void
}

function canMoveLeft(layout: Layout, itemId: string): boolean {
  const loc = findItem(layout, itemId)
  if (!loc) return false
  if (loc.item.overlayOf !== undefined) return false
  // 自分より前に base があれば true
  for (let i = 0; i < loc.index; i += 1) {
    if (loc.row.items[i].overlayOf === undefined) return true
  }
  return false
}

function canMoveRight(layout: Layout, itemId: string): boolean {
  const loc = findItem(layout, itemId)
  if (!loc) return false
  if (loc.item.overlayOf !== undefined) return false
  for (let i = loc.index + 1; i < loc.row.items.length; i += 1) {
    if (loc.row.items[i].overlayOf === undefined) return true
  }
  return false
}

function isDoubleFaced(item: LayoutItem): boolean {
  return Boolean(item.card.faces && item.card.faces.length >= 2)
}

function hasOverlays(layout: Layout, baseId: string): boolean {
  for (const row of layout.rows) {
    for (const it of row.items) {
      if (it.overlayOf === baseId) return true
    }
  }
  return false
}

export function CardActionPanel({
  layout,
  selectedItemId,
  onMoveLeft,
  onMoveRight,
  onMoveUp,
  onMoveDown,
  onFlip,
  onDelete,
  onStartOverlay,
  onClearOverlay,
  onClose,
}: Props) {
  const loc = findItem(layout, selectedItemId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!loc) return null
  const { item } = loc
  const isOverlay = item.overlayOf !== undefined
  const dfc = isDoubleFaced(item)
  const canBeOverlaySource = !isOverlay && !hasOverlays(layout, selectedItemId)
  const leftDisabled = !canMoveLeft(layout, selectedItemId)
  const rightDisabled = !canMoveRight(layout, selectedItemId)

  return (
    <>
      <div
        className="card-action-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="card-action-panel"
        role="dialog"
        aria-label={`${item.card.displayName} のアクション`}
      >
        <header className="card-action-header">
          <span className="card-action-title">
            《{item.card.displayName}》
            {isOverlay && (
              <span className="card-action-badge">重ね合わせ</span>
            )}
          </span>
          <button
            type="button"
            className="card-action-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className={`card-action-body${isOverlay ? ' is-overlay' : ''}`}>
          {!isOverlay && (
            <div className="card-action-move" role="group" aria-label="移動">
              <button
                type="button"
                className="card-action-arrow card-action-arrow-up"
                onClick={onMoveUp}
                aria-label="上の行へ移動"
              >
                ↑
              </button>
              <button
                type="button"
                className="card-action-arrow card-action-arrow-left"
                onClick={onMoveLeft}
                disabled={leftDisabled}
                aria-label="左へ移動"
              >
                ←
              </button>
              <button
                type="button"
                className="card-action-arrow card-action-arrow-right"
                onClick={onMoveRight}
                disabled={rightDisabled}
                aria-label="右へ移動"
              >
                →
              </button>
              <button
                type="button"
                className="card-action-arrow card-action-arrow-down"
                onClick={onMoveDown}
                aria-label="下の行へ移動"
              >
                ↓
              </button>
            </div>
          )}

          <div className="card-action-buttons">
            {isOverlay ? (
              <button
                type="button"
                className="card-action-button"
                onClick={onClearOverlay}
              >
                🔗 解除
              </button>
            ) : canBeOverlaySource ? (
              <button
                type="button"
                className="card-action-button"
                onClick={onStartOverlay}
              >
                🔗 重ねる
              </button>
            ) : null}
            {dfc && (
              <button
                type="button"
                className="card-action-button"
                onClick={onFlip}
              >
                ↻ 裏返す
              </button>
            )}
            <button
              type="button"
              className="card-action-button is-danger"
              onClick={onDelete}
            >
              🗑 削除
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
