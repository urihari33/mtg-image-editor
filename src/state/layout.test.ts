import { describe, expect, it } from 'vitest'
import type { CardEntry, Layout, LayoutItem } from '../types/card'
import {
  addCardAsOverlay,
  addCardToLayout,
  addCardToRow,
  addNewEmptyRow,
  clearOverlay,
  createInitialLayout,
  finalizePlaceholder,
  findItem,
  flipItem,
  moveItem,
  pruneEmptyRows,
  removeItemFromLayout,
  setOverlay,
  setSidebarPlaceholder,
} from './layout'

function makeCard(name: string, oracleId = name.toLowerCase().replace(/\s+/g, '-')): CardEntry {
  return {
    oracleId,
    scryfallId: `s-${oracleId}`,
    englishName: name,
    displayName: name,
    hasJapanese: false,
    imageUrl: `https://example.com/${oracleId}.jpg`,
    setCode: 'tst',
    releasedAt: '2024-01-01',
  }
}

function buildLayout(rows: { id: string; items: LayoutItem[] }[]): Layout {
  return { rows }
}

function item(id: string, name = id, overlayOf?: string): LayoutItem {
  return { id, card: makeCard(name, id), overlayOf }
}

describe('createInitialLayout', () => {
  it('returns one empty row', () => {
    const layout = createInitialLayout()
    expect(layout.rows).toHaveLength(1)
    expect(layout.rows[0].items).toEqual([])
    expect(typeof layout.rows[0].id).toBe('string')
    expect(layout.rows[0].id.length).toBeGreaterThan(0)
  })
})

describe('addCardToLayout', () => {
  it('appends to the only existing row by default', () => {
    const initial = createInitialLayout()
    const next = addCardToLayout(initial, makeCard('Lightning Bolt'))
    expect(next.rows).toHaveLength(1)
    expect(next.rows[0].items).toHaveLength(1)
    expect(next.rows[0].items[0].card.englishName).toBe('Lightning Bolt')
    expect(next.rows[0].items[0].id).not.toBe('')
  })

  it('does not mutate input', () => {
    const initial = createInitialLayout()
    addCardToLayout(initial, makeCard('Lightning Bolt'))
    expect(initial.rows[0].items).toEqual([])
  })

  it('appends to the last row when there are multiple rows', () => {
    const initial = createInitialLayout()
    const withFirst = addCardToLayout(initial, makeCard('Lightning Bolt'))
    const customLayout = {
      rows: [
        withFirst.rows[0],
        { id: 'row-2', items: [] },
      ],
    }
    const next = addCardToLayout(customLayout, makeCard('Counterspell'))
    expect(next.rows[0].items).toHaveLength(1)
    expect(next.rows[1].items).toHaveLength(1)
    expect(next.rows[1].items[0].card.englishName).toBe('Counterspell')
  })

  it('assigns unique ids to each added item', () => {
    const initial = createInitialLayout()
    const a = addCardToLayout(initial, makeCard('Lightning Bolt'))
    const b = addCardToLayout(a, makeCard('Counterspell'))
    const ids = b.rows[0].items.map((it) => it.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('removeItemFromLayout', () => {
  it('removes the item with the given id', () => {
    let layout = createInitialLayout()
    layout = addCardToLayout(layout, makeCard('Lightning Bolt'))
    layout = addCardToLayout(layout, makeCard('Counterspell'))
    const targetId = layout.rows[0].items[0].id
    const next = removeItemFromLayout(layout, targetId)
    expect(next.rows[0].items).toHaveLength(1)
    expect(next.rows[0].items[0].card.englishName).toBe('Counterspell')
  })

  it('also removes items overlaid on the removed item', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b', 'b', 'a')] },
    ])
    const next = removeItemFromLayout(layout, 'a')
    expect(next.rows[0].items).toHaveLength(0)
  })

  it('is a no-op when id is not found', () => {
    const layout = addCardToLayout(createInitialLayout(), makeCard('Lightning Bolt'))
    const next = removeItemFromLayout(layout, 'nonexistent')
    expect(next.rows[0].items).toHaveLength(1)
  })
})

describe('findItem', () => {
  it('locates an item by id', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b')] },
      { id: 'r2', items: [item('c')] },
    ])
    const found = findItem(layout, 'c')
    expect(found?.row.id).toBe('r2')
    expect(found?.index).toBe(0)
    expect(found?.item.id).toBe('c')
  })

  it('returns null when not found', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(findItem(layout, 'z')).toBeNull()
  })
})

