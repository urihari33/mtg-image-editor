import { useCallback, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDndContext,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type {
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Canvas } from './components/Canvas'
import { CardView } from './components/CardView'
import { ImageExport } from './components/ImageExport'
import { SearchBox } from './components/SearchBox'
import { Sidebar } from './components/Sidebar'
import { TextOutput } from './components/TextOutput'
import { fetchCardWithLanguagePreference } from './api/scryfall'
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
} from './state/layout'
import { useHistory } from './state/useHistory'
import { usePreferences } from './state/usePreferences'
import type { CardEntry, LayoutItem } from './types/card'
import './App.css'

function App() {
  const [layout, setLayout] = useState(createInitialLayout)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<LayoutItem | null>(null)
  const [activeSidebarCard, setActiveSidebarCard] = useState<CardEntry | null>(null)
  const { history, addCard: addToHistory, clear: clearHistory } = useHistory()
  const { preferences, setPreference } = usePreferences()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const addCard = useCallback(
    (card: CardEntry) => {
      setLayout((prev) => addCardToLayout(prev, card))
      addToHistory(card)
    },
    [addToHistory],
  )

  const handlePickSuggestion = useCallback(
    async (englishName: string) => {
      setIsAdding(true)
      setError(null)
      try {
        const card = await fetchCardWithLanguagePreference(englishName, {
          preferLanguage: preferences.preferLanguage,
          preferAge: preferences.preferAge,
        })
        if (!card) {
          setError(`カードが見つかりません: ${englishName}`)
          return
        }
        addCard(card)
      } catch (e) {
        setError(e instanceof Error ? e.message : '不明なエラーが発生しました')
      } finally {
        setIsAdding(false)
      }
    },
    [addCard, preferences.preferLanguage, preferences.preferAge],
  )

  const handleRemoveItem = useCallback((itemId: string) => {
    setLayout((prev) => pruneEmptyRows(removeItemFromLayout(prev, itemId)))
  }, [])

  const handleFlipItem = useCallback((itemId: string) => {
    setLayout((prev) => flipItem(prev, itemId))
  }, [])

  const handleClearAll = useCallback(() => {
    setLayout(createInitialLayout())
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeType = event.active.data.current?.type as string | undefined
      if (activeType === 'sidebar-card') {
        const card = event.active.data.current?.card as CardEntry | undefined
        setActiveSidebarCard(card ?? null)
        setActiveItem(null)
        if (card) {
          const placeholderId = String(event.active.id)
          setLayout((prev) => {
            const lastRow = prev.rows[prev.rows.length - 1]
            if (!lastRow) return prev
            return setSidebarPlaceholder(
              prev,
              placeholderId,
              card,
              lastRow.id,
              lastRow.items.length,
            )
          })
        }
        return
      }
      const id = String(event.active.id)
      const located = findItem(layout, id)
      setActiveItem(located?.item ?? null)
      setActiveSidebarCard(null)
    },
    [layout],
  )

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    const activeType = active.data.current?.type as string | undefined
    if (activeType !== 'sidebar-card') return
    const card = active.data.current?.card as CardEntry | undefined
    if (!card) return
    const placeholderId = String(active.id)
    if (!over) return
    const overType = over.data.current?.type as string | undefined
    const overId = String(over.id)
    if (overType === 'overlay-zone' || overType === 'new-row') {
      setLayout((prev) => {
        const exists = prev.rows.some((r) =>
          r.items.some((i) => i.id === placeholderId),
        )
        return exists ? removeItemFromLayout(prev, placeholderId) : prev
      })
      return
    }
    if (overType !== 'item' && overType !== 'row') return
    setLayout((prev) => {
      const placeholderLoc = findItem(prev, placeholderId)
      const target =
        overType === 'item'
          ? (() => {
              const cleaned = placeholderLoc
                ? removeItemFromLayout(prev, placeholderId)
                : prev
              const t = findItem(cleaned, overId)
              return t ? { rowId: t.row.id, index: t.index } : null
            })()
          : (() => {
              const rowId = String(over.data.current?.rowId ?? overId)
              const row = prev.rows.find((r) => r.id === rowId)
              if (!row) return null
              const index = row.items.filter((i) => i.id !== placeholderId).length
              return { rowId, index }
            })()
      if (!target) return prev
      if (
        placeholderLoc &&
        placeholderLoc.row.id === target.rowId &&
        placeholderLoc.index === target.index
      ) {
        return prev
      }
      return setSidebarPlaceholder(prev, placeholderId, card, target.rowId, target.index)
    })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveItem(null)
      setActiveSidebarCard(null)
      const { active, over } = event
      if (!over) return
      const activeId = String(active.id)
      const overId = String(over.id)
      const activeType = active.data.current?.type as string | undefined
      const overType = over.data.current?.type as string | undefined

      if (activeType === 'sidebar-card') {
        const card = active.data.current?.card as CardEntry | undefined
        if (!card) return
        const placeholderId = String(active.id)
        setLayout((prev) => {
          const placeholderLoc = findItem(prev, placeholderId)
          const stripPlaceholder = placeholderLoc
            ? removeItemFromLayout(prev, placeholderId)
            : prev
          if (overType === 'overlay-zone') {
            const baseId = String(over.data.current?.baseId ?? '')
            const next = baseId
              ? addCardAsOverlay(stripPlaceholder, card, baseId)
              : stripPlaceholder
            return pruneEmptyRows(next)
          }
          if (overType === 'new-row') {
            const withRow = addNewEmptyRow(stripPlaceholder)
            const newRowId = withRow.rows[withRow.rows.length - 1].id
            return pruneEmptyRows(addCardToRow(withRow, card, newRowId))
          }
          if (placeholderLoc) {
            // Placeholder is already in position from onDragOver; for item drops
            // commit to the over's index, otherwise keep current row-end position.
            let working = prev
            if (overType === 'item') {
              const target = findItem(prev, overId)
              if (target && target.item.id !== placeholderId) {
                working = moveItem(prev, placeholderId, target.row.id, target.index)
              }
            }
            return pruneEmptyRows(finalizePlaceholder(working, placeholderId))
          }
          // Fallback (no placeholder yet) — add fresh
          const next =
            overType === 'item'
              ? (() => {
                  const target = findItem(prev, overId)
                  return target
                    ? addCardToRow(stripPlaceholder, card, target.row.id, target.index)
                    : addCardToLayout(stripPlaceholder, card)
                })()
              : overType === 'row'
                ? addCardToRow(
                    stripPlaceholder,
                    card,
                    String(over.data.current?.rowId ?? overId),
                  )
                : addCardToLayout(stripPlaceholder, card)
          return pruneEmptyRows(next)
        })
        addToHistory(card)
        return
      }

      setLayout((prev) => {
        let next = prev
        if (overType === 'overlay-zone' && activeId !== overId) {
          const baseId = String(over.data.current?.baseId ?? '')
          if (baseId && baseId !== activeId) {
            next = setOverlay(prev, activeId, baseId)
          }
        } else if (overType === 'item' && activeId !== overId) {
          const located = findItem(prev, activeId)
          const cleared = located?.item.overlayOf
            ? clearOverlay(prev, activeId)
            : prev
          const overLocation = findItem(cleared, overId)
          next = overLocation
            ? moveItem(cleared, activeId, overLocation.row.id, overLocation.index)
            : cleared
        } else if (overType === 'row') {
          const rowId = String(over.data.current?.rowId ?? overId)
          const located = findItem(prev, activeId)
          const cleared = located?.item.overlayOf
            ? clearOverlay(prev, activeId)
            : prev
          next = moveItem(cleared, activeId, rowId, Infinity)
        } else if (overType === 'new-row') {
          const located = findItem(prev, activeId)
          const cleared = located?.item.overlayOf
            ? clearOverlay(prev, activeId)
            : prev
          const withRow = addNewEmptyRow(cleared)
          const newRowId = withRow.rows[withRow.rows.length - 1].id
          next = moveItem(withRow, activeId, newRowId, 0)
        }
        return pruneEmptyRows(next)
      })
    },
    [addToHistory],
  )

  const handleDragCancel = useCallback((event: DragCancelEvent) => {
    setActiveItem(null)
    setActiveSidebarCard(null)
    const id = String(event.active.id)
    if (id.startsWith('history-')) {
      setLayout((prev) => {
        const exists = prev.rows.some((r) => r.items.some((i) => i.id === id))
        return exists ? pruneEmptyRows(removeItemFromLayout(prev, id)) : prev
      })
    }
  }, [])

  const hasCards = layout.rows.some((row) => row.items.length > 0)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app">
        <Sidebar history={history} onPickCard={addCard} onClear={clearHistory} />
        <div className="app-main">
          <header className="app-header">
            <h1>MTG Image Editor</h1>
            <SearchBox onPickSuggestion={handlePickSuggestion} disabled={isAdding} />
            <div className="preference-toggles" role="group" aria-label="検索オプション">
              <button
                type="button"
                className="preference-toggle"
                onClick={() =>
                  setPreference(
                    'preferLanguage',
                    preferences.preferLanguage === 'ja' ? 'en' : 'ja',
                  )
                }
                aria-pressed={preferences.preferLanguage === 'ja'}
                title="クリックで日本語版/英語版優先を切替"
              >
                {preferences.preferLanguage === 'ja'
                  ? '🇯🇵 日本語版優先'
                  : '🇺🇸 英語版優先'}
              </button>
              <button
                type="button"
                className="preference-toggle"
                onClick={() =>
                  setPreference(
                    'preferAge',
                    preferences.preferAge === 'oldest' ? 'newest' : 'oldest',
                  )
                }
                aria-pressed={preferences.preferAge === 'oldest'}
                title="クリックで古い/新しい印刷の優先を切替"
              >
                {preferences.preferAge === 'oldest'
                  ? '📜 古いカード優先'
                  : '✨ 新しいカード優先'}
              </button>
            </div>
            <p className="app-hint">
              Tip: カードをドラッグで並び替え。右下の 🔗 ゾーンへドロップで重ね合わせ（60% 右下揃え）。サイドバーの履歴もドラッグで配置できます。
            </p>
            {error && (
              <p className="app-error" role="alert">
                {error}
              </p>
            )}
          </header>
          <Canvas
            layout={layout}
            onRemoveItem={handleRemoveItem}
            onFlipItem={handleFlipItem}
          />
          <ImageExport
            layout={layout}
            alignment={preferences.outputAlignment}
            onAlignmentChange={(a) => setPreference('outputAlignment', a)}
            disabled={!hasCards}
            onClearAll={handleClearAll}
          />
          <TextOutput layout={layout} />
        </div>
      </div>
      <DragOverlay>
        <DragPreview activeItem={activeItem} activeSidebarCard={activeSidebarCard} />
      </DragOverlay>
    </DndContext>
  )
}

function DragPreview({
  activeItem,
  activeSidebarCard,
}: {
  activeItem: LayoutItem | null
  activeSidebarCard: CardEntry | null
}) {
  const { over } = useDndContext()
  const isOverOverlayZone =
    (over?.data.current as { type?: string } | undefined)?.type === 'overlay-zone'
  const previewItem: LayoutItem | null = activeItem
    ? activeItem
    : activeSidebarCard
      ? { id: 'preview', card: activeSidebarCard }
      : null
  if (!previewItem) return null
  return (
    <div
      className={`drag-overlay${isOverOverlayZone ? ' drag-overlay-shrink' : ''}`}
    >
      <CardView item={previewItem} />
    </div>
  )
}

export default App
