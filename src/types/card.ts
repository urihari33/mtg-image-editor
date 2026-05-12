export type ScryfallImageUris = {
  small: string
  normal: string
  large: string
  png: string
  art_crop: string
  border_crop: string
}

export type ScryfallCardFace = {
  object: 'card_face'
  name: string
  printed_name?: string
  image_uris?: ScryfallImageUris
}

export type ScryfallCard = {
  object: 'card'
  id: string
  oracle_id: string
  name: string
  printed_name?: string
  lang: string
  set: string
  set_name: string
  released_at: string
  image_uris?: ScryfallImageUris
  card_faces?: ScryfallCardFace[]
}

export type ScryfallCatalog = {
  object: 'catalog'
  total_values: number
  data: string[]
}

export type ScryfallList<T> = {
  object: 'list'
  total_cards?: number
  has_more: boolean
  next_page?: string
  data: T[]
}

export type CardSuggestion = {
  englishName: string
  japaneseName?: string
  oracleId?: string
}

export type CardFace = {
  englishName: string
  japaneseName?: string
  displayName: string
  hasJapanese: boolean
  imageUrl: string
}

export type CardEntry = {
  oracleId: string
  scryfallId: string
  englishName: string
  japaneseName?: string
  displayName: string
  hasJapanese: boolean
  imageUrl: string
  setCode: string
  releasedAt: string
  faces?: CardFace[]
}

export type LayoutItem = {
  id: string
  card: CardEntry
  overlayOf?: string
  faceIndex?: number
}

export type LayoutRow = {
  id: string
  items: LayoutItem[]
}

export type Layout = {
  rows: LayoutRow[]
}
