import { useCallback, useLayoutEffect, useRef, type Ref } from 'react'
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Layout, LayoutItem } from '../types/card'
import type { ItemGroup } from '../state/layout'
import { groupRowItems } from '../state/layout'
import { CardView } from './CardView'

function OverlayDropZone({ baseId }: { baseId: string }) {
  const { active } = useDndContext()
  const activeData = active?.data.current as
    | { type?: string; hasOverlays?: boolean }
    | undefined
  const activeHasOverlays = Boolean(activeData?.hasOverlays)
  const isDraggingThisBase = active?.id === baseId
  const disabled = activeHasOverlays || isDraggingThisBase
  const { setNodeRef, isOver } = useDroppable({
    id: `overlay-zone-${baseId}`,
    data: { type: 'overlay-zone', baseId },
    disabled,
  })
  const isDragInProgress = Boolean(active)
  if (isDraggingThisBase) return null
  if (activeHasOverlays) return null
  return (
    <div
      ref={setNodeRef}
      className={`overlay-drop-zone${isOver ? ' is-over' : ''}${isDragInProgress ? ' is-drag-active' : ''}`}
      title="ここにドロップで重ね合わせ"
      aria-label="重ね合わせドロップエリア"
    >
      <span className="overlay-drop-zone-badge">
        <span className="overlay-drop-zone-icon" aria-hidden="true">
          🔗
        </span>
        {isDragInProgress && (
          <span className="overlay-drop-zone-label">重ねる</span>
        )}
      </span>
    </div>
  )
}

function SortableBase({
  group,
  onRemoveItem,
  onFlipItem,
}: {
  group: ItemGroup
  onRemoveItem?: (id: string) => void
  onFlipItem?: (id: string) => void
}) {
  const hasOverlays = group.overlays.length > 0
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: group.base.id,
      data: { type: 'item', itemId: group.base.id, hasOverlays },
    })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-base"
      {...attributes}
      {...listeners}
    >
      <CardView item={group.base} onRemove={onRemoveItem} onFlip={onFlipItem} />
      {group.overlays.map((ov) => (
        <DraggableOverlay
          key={ov.id}
          item={ov}
          onRemove={onRemoveItem}
          onFlip={onFlipItem}
        />
      ))}
      <OverlayDropZone baseId={group.base.id} />
    </div>
  )
}

function DraggableOverlay({
  item,
  onRemove,
  onFlip,
}: {
  item: LayoutItem
  onRemove?: (id: string) => void
  onFlip?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
      data: { type: 'item', itemId: item.id, isOverlay: true },
    })
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      className="overlay-wrap"
      style={style}
      {...attributes}
      {...listeners}
    >
      <CardView item={item} onRemove={onRemove} onFlip={onFlip} />
    </div>
  )
}

function DroppableRow({
  rowId,
  children,
  itemIds,
  isEmpty,
  emptyMessage,
}: {
  rowId: string
  children: React.ReactNode
  itemIds: string[]
  isEmpty: boolean
  emptyMessage: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: rowId,
    data: { type: 'row', rowId },
  })
  return (
    <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`canvas-row${isOver ? ' is-over' : ''}${isEmpty ? ' is-empty' : ''}`}
        data-row-id={rowId}
      >
        {isEmpty && (
          <span className="canvas-row-placeholder">{emptyMessage}</span>
        )}
        {children}
      </div>
    </SortableContext>
  )
}

function NewRowZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'new-row',
    data: { type: 'new-row' },
  })
  return (
    <div
      ref={setNodeRef}
      className={`canvas-new-row${isOver ? ' is-over' : ''}`}
      aria-hidden="true"
    >
      ＋ ここにドロップで新しい行
    </div>
  )
}

type Props = {
  layout: Layout
  onRemoveItem?: (itemId: string) => void
  onFlipItem?: (itemId: string) => void
  ref?: Ref<HTMLDivElement>
}

const CANVAS_PADDING_X = 16
const ROW_PADDING_X = 4
const CARD_GAP = 12
const CARD_MAX = 200

export function Canvas({ layout, onRemoveItem, onFlipItem, ref }: Props) {
  const { active } = useDndContext()
  const isDragging = active != null
  const rowGroups = layout.rows.map((row) => groupRowItems(row.items))
  const totalItems = layout.rows.reduce((sum, row) => sum + row.items.length, 0)
  const isEmpty = totalItems === 0
  const maxRowCount = Math.max(1, ...rowGroups.map((g) => g.length))

  const internalRef = useRef<HTMLDivElement | null>(null)
  const lastWidthRef = useRef<number>(-1)

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    },
    [ref],
  )

  useLayoutEffect(() => {
    if (isDragging) return
    const el = internalRef.current
    if (!el) return

    const compute = () => {
      const canvasContentW = el.clientWidth - CANVAS_PADDING_X * 2
      const rowContentW = canvasContentW - ROW_PADDING_X * 2
      const next = Math.max(
        24,
        Math.min(
          CARD_MAX,
          Math.floor(
            (rowContentW - (maxRowCount - 1) * CARD_GAP) / maxRowCount,
          ),
        ),
      )
      if (lastWidthRef.current === next) return
      lastWidthRef.current = next
      el.style.setProperty('--card-width', `${next}px`)
    }

    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [maxRowCount, isDragging])

  return (
    <div
      ref={setRefs}
      className={`canvas${isEmpty ? ' canvas-empty' : ''}`}
      data-testid="canvas"
    >
      {layout.rows.map((row, idx) => {
        const groups = rowGroups[idx]
        const baseIds = groups.map((g) => g.base.id)
        const rowEmpty = groups.length === 0
        const emptyMsg =
          isEmpty && idx === 0
            ? '検索ボックスから追加、または履歴をここにドラッグしてください'
            : '（空の行）'
        return (
          <DroppableRow
            key={row.id}
            rowId={row.id}
            itemIds={baseIds}
            isEmpty={rowEmpty}
            emptyMessage={emptyMsg}
          >
            {groups.map((group) => (
              <SortableBase
                key={group.base.id}
                group={group}
                onRemoveItem={onRemoveItem}
                onFlipItem={onFlipItem}
              />
            ))}
          </DroppableRow>
        )
      })}
      <NewRowZone />
    </div>
  )
}
