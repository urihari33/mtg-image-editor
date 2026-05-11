import type {
  CardEntry,
  CardSuggestion,
  ScryfallCard,
  ScryfallCatalog,
  ScryfallList,
} from '../types/card'

export const SCRYFALL_BASE = 'https://api.scryfall.com'

const DEFAULT_MIN_INTERVAL_MS = 75
const AUTOCOMPLETE_LIMIT = 20

let minIntervalMs = DEFAULT_MIN_INTERVAL_MS
let lastRequestAt = 0

export function __setRateLimitMsForTests(ms: number): void {
  minIntervalMs = ms
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt
  const remaining = minIntervalMs - elapsed
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
  lastRequestAt = Date.now()
}

async function rawFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: 'application/json',
      // User-Agent is filtered by browsers; Scryfall accepts requests without it.
      // Kept here so non-browser runtimes (tests / future tools) identify themselves.
      'User-Agent': 'mtgImageEditor/0.1',
    },
  })
}

async function scryfallFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T | null> {
  const url = new URL(`${SCRYFALL_BASE}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }

  const exec = async () => {
    await waitForRateLimit()
    return rawFetch(url.toString())
  }

  let response: Response
  try {
    response = await exec()
  } catch {
    response = await exec()
  }

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(
      `Scryfall request failed: ${response.status} ${response.statusText}`,
    )
  }
  return (await response.json()) as T
}

const ASCII_RE = /^[\x20-\x7e]+$/

export async function searchAutocomplete(query: string): Promise<CardSuggestion[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (ASCII_RE.test(trimmed)) {
    const result = await scryfallFetch<ScryfallCatalog>('/cards/autocomplete', {
      q: trimmed,
      include_extras: 'false',
    })
    if (!result) return []
    return result.data
      .slice(0, AUTOCOMPLETE_LIMIT)
      .map((name) => ({ englishName: name }))
  }

  const result = await scryfallFetch<ScryfallList<ScryfallCard>>('/cards/search', {
    q: `name:${trimmed} lang:ja`,
    unique: 'cards',
    order: 'name',
  })
  if (!result) return []
  return result.data.slice(0, AUTOCOMPLETE_LIMIT).map((card) => ({
    englishName: card.name,
    japaneseName: card.printed_name,
    oracleId: card.oracle_id,
  }))
}

function pickImageUrl(card: ScryfallCard): string | undefined {
  if (card.image_uris?.normal) return card.image_uris.normal
  const front = card.card_faces?.[0]
  return front?.image_uris?.normal
}

function toCardEntry(
  card: ScryfallCard,
  japaneseName: string | undefined,
): CardEntry | null {
  const imageUrl = pickImageUrl(card)
  if (!imageUrl) return null
  const hasJapanese = card.lang === 'ja' || !!japaneseName
  return {
    oracleId: card.oracle_id,
    scryfallId: card.id,
    englishName: card.name,
    japaneseName,
    displayName: japaneseName ?? card.name,
    hasJapanese,
    imageUrl,
    setCode: card.set,
    releasedAt: card.released_at,
  }
}

export async function fetchCardWithLanguagePreference(
  name: string,
): Promise<CardEntry | null> {
  const trimmed = name.trim()
  if (!trimmed) return null

  const english = await scryfallFetch<ScryfallCard>('/cards/named', {
    fuzzy: trimmed,
  })
  if (!english) return null

  const japaneseList = await scryfallFetch<ScryfallList<ScryfallCard>>(
    '/cards/search',
    {
      q: `oracleid:${english.oracle_id} lang:ja`,
      unique: 'prints',
      order: 'released',
      dir: 'asc',
    },
  )

  if (japaneseList && japaneseList.data.length > 0) {
    const withPrintedName = japaneseList.data.find(
      (c) => printedNameOf(c) !== undefined,
    )
    const japanese = withPrintedName ?? japaneseList.data[0]
    return toCardEntry(japanese, printedNameOf(japanese))
  }
  return toCardEntry(english, undefined)
}

function printedNameOf(card: ScryfallCard): string | undefined {
  return card.printed_name ?? card.card_faces?.[0]?.printed_name
}