describe('moveItem within a row', () => {
  it('reorders items within the same row', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b'), item('c')] },
    ])
    const next = moveItem(layout, 'a', 'r1', 2)
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('handles moving to the same index as a no-op', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b'), item('c')] },
    ])
    const next = moveItem(layout, 'b', 'r1', 1)
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('moveItem across rows', () => {
  it('moves an item from one row to another', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b')] },
      { id: 'r2', items: [item('c')] },
    ])
    const next = moveItem(layout, 'a', 'r2', 1)
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['b'])
    expect(next.rows[1].items.map((i) => i.id)).toEqual(['c', 'a'])
  })

  it('inserts at the start when targetIndex is 0', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a')] },
      { id: 'r2', items: [item('b'), item('c')] },
    ])
    const next = moveItem(layout, 'a', 'r2', 0)
    expect(next.rows[1].items.map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('is a no-op when item id is unknown', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(moveItem(layout, 'z', 'r1', 0)).toBe(layout)
  })

  it('is a no-op when target row id is unknown', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(moveItem(layout, 'a', 'unknown', 0)).toBe(layout)
  })
})

describe('addCardToRow', () => {
  it('appends a new card to the specified row when index is omitted', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a')] },
      { id: 'r2', items: [item('b')] },
    ])
    const next = addCardToRow(layout, makeCard('Lightning Bolt'), 'r2')
    expect(next.rows[1].items).toHaveLength(2)
    expect(next.rows[1].items[1].card.englishName).toBe('Lightning Bolt')
  })

  it('inserts at the given index', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b')] },
    ])
    const next = addCardToRow(layout, makeCard('Inserted'), 'r1', 1)
    expect(next.rows[0].items.map((i) => i.card.englishName)).toEqual([
      'a',
      'Inserted',
      'b',
    ])
  })

  it('clamps the index to the valid range', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    const next = addCardToRow(layout, makeCard('Z'), 'r1', 99)
    expect(next.rows[0].items.map((i) => i.card.englishName)).toEqual(['a', 'Z'])
  })

  it('is a no-op when the target row id is unknown', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(addCardToRow(layout, makeCard('Z'), 'unknown')).toBe(layout)
  })
})

describe('setSidebarPlaceholder', () => {
  it('inserts a placeholder with the given id at the target row/index', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b')] },
    ])
    const next = setSidebarPlaceholder(layout, 'history-x', makeCard('Z'), 'r1', 1)
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['a', 'history-x', 'b'])
    expect(next.rows[0].items[1].card.englishName).toBe('Z')
  })

  it('moves an existing placeholder rather than duplicating', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), { id: 'ph', card: makeCard('X') }, item('b')] },
    ])
    const next = setSidebarPlaceholder(layout, 'ph', makeCard('X'), 'r1', 2)
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['a', 'b', 'ph'])
    expect(next.rows[0].items.filter((i) => i.id === 'ph')).toHaveLength(1)
  })

  it('moves placeholder across rows', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), { id: 'ph', card: makeCard('X') }] },
      { id: 'r2', items: [item('b')] },
    ])
    const next = setSidebarPlaceholder(layout, 'ph', makeCard('X'), 'r2', 0)
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['a'])
    expect(next.rows[1].items.map((i) => i.id)).toEqual(['ph', 'b'])
  })

  it('is a no-op for unknown row', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(setSidebarPlaceholder(layout, 'ph', makeCard('X'), 'unknown', 0)).toBe(
      layout,
    )
  })
})

describe('finalizePlaceholder', () => {
  it('renames the placeholder id while preserving card and position', () => {
    const card = makeCard('Z')
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), { id: 'ph', card }, item('b')] },
    ])
    const next = finalizePlaceholder(layout, 'ph')
    const renamed = next.rows[0].items[1]
    expect(renamed.id).not.toBe('ph')
    expect(renamed.id).toMatch(/^item-/)
    expect(renamed.card).toBe(card)
    expect(next.rows[0].items[0].id).toBe('a')
    expect(next.rows[0].items[2].id).toBe('b')
  })
})

describe('flipItem', () => {
  function makeDfcCard(): CardEntry {
    return {
      oracleId: 'dfc',
      scryfallId: 'dfc-s',
      englishName: 'A // B',
      displayName: 'A',
      hasJapanese: false,
      imageUrl: 'https://example.com/a.jpg',
      setCode: 'tst',
      releasedAt: '2024-01-01',
      faces: [
        { englishName: 'A', displayName: 'A', hasJapanese: false, imageUrl: 'https://example.com/a.jpg' },
        { englishName: 'B', displayName: 'B', hasJapanese: false, imageUrl: 'https://example.com/b.jpg' },
      ],
    }
  }

  it('toggles faceIndex 0 → 1 → 0', () => {
    const layout: Layout = {
      rows: [{ id: 'r1', items: [{ id: 'i1', card: makeDfcCard() }] }],
    }
    const after1 = flipItem(layout, 'i1')
    expect(after1.rows[0].items[0].faceIndex).toBe(1)
    const after2 = flipItem(after1, 'i1')
    expect(after2.rows[0].items[0].faceIndex).toBe(0)
  })

  it('is a no-op for single-faced cards', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    const next = flipItem(layout, 'a')
    expect(next.rows[0].items[0].faceIndex).toBeUndefined()
  })

  it('is a no-op when item id not found', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(flipItem(layout, 'unknown')).toEqual(layout)
  })
})

