import type { Layout, LayoutItem } from '../types/card'

function activeDisplayName(item: LayoutItem): string {
  if (
    item.faceIndex !== undefined &&
    item.card.faces &&
    item.card.faces[item.faceIndex]
  ) {
    return item.card.faces[item.faceIndex].displayName
  }
  return item.card.displayName
}

export function formatCardNames(layout: Layout): string {
  return layout.rows
    .map((row) =>
      row.items.map((item) => `《${activeDisplayName(item)}》`).join(' '),
    )
    .join('\n')
}
