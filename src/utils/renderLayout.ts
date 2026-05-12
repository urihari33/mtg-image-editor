import type { Layout, LayoutItem } from '../types/card'
import { groupRowItems } from '../state/layout'

export type RenderOptions = {
  pixelRatio?: number
  cardWidth?: number
  cardHeightRatio?: number
  rowGap?: number
  cardGap?: number
  overlayScale?: number
  overlayOffset?: number
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  // Append a cache buster so the browser doesn't reuse a response that the
  // display `<img>` cached without an Origin header. Scryfall's CDN returns
  // `Vary: Origin`, and the `?_cors=1` makes the cache key distinct from the
  // display `<img>` request — so the browser HTTP cache can safely reuse this
  // CORS-tagged response on subsequent exports.
  const sep = url.includes('?') ? '&' : '?'
  const corsUrl = `${url}${sep}_cors=1`
  const response = await fetch(corsUrl, {
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  })
  if (!response.ok) {
    throw new Error(
      `画像の取得に失敗しました (HTTP ${response.status}): ${url}`,
    )
  }
  const blob = await response.blob()
  return createImageBitmap(blob)
}

function activeImageUrl(item: LayoutItem): string {
  if (
    item.faceIndex !== undefined &&
    item.card.faces &&
    item.card.faces[item.faceIndex]
  ) {
    return item.card.faces[item.faceIndex].imageUrl
  }
  return item.card.imageUrl
}

export async function renderLayoutToCanvas(
  layout: Layout,
  options: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  const {
    pixelRatio = 2,
    cardWidth = 200,
    cardHeightRatio = 680 / 488,
    rowGap = 16,
    cardGap = 12,
    overlayScale = 0.6,
    overlayOffset = 8,
  } = options

  const cardHeight = Math.round(cardWidth * cardHeightRatio)

  const renderRows = layout.rows
    .map((row) => groupRowItems(row.items))
    .filter((groups) => groups.length > 0)

  if (renderRows.length === 0) {
    throw new Error('カードが配置されていません')
  }

  let maxRowWidth = 0
  for (const groups of renderRows) {
    const w = groups.length * cardWidth + (groups.length - 1) * cardGap
    if (w > maxRowWidth) maxRowWidth = w
  }

  const overlayW = cardWidth * overlayScale
  const overlayH = cardHeight * overlayScale

  const canvasWidth = maxRowWidth + overlayOffset
  const canvasHeight =
    renderRows.length * cardHeight +
    (renderRows.length - 1) * rowGap +
    overlayOffset

  const urls = new Set<string>()
  for (const groups of renderRows) {
    for (const g of groups) {
      urls.add(activeImageUrl(g.base))
      for (const o of g.overlays) urls.add(activeImageUrl(o))
    }
  }
  const imageMap = new Map<string, ImageBitmap>()
  await Promise.all(
    [...urls].map(async (url) => {
      imageMap.set(url, await loadBitmap(url))
    }),
  )

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(canvasWidth * pixelRatio)
  canvas.height = Math.round(canvasHeight * pixelRatio)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D コンテキストを取得できません')
  ctx.scale(pixelRatio, pixelRatio)

  let y = 0
  for (const groups of renderRows) {
    let x = 0
    for (const group of groups) {
      const baseImg = imageMap.get(activeImageUrl(group.base))
      if (baseImg) {
        ctx.drawImage(baseImg, x, y, cardWidth, cardHeight)
      }
      for (const ov of group.overlays) {
        const img = imageMap.get(activeImageUrl(ov))
        if (img) {
          const ox = x + cardWidth - overlayW + overlayOffset
          const oy = y + cardHeight - overlayH + overlayOffset
          ctx.drawImage(img, ox, oy, overlayW, overlayH)
        }
      }
      x += cardWidth + cardGap
    }
    y += cardHeight + rowGap
  }

  for (const bitmap of imageMap.values()) {
    bitmap.close?.()
  }

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG Blob の生成に失敗しました'))
    }, 'image/png')
  })
}