describe('addCardAsOverlay', () => {
  it('inserts the new card immediately after the base with overlayOf set', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b')] },
    ])
    const next = addCardAsOverlay(layout, makeCard('Overlay'), 'a')
    expect(next.rows[0].items.map((i) => i.card.englishName)).toEqual([
      'a',
      'Overlay',
      'b',
    ])
    expect(next.rows[0].items[1].overlayOf).toBe('a')
  })

  it('is a no-op when the base id is unknown', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(addCardAsOverlay(layout, makeCard('Z'), 'unknown')).toBe(layout)
  })
})

describe('addNewEmptyRow', () => {
  it('appends a new empty row at the end', () => {
    const initial = createInitialLayout()
    const next = addNewEmptyRow(initial)
    expect(next.rows).toHaveLength(2)
    expect(next.rows[1].items).toEqual([])
    expect(next.rows[1].id).not.toBe(next.rows[0].id)
  })
})

describe('setOverlay', () => {
  it('marks an item as overlay of another', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('base'), item('over')] },
    ])
    const next = setOverlay(layout, 'over', 'base')
    expect(next.rows[0].items[1].overlayOf).toBe('base')
  })

  it('is a no-op when overlay and base are the same item', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(setOverlay(layout, 'a', 'a')).toBe(layout)
  })

  it('is a no-op when either id is missing', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    expect(setOverlay(layout, 'a', 'missing')).toBe(layout)
    expect(setOverlay(layout, 'missing', 'a')).toBe(layout)
  })

  it('replaces an existing overlay relationship', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('b'), item('over', 'over', 'a')] },
    ])
    const next = setOverlay(layout, 'over', 'b')
    expect(next.rows[0].items[2].overlayOf).toBe('b')
  })
})

describe('setOverlay across rows', () => {
  it('moves the overlay item into the base row, immediately after the base', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('base')] },
      { id: 'r2', items: [item('a'), item('over'), item('b')] },
    ])
    const next = setOverlay(layout, 'over', 'base')
    expect(next.rows[0].items.map((i) => i.id)).toEqual(['base', 'over'])
    expect(next.rows[0].items[1].overlayOf).toBe('base')
    expect(next.rows[1].items.map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('pruneEmptyRows', () => {
  it('returns the layout unchanged when there is a single row', () => {
    const layout = buildLayout([{ id: 'r1', items: [] }])
    expect(pruneEmptyRows(layout)).toBe(layout)
  })

  it('removes intermediate empty rows but keeps the first row', () => {
    const layout = buildLayout([
      { id: 'r1', items: [] },
      { id: 'r2', items: [item('a')] },
      { id: 'r3', items: [] },
      { id: 'r4', items: [item('b')] },
    ])
    const next = pruneEmptyRows(layout)
    expect(next.rows.map((r) => r.id)).toEqual(['r1', 'r2', 'r4'])
  })

  it('keeps the only empty row when all rows are empty', () => {
    const layout = buildLayout([
      { id: 'r1', items: [] },
      { id: 'r2', items: [] },
    ])
    const next = pruneEmptyRows(layout)
    expect(next.rows.map((r) => r.id)).toEqual(['r1'])
  })

  it('is a no-op when there are no empty rows', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a')] },
      { id: 'r2', items: [item('b')] },
    ])
    expect(pruneEmptyRows(layout)).toBe(layout)
  })
})

describe('clearOverlay', () => {
  it('removes the overlayOf field', () => {
    const layout = buildLayout([
      { id: 'r1', items: [item('a'), item('over', 'over', 'a')] },
    ])
    const next = clearOverlay(layout, 'over')
    expect(next.rows[0].items[1].overlayOf).toBeUndefined()
  })

  it('leaves items without overlay untouched', () => {
    const layout = buildLayout([{ id: 'r1', items: [item('a')] }])
    const next = clearOverlay(layout, 'a')
    expect(next.rows[0].items[0]).toEqual({ id: 'a', card: layout.rows[0].items[0].card })
  })
})
