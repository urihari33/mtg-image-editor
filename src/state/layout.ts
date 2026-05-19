import type { CardEntry, Layout, LayoutItem, LayoutRow } from '../types/card'

export function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
}

export type ItemGroup = {
  base: LayoutItem
  overlays: LayoutItem[]
}

export function groupRowItems(items: LayoutItem[]): ItemGroup[] {
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

export function flipItem(layout: Layout, itemId: string): Layout {
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      items: row.items.map((it) => {
        if (it.id !== itemId) return it
        const faces = it.card.faces
        if (!faces || faces.length < 2) return it
        const current = it.faceIndex ?? 0
        const next = (current + 1) % faces.length
        return { ...it, faceIndex: next }
      }),
    })),
  }
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

export function setSidebarPlaceholder(
  layout: Layout,
  placeholderId: string,
  card: CardEntry,
  targetRowId: string,
  targetIndex: number,
): Layout {
  const existing = findItem(layout, placeholderId)
  const cleaned = existing ? removeItemFromLayout(layout, placeholderId) : layout
  if (!cleaned.rows.some((r) => r.id === targetRowId)) return layout
  const newItem: LayoutItem = { id: placeholderId, card }
  return {
    rows: cleaned.rows.map((row) => {
      if (row.id !== targetRowId) return row
      const clamped = Math.max(0, Math.min(targetIndex, row.items.length))
      return {
        ...row,
        items: [
          ...row.items.slice(0, clamped),
          newItem,
          ...row.items.slice(clamped),
        ],
      }
    }),
  }
}

export function finalizePlaceholder(
  layout: Layout,
  placeholderId: string,
): Layout {
  const newId = makeId('item')
  return {
    rows: layout.rows.map((row) => ({
      ...row,
      items: row.items.map((it) =>
        it.id === placeholderId ? { ...it, id: newId } : it,
      ),
    })),
  }
}

export function addCardAsOverlay(
  layout: Layout,
  card: CardEntry,
  baseItemId: string,
): Layout {
  const baseLocation = findItem(layout, baseItemId)
  if (!baseLocation) return layout
  return {
    rows: layout.rows.map((row) => {
      if (row.id !== baseLocation.row.id) return row
      const baseIdx = row.items.findIndex((it) => it.id === baseItemId)
      const newItem: LayoutItem = {
        id: makeId('item'),
        card,
        overlayOf: baseItemId,
      }
      return {
        ...row,
        items: [
          ...row.items.slice(0, baseIdx + 1),
          newItem,
          ...row.items.slice(baseIdx + 1),
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
  // Reject overlay-of-overlay: base must not itself be an overlay.
  // Otherwise groupRowItems would lose the second-level overlay from rendering
  // while the data remains in state — desync.
  if (baseLocation.item.overlayOf !== undefined) return layout

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
        // Preserve faceIndex (DFC flip state) — only strip overlayOf.
        const rest: LayoutItem = { ...it }
        delete rest.overlayOf
        return rest
      }),
    })),
  }
}

// === 十字移動（モバイル UI 用） ===
// base カードのみ対象。overlay カード（overlayOf あり）は no-op。
// base カードの id を渡すと、その group（base + overlays）ごと移動する想定だが、
// groupRowItems が overlay を base の直後に紐付けて表示しているため、
// items 配列上の base 要素だけ動かせば十分（overlay 要素は同じ row 内に残り、
// groupRowItems が再構築時に拾い直す）。
//
// ただし行をまたぐ移動の場合、overlay 要素は元の row に取り残されると base から
// 切り離されてしまう（groupRowItems が base を見つけられない）。
// そのため上下移動では base に紐づく overlay も同行へ連れて行く。

function rowOf(layout: Layout, itemId: string): { rowIdx: number; itemIdx: number } | null {
  for (let r = 0; r < layout.rows.length; r += 1) {
    const i = layout.rows[r].items.findIndex((it) => it.id === itemId)
    if (i >= 0) return { rowIdx: r, itemIdx: i }
  }
  return null
}

function isBaseAt(items: LayoutItem[], itemIdx: number): boolean {
  return items[itemIdx]?.overlayOf === undefined
}

function basePositionsInRow(items: LayoutItem[]): number[] {
  const positions: number[] = []
  items.forEach((it, idx) => {
    if (it.overlayOf === undefined) positions.push(idx)
  })
  return positions
}

