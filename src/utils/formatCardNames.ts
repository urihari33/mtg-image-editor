import type { Layout } from '../types/card'

export function formatCardNames(layout: Layout): string {
  return layout.rows
    .map((row) =>
      row.items.map((item) => `《${item.card.displayName}》`).join(' '),
    )
    .join('\n')
}
