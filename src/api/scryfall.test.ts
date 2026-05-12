import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import {
  SCRYFALL_BASE,
  __setRateLimitMsForTests,
  fetchCardWithLanguagePreference,
  searchAutocomplete,
} from './scryfall'

const emptyImageUris = {
  small: '',
  large: '',
  png: '',
  art_crop: '',
  border_crop: '',
}

describe('searchAutocomplete', () => {
  beforeEach(() => __setRateLimitMsForTests(0))

  it('returns empty array for empty input', async () => {
    expect(await searchAutocomplete('')).toEqual([])
  })

  it('returns empty array for whitespace-only input', async () => {
    expect(await searchAutocomplete('   ')).toEqual([])
  })

  it('uses /cards/autocomplete for ASCII input', async () => {
    let receivedQuery = ''
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/autocomplete`, ({ request }) => {
        receivedQuery = new URL(request.url).searchParams.get('q') ?? ''
        return HttpResponse.json({
          object: 'catalog',
          total_values: 2,
          data: ['Lightning Bolt', 'Lightning Helix'],
        })
      }),
    )
    const result = await searchAutocomplete('Light')
    expect(receivedQuery).toBe('Light')
    expect(result).toEqual([
      { englishName: 'Lightning Bolt' },
      { englishName: 'Lightning Helix' },
    ])
  })

  it('uses /cards/search with name:Q + lang:ja for non-ASCII input', async () => {
    let receivedUrl: URL | null = null
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/search`, ({ request }) => {
        receivedUrl = new URL(request.url)
        return HttpResponse.json({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            {
              object: 'card',
              id: 'abc',
              oracle_id: 'oid-1',
              name: 'Lightning Bolt',
              printed_name: '稲妻',
              lang: 'ja',
              set: '4ed',
              set_name: 'Fourth Edition',
              released_at: '1995-04-01',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/4ed-ja.jpg' },
            },
          ],
        })
      }),
    )
    const result = await searchAutocomplete('稲妻')
    expect(receivedUrl).not.toBeNull()
    const params = receivedUrl!.searchParams
    expect(params.get('q')).toBe('name:稲妻 lang:ja')
    expect(params.get('unique')).toBe('cards')
    expect(result).toEqual([
      { englishName: 'Lightning Bolt', japaneseName: '稲妻', oracleId: 'oid-1' },
    ])
  })

  it('returns empty array when search returns 404', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/search`, () =>
        HttpResponse.json(
          { object: 'error', code: 'not_found', status: 404, details: 'No cards found' },
          { status: 404 },
        ),
      ),
    )
    expect(await searchAutocomplete('存在しないカードxyz')).toEqual([])
  })
})

describe('fetchCardWithLanguagePreference', () => {
  beforeEach(() => __setRateLimitMsForTests(0))

  it('returns Japanese version with displayName=printed_name when available', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'en-id',
          oracle_id: 'oid-1',
          name: 'Lightning Bolt',
          lang: 'en',
          set: 'clu',
          set_name: 'Ravnica: Clue Edition',
          released_at: '2024-02-23',
          image_uris: { ...emptyImageUris, normal: 'https://example.com/clu-en.jpg' },
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, () =>
        HttpResponse.json({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            {
              object: 'card',
              id: 'ja-id',
              oracle_id: 'oid-1',
              name: 'Lightning Bolt',
              printed_name: '稲妻',
              lang: 'ja',
              set: '4ed',
              set_name: 'Fourth Edition',
              released_at: '1995-04-01',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/4ed-ja.jpg' },
            },
          ],
        }),
      ),
    )
    const result = await fetchCardWithLanguagePreference('Lightning Bolt')
    expect(result).not.toBeNull()
    expect(result!.englishName).toBe('Lightning Bolt')
    expect(result!.japaneseName).toBe('稲妻')
    expect(result!.displayName).toBe('稲妻')
    expect(result!.hasJapanese).toBe(true)
    expect(result!.imageUrl).toBe('https://example.com/4ed-ja.jpg')
    expect(result!.scryfallId).toBe('ja-id')
    expect(result!.setCode).toBe('4ed')
    expect(result!.releasedAt).toBe('1995-04-01')
  })

  it('falls back to English when Japanese version not found (search 404)', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'en-id',
          oracle_id: 'oid-2',
          name: 'Black Lotus',
          lang: 'en',
          set: 'lea',
          set_name: 'Limited Edition Alpha',
          released_at: '1993-08-05',
          image_uris: { ...emptyImageUris, normal: 'https://example.com/lea.jpg' },
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, () =>
        HttpResponse.json(
          { object: 'error', code: 'not_found', status: 404 },
          { status: 404 },
        ),
      ),
    )
    const result = await fetchCardWithLanguagePreference('Black Lotus')
    expect(result).not.toBeNull()
    expect(result!.englishName).toBe('Black Lotus')
    expect(result!.japaneseName).toBeUndefined()
    expect(result!.displayName).toBe('Black Lotus')
    expect(result!.hasJapanese).toBe(false)
    expect(result!.imageUrl).toBe('https://example.com/lea.jpg')
  })

  it('returns null when /cards/named returns 404', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json(
          { object: 'error', code: 'not_found', status: 404 },
          { status: 404 },
        ),
      ),
    )
    expect(await fetchCardWithLanguagePreference('NonExistentCardXyz')).toBeNull()
  })

  it('returns null for empty input without hitting the network', async () => {
    expect(await fetchCardWithLanguagePreference('   ')).toBeNull()
  })

  it('retries once on network failure then throws', async () => {
    let calls = 0
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () => {
        calls += 1
        return HttpResponse.error()
      }),
    )
    await expect(fetchCardWithLanguagePreference('Anything')).rejects.toThrow()
    expect(calls).toBe(2)
  })

  it('skips Japanese printings without printed_name (e.g. promo) in favor of named printings', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'en-id',
          oracle_id: 'oid-cloud',
          name: 'Cloud, Midgar Mercenary',
          lang: 'en',
          set: 'fin',
          set_name: 'Final Fantasy',
          released_at: '2025-06-13',
          image_uris: { ...emptyImageUris, normal: 'https://example.com/en.jpg' },
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, () =>
        HttpResponse.json({
          object: 'list',
          total_cards: 2,
          has_more: false,
          data: [
            {
              object: 'card',
              id: 'pspl-id',
              oracle_id: 'oid-cloud',
              name: 'Cloud, Midgar Mercenary',
              printed_name: undefined,
              lang: 'ja',
              set: 'pspl',
              set_name: 'Promo',
              released_at: '2025-01-03',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/pspl-ja.jpg' },
            },
            {
              object: 'card',
              id: 'fin-id',
              oracle_id: 'oid-cloud',
              name: 'Cloud, Midgar Mercenary',
              printed_name: 'ミッドガルの傭兵、クラウド',
              lang: 'ja',
              set: 'fin',
              set_name: 'Final Fantasy',
              released_at: '2025-06-13',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/fin-ja.jpg' },
            },
          ],
        }),
      ),
    )
    const result = await fetchCardWithLanguagePreference('Cloud, Midgar Mercenary')
    expect(result).not.toBeNull()
    expect(result!.japaneseName).toBe('ミッドガルの傭兵、クラウド')
    expect(result!.displayName).toBe('ミッドガルの傭兵、クラウド')
    expect(result!.scryfallId).toBe('fin-id')
    expect(result!.imageUrl).toBe('https://example.com/fin-ja.jpg')
  })

  it('uses card_faces[0].printed_name when top-level printed_name is missing (double-faced JP card)', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'en-id',
          oracle_id: 'oid-dfc',
          name: 'Front // Back',
          lang: 'en',
          set: 'xyz',
          set_name: 'Xyz',
          released_at: '2024-01-01',
          image_uris: { ...emptyImageUris, normal: 'https://example.com/en.jpg' },
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, () =>
        HttpResponse.json({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            {
              object: 'card',
              id: 'ja-dfc',
              oracle_id: 'oid-dfc',
              name: 'Front // Back',
              lang: 'ja',
              set: 'xyz',
              set_name: 'Xyz',
              released_at: '2024-01-01',
              card_faces: [
                {
                  object: 'card_face',
                  name: 'Front',
                  printed_name: '表面',
                  image_uris: { ...emptyImageUris, normal: 'https://example.com/front-ja.jpg' },
                },
                {
                  object: 'card_face',
                  name: 'Back',
                  printed_name: '裏面',
                  image_uris: { ...emptyImageUris, normal: 'https://example.com/back-ja.jpg' },
                },
              ],
            },
          ],
        }),
      ),
    )
    const result = await fetchCardWithLanguagePreference('Front')
    expect(result).not.toBeNull()
    expect(result!.japaneseName).toBe('表面')
    expect(result!.displayName).toBe('表面')
  })

  it('preferLanguage=en skips Japanese search and returns English oldest printing', async () => {
    let searchCallParams: URLSearchParams | null = null
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'en-id',
          oracle_id: 'oid-en',
          name: 'Lightning Bolt',
          lang: 'en',
          set: 'clu',
          set_name: 'Cluedo',
          released_at: '2024-02-23',
          image_uris: { ...emptyImageUris, normal: 'https://example.com/clu-en.jpg' },
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, ({ request }) => {
        searchCallParams = new URL(request.url).searchParams
        return HttpResponse.json({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            {
              object: 'card',
              id: 'lea-id',
              oracle_id: 'oid-en',
              name: 'Lightning Bolt',
              lang: 'en',
              set: 'lea',
              set_name: 'Alpha',
              released_at: '1993-08-05',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/lea-en.jpg' },
            },
          ],
        })
      }),
    )
    const result = await fetchCardWithLanguagePreference('Lightning Bolt', {
      preferLanguage: 'en',
      preferAge: 'oldest',
    })
    expect(searchCallParams).not.toBeNull()
    expect(searchCallParams!.get('q')).toBe('oracleid:oid-en lang:en')
    expect(searchCallParams!.get('dir')).toBe('asc')
    expect(result).not.toBeNull()
    expect(result!.scryfallId).toBe('lea-id')
    expect(result!.imageUrl).toBe('https://example.com/lea-en.jpg')
    expect(result!.hasJapanese).toBe(false)
  })

  it('preferAge=newest sends dir=desc', async () => {
    let searchCallParams: URLSearchParams | null = null
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'en-id',
          oracle_id: 'oid-newest',
          name: 'Lightning Bolt',
          lang: 'en',
          set: 'clu',
          set_name: 'Cluedo',
          released_at: '2024-02-23',
          image_uris: { ...emptyImageUris, normal: 'https://example.com/en.jpg' },
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, ({ request }) => {
        searchCallParams = new URL(request.url).searchParams
        return HttpResponse.json({
          object: 'list',
          total_cards: 1,
          has_more: false,
          data: [
            {
              object: 'card',
              id: 'fin-id',
              oracle_id: 'oid-newest',
              name: 'Lightning Bolt',
              printed_name: '稲妻',
              lang: 'ja',
              set: 'fin',
              set_name: 'Fin',
              released_at: '2025-06-13',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/fin-ja.jpg' },
            },
          ],
        })
      }),
    )
    await fetchCardWithLanguagePreference('Lightning Bolt', {
      preferAge: 'newest',
    })
    expect(searchCallParams).not.toBeNull()
    expect(searchCallParams!.get('dir')).toBe('desc')
  })

  it('handles double-faced cards by picking the front face image', async () => {
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/named`, () =>
        HttpResponse.json({
          object: 'card',
          id: 'dfc-id',
          oracle_id: 'oid-dfc',
          name: 'Delver of Secrets // Insectile Aberration',
          lang: 'en',
          set: 'isd',
          set_name: 'Innistrad',
          released_at: '2011-09-30',
          card_faces: [
            {
              object: 'card_face',
              name: 'Delver of Secrets',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/front.jpg' },
            },
            {
              object: 'card_face',
              name: 'Insectile Aberration',
              image_uris: { ...emptyImageUris, normal: 'https://example.com/back.jpg' },
            },
          ],
        }),
      ),
      http.get(`${SCRYFALL_BASE}/cards/search`, () =>
        HttpResponse.json(
          { object: 'error', code: 'not_found', status: 404 },
          { status: 404 },
        ),
      ),
    )
    const result = await fetchCardWithLanguagePreference('Delver of Secrets')
    expect(result).not.toBeNull()
    expect(result!.imageUrl).toBe('https://example.com/front.jpg')
  })
})

describe('rate limiting', () => {
  it('enforces minimum interval between sequential requests', async () => {
    __setRateLimitMsForTests(60)
    server.use(
      http.get(`${SCRYFALL_BASE}/cards/autocomplete`, () =>
        HttpResponse.json({ object: 'catalog', total_values: 0, data: [] }),
      ),
    )
    const start = Date.now()
    await searchAutocomplete('a')
    await searchAutocomplete('b')
    await searchAutocomplete('c')
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(120)
    __setRateLimitMsForTests(0)
  })
})