export function moveBaseLeft(layout: Layout, itemId: string): Layout {
  const loc = rowOf(layout, itemId)
  if (!loc) return layout
  const row = layout.rows[loc.rowIdx]
  if (!isBaseAt(row.items, loc.itemIdx)) return layout
  const bases = basePositionsInRow(row.items)
  const baseOrder = bases.indexOf(loc.itemIdx)
  if (baseOrder <= 0) return layout
  // 左隣 base の位置に挿入（既存 moveItem の targetIndex は base 単位ではなく
  // items 配列の生 index を期待するため、左隣 base の生 index へ）。
  const leftBaseRawIdx = bases[baseOrder - 1]
  return moveItem(layout, itemId, row.id, leftBaseRawIdx)
}

export function moveBaseRight(layout: Layout, itemId: string): Layout {
  const loc = rowOf(layout, itemId)
  if (!loc) return layout
  const row = layout.rows[loc.rowIdx]
  if (!isBaseAt(row.items, loc.itemIdx)) return layout
  const bases = basePositionsInRow(row.items)
  const baseOrder = bases.indexOf(loc.itemIdx)
  if (baseOrder < 0 || baseOrder >= bases.length - 1) return layout
  // 右隣 base の overlays の末尾の次の位置に入れたいが、moveItem は同一行で
  // targetIndex を超過しても clamp してくれる。右隣 base + その overlays 個数分先へ。
  const rightBaseRawIdx = bases[baseOrder + 1]
  const rightBaseOverlayCount = (() => {
    const baseId = row.items[rightBaseRawIdx].id
    let count = 0
    for (let i = rightBaseRawIdx + 1; i < row.items.length; i += 1) {
      if (row.items[i].overlayOf === baseId) count += 1
      else break
    }
    return count
  })()
  const targetIdx = rightBaseRawIdx + rightBaseOverlayCount
  return moveItem(layout, itemId, row.id, targetIdx)
}

function moveItemAndOverlays(
  layout: Layout,
  baseId: string,
  targetRowId: string,
  targetIndex: number,
): Layout {
  const loc = rowOf(layout, baseId)
  if (!loc) return layout
  const fromRow = layout.rows[loc.rowIdx]
  // base + その直後の連続する overlay 群を抽出
  const overlayIds: string[] = []
  for (let i = loc.itemIdx + 1; i < fromRow.items.length; i += 1) {
    if (fromRow.items[i].overlayOf === baseId) overlayIds.push(fromRow.items[i].id)
    else break
  }
  // 同一行への移動なら moveItem 1 回でほぼ済むが、行をまたぐ場合は base を先に移動し、
  // overlay は base 直後に順次差し込む。
  let next = moveItem(layout, baseId, targetRowId, targetIndex)
  // base の新しい位置を取得
  const newLoc = rowOf(next, baseId)
  if (!newLoc) return next
  let insertAt = newLoc.itemIdx + 1
  for (const ovId of overlayIds) {
    next = moveItem(next, ovId, targetRowId, insertAt)
    insertAt += 1
  }
  return next
}

export function moveBaseUp(layout: Layout, itemId: string): Layout {
  const loc = rowOf(layout, itemId)
  if (!loc) return layout
  const row = layout.rows[loc.rowIdx]
  if (!isBaseAt(row.items, loc.itemIdx)) return layout
  if (loc.rowIdx === 0) {
    // 最上段の場合は上に新規行を作って移動
    const newRowId = makeId('row')
    const withNewTop: Layout = {
      rows: [{ id: newRowId, items: [] }, ...layout.rows],
    }
    return pruneEmptyRows(moveItemAndOverlays(withNewTop, itemId, newRowId, 0))
  }
  const targetRow = layout.rows[loc.rowIdx - 1]
  // 上の行の末尾へ
  const targetIndex = targetRow.items.length
  return pruneEmptyRows(moveItemAndOverlays(layout, itemId, targetRow.id, targetIndex))
}

export function moveBaseDown(layout: Layout, itemId: string): Layout {
  const loc = rowOf(layout, itemId)
  if (!loc) return layout
  const row = layout.rows[loc.rowIdx]
  if (!isBaseAt(row.items, loc.itemIdx)) return layout
  if (loc.rowIdx === layout.rows.length - 1) {
    const newRowId = makeId('row')
    const withNewBottom: Layout = {
      rows: [...layout.rows, { id: newRowId, items: [] }],
    }
    return pruneEmptyRows(moveItemAndOverlays(withNewBottom, itemId, newRowId, 0))
  }
  const targetRow = layout.rows[loc.rowIdx + 1]
  return pruneEmptyRows(moveItemAndOverlays(layout, itemId, targetRow.id, 0))
}
