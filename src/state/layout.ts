import type { CardEntry, Layout, LayoutItem, LayoutRow } from '../types/card'

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

export function createInitialLayout(): Layout {
  return {
    rows: [{ id: makeId('row'), items: [] }],
  }
}

export function addCardToLayout(layout: Layout, card: CardEntry): Layout {
  const lastIndex = layout.rows.length - 1
  const lastRow = layout.rows[lastIndex]
  const newItem: LayoutItem = { id: makeId('item'), card }
  const newRow: LayoutRow = { ...lastRow, items: [...lastRow.items, newItem] }
  return {
    rows: layout.rows.map((row, idx) => (idx === lastIndex ? newRow : row)),
  }
}

export function removeItemFromLayout(layout: Layout, itemId: string): Layout {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      items: row.items.filter(
        (it) => it.id !== itemId && it.overlayOf !== itemId,
      ),
    })),
  }
}

export type LocatedItem = {
  row: LayoutRow
  index: number
  item: LayoutItem
}

export function findItem(layout: Layout, itemId: string): LocatedItem | null {
  for (const row of layout.rows) {
    const index = row.items.findIndex((it) => it.id === itemId)
    if (index >= 0) {
      return { row, index, item: row.items[index] }
    }
  }
  return null
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr]
  const [removed] = copy.splice(from, 1)
  copy.splice(to, 0, removed)
  return copy
}

export function moveItem(
  layout: Layout,
  itemId: string,
  targetRowId: string,
  targetIndex: number,
): Layout {
  const found = findItem(layout, itemId)
  if (!found) return layout
  if (!layout.rows.some((r) => r.id === targetRowId)) return layout

  if (found.row.id === targetRowId) {
    const clamped = Math.max(0, Math.min(targetIndex, found.row.items.length - 1))
    if (clamped === found.index) return layout
    const items = arrayMove(found.row.items, found.index, clamped)
    return {
      rows: layout.rows.map((r) => (r.id === targetRowId ? { ...r, items } : r)),
    }
  }

  return {
    rows: layout.rows.map((row) => {
      if (row.id === found.row.id) {
        return {
          ...row,
          items: row.items.filter((_, i) => i !== found.index),
        }
      }
      if (row.id === targetRowId) {
        const items = [...row.items]
        const clamped = Math.max(0, Math.min(targetIndex, items.length))
        items.splice(clamped, 0, found.item)
        return { ...row, items }
      }
      return row
    }),
  }
}

export function addNewEmptyRow(layout: Layout): Layout {
  return { rows: [...layout.rows, { id: makeId('row'), items: [] }] }
}

export function addCardToRow(
  layout: Layout,
  card: CardEntry,
  rowId: string,
  index?: number,
): Layout {
  if (!layout.rows.some((r) => r.id === rowId)) return layout
  const newItem: LayoutItem = { id: makeId('item'), card }
  return {
    rows: layout.rows.map((row) => {
      if (row.id !== rowId) return row
      const insertAt =
        index === undefined
          ? row.items.length
          : Math.max(0, Math.min(index, row.items.length))
      return {
        ...row,
        items: [
          ...row.items.slice(0, insertAt),
          newItem,
          ...row.items.slice(insertAt),
        ],
      }
    }),
  }
}

export function setOverlay(
  layout: Layout,
  itemId: string,
  baseItemId: string,
): Layout {
  if (itemId === baseItemId) return layout
  const itemLocation = findItem(layout, itemId)
  const baseLocation = findItem(layout, baseItemId)
  if (!itemLocation || !baseLocation) return layout

  const updatedItem: LayoutItem = { ...itemLocation.item, overlayOf: baseItemId }

  if (itemLocation.row.id === baseLocation.row.id) {
    return {
      rows: layout.rows.map((row) =>
        row.id === itemLocation.row.id
          ? {
              ...row,
              items: row.items.map((it) =>
                it.id === itemId ? updatedItem : it,
              ),
            }
          : row,
      ),
    }
  }

  return {
    rows: layout.rows.map((row) => {
      if (row.id === itemLocation.row.id) {
        return { ...row, items: row.items.filter((it) => it.id !== itemId) }
      }
      if (row.id === baseLocation.row.id) {
        const baseIdx = row.items.findIndex((it) => it.id === baseItemId)
        const items = [
          ...row.items.slice(0, baseIdx + 1),
          updatedItem,
          ...row.items.slice(baseIdx + 1),
        ]
        return { ...row, items }
      }
      return row
    }),
  }
}

export function pruneEmptyRows(layout: Layout): Layout {
  if (layout.rows.length <= 1) return layout
  const kept = layout.rows.filter((row, idx) => idx === 0 || row.items.length > 0)
  if (kept.length === layout.rows.length) return layout
  return { rows: kept }
}

export function clearOverlay(layout: Layout, itemId: string): Layout {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      items: row.items.map((it) => {
        if (it.id !== itemId || it.overlayOf === undefined) return it
        return { id: it.id, card: it.card }
      }),
    })),
  }
}
