import { describe, expect, it } from 'vitest'
import type { CardEntry, Layout, LayoutItem } from '../types/card'
import { formatCardNames } from './formatCardNames'

function makeCard(displayName: string, hasJapanese = true): CardEntry {
  return {
    oracleId: displayName.toLowerCase(),
    scryfallId: `s-${displayName}`,
    englishName: hasJapanese ? `${displayName}-en` : displayName,
    japaneseName: hasJapanese ? displayName : undefined,
    displayName,
    hasJapanese,
    imageUrl: 'https://example.com/x.jpg',
    setCode: 'tst',
    releasedAt: '2024-01-01',
  }
}

function makeItem(card: CardEntry, id?: string, overlayOf?: string): LayoutItem {
  return { id: id ?? `item-${card.oracleId}`, card, overlayOf }
}

function makeLayout(rows: LayoutItem[][]): Layout {
  return {
    rows: rows.map((items, idx) => ({ id: `row-${idx}`, items })),
  }
}

describe('formatCardNames', () => {
  it('formats one row with three cards as space-separated 《》 names', () => {
    const layout = makeLayout([
      [makeItem(makeCard('稲妻')), makeItem(makeCard('対抗呪文')), makeItem(makeCard('黒蓮華'))],
    ])
    expect(formatCardNames(layout)).toBe('《稲妻》 《対抗呪文》 《黒蓮華》')
  })

  it('uses newline to separate rows', () => {
    const layout = makeLayout([
      [makeItem(makeCard('稲妻')), makeItem(makeCard('対抗呪文'))],
      [makeItem(makeCard('黒蓮華')), makeItem(makeCard('意志の力'))],
    ])
    expect(formatCardNames(layout)).toBe('《稲妻》 《対抗呪文》\n《黒蓮華》 《意志の力》')
  })

  it('falls back to English name when Japanese is unavailable', () => {
    const layout = makeLayout([
      [makeItem(makeCard('稲妻')), makeItem(makeCard('Black Lotus', false))],
    ])
    expect(formatCardNames(layout)).toBe('《稲妻》 《Black Lotus》')
  })

  it('includes overlay cards alongside their bases in order', () => {
    const base = makeCard('稲妻')
    const overlay = makeCard('対抗呪文')
    const layout = makeLayout([
      [makeItem(base, 'base-1'), makeItem(overlay, 'overlay-1', 'base-1')],
    ])
    expect(formatCardNames(layout)).toBe('《稲妻》 《対抗呪文》')
  })

  it('returns an empty string for an empty layout', () => {
    const layout: Layout = { rows: [{ id: 'row-0', items: [] }] }
    expect(formatCardNames(layout)).toBe('')
  })

  it('preserves blank lines for empty intermediate rows', () => {
    const layout = makeLayout([
      [makeItem(makeCard('稲妻'))],
      [],
      [makeItem(makeCard('対抗呪文'))],
    ])
    expect(formatCardNames(layout)).toBe('《稲妻》\n\n《対抗呪文》')
  })
})
