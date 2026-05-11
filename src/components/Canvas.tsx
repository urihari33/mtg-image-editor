import type { Ref } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Layout, LayoutItem } from '../types/card'
import { CardView } from './CardView'

type ItemGroup = {
  base: LayoutItem
  overlays: LayoutItem[]
}

function groupRowItems(items: LayoutItem[]): ItemGroup[] {
  const groups: ItemGroup[] = []
  const byId = new Map<string, ItemGroup>()
  for (const it of items) {
    if (!it.overlayOf) {
      const group: ItemGroup = { base: it, overlays: [] }
      groups.push(group)
      byId.set(it.id, group)
    }
  }
  for (const it of items) {
    if (it.overlayOf) {
      const group = byId.get(it.overlayOf)
      if (group) group.overlays.push(it)
    }
  }
  return groups
}

function SortableBase({
  group,
  onRemoveItem,
}: {
  group: ItemGroup
  onRemoveItem?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.base.id, data: { type: 'item', itemId: group.base.id } })
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
      <CardView item={group.base} onRemove={onRemoveItem} />
      {group.overlays.map((ov) => (
        <DraggableOverlay key={ov.id} item={ov} onRemove={onRemoveItem} />
      ))}
    </div>
  )
}

function DraggableOverlay({
  item,
  onRemove,
}: {
  item: LayoutItem
  onRemove?: (id: string) => void
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
      <CardView item={item} onRemove={onRemove} />
    </div>
  )
}

function DroppableRow({
  rowId,
  children,
  itemIds,
}: {
  rowId: string
  children: React.ReactNode
  itemIds: string[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: rowId,
    data: { type: 'row', rowId },
  })
  return (
    <SortableContext items={itemIds} strategy={horizontalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`canvas-row${isOver ? ' is-over' : ''}`}
        data-row-id={rowId}
      >
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
  ref?: Ref<HTMLDivElement>
}

export function Canvas({ layout, onRemoveItem, ref }: Props) {
  const totalItems = layout.rows.reduce((sum, row) => sum + row.items.length, 0)

  if (totalItems === 0) {
    return (
      <div ref={ref} className="canvas canvas-empty" data-testid="canvas-empty">
        <p>検索ボックスからカードを追加してください</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="canvas" data-testid="canvas">
      {layout.rows.map((row) => {
        const groups = groupRowItems(row.items)
        const baseIds = groups.map((g) => g.base.id)
        return (
          <DroppableRow key={row.id} rowId={row.id} itemIds={baseIds}>
            {groups.length === 0 && (
              <span className="canvas-row-placeholder">（空の行）</span>
            )}
            {groups.map((group) => (
              <SortableBase
                key={group.base.id}
                group={group}
                onRemoveItem={onRemoveItem}
              />
            ))}
          </DroppableRow>
        )
      })}
      <NewRowZone />
    </div>
  )
}
