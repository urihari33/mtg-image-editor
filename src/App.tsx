import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Canvas } from './components/Canvas'
import { CardView } from './components/CardView'
import { ImageExport } from './components/ImageExport'
import { SearchBox } from './components/SearchBox'
import { Sidebar } from './components/Sidebar'
import { TextOutput } from './components/TextOutput'
import { fetchCardWithLanguagePreference } from './api/scryfall'
import {
  addCardToLayout,
  addCardToRow,
  addNewEmptyRow,
  clearOverlay,
  createInitialLayout,
  findItem,
  moveItem,
  pruneEmptyRows,
  removeItemFromLayout,
  setOverlay,
} from './state/layout'
import { useHistory } from './state/useHistory'
import type { CardEntry, LayoutItem } from './types/card'
import './App.css'

function App() {
  const [layout, setLayout] = useState(createInitialLayout)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<LayoutItem | null>(null)
  const [activeSidebarCard, setActiveSidebarCard] = useState<CardEntry | null>(null)
  const { history, addCard: addToHistory, clear: clearHistory } = useHistory()
  const shiftHeldRef = useRefShiftKey()

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
        const card = await fetchCardWithLanguagePreference(englishName)
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
    [addCard],
  )

  const handleRemoveItem = useCallback((itemId: string) => {
    setLayout((prev) => pruneEmptyRows(removeItemFromLayout(prev, itemId)))
  }, [])

  const handleClearAll = useCallback(() => {
    setLayout(createInitialLayout())
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeType = event.active.data.current?.type as string | undefined
      if (activeType === 'sidebar-card') {
        setActiveSidebarCard(event.active.data.current?.card as CardEntry)
        setActiveItem(null)
        return
      }
      const id = String(event.active.id)
      const located = findItem(layout, id)
      setActiveItem(located?.item ?? null)
      setActiveSidebarCard(null)
    },
    [layout],
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
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
      setLayout((prev) => {
        const next =
          overType === 'item'
            ? (() => {
                const overLocation = findItem(prev, overId)
                return overLocation
                  ? addCardToRow(prev, card, overLocation.row.id, overLocation.index)
                  : addCardToLayout(prev, card)
              })()
            : overType === 'row'
              ? addCardToRow(prev, card, String(over.data.current?.rowId ?? overId))
              : overType === 'new-row'
                ? (() => {
                    const withRow = addNewEmptyRow(prev)
                    const newRowId = withRow.rows[withRow.rows.length - 1].id
                    return addCardToRow(withRow, card, newRowId)
                  })()
                : addCardToLayout(prev, card)
        addToHistory(card)
        return pruneEmptyRows(next)
      })
      return
    }

    const isShift = shiftHeldRef.current
    setLayout((prev) => {
      let next = prev
      if (overType === 'item' && activeId !== overId) {
        if (isShift) {
          next = setOverlay(prev, activeId, overId)
        } else {
          const located = findItem(prev, activeId)
          const cleared = located?.item.overlayOf ? clearOverlay(prev, activeId) : prev
          const overLocation = findItem(cleared, overId)
          next = overLocation
            ? moveItem(cleared, activeId, overLocation.row.id, overLocation.index)
            : cleared
        }
      } else if (overType === 'row') {
        const rowId = String(over.data.current?.rowId ?? overId)
        const located = findItem(prev, activeId)
        const cleared = located?.item.overlayOf ? clearOverlay(prev, activeId) : prev
        next = moveItem(cleared, activeId, rowId, Infinity)
      } else if (overType === 'new-row') {
        const located = findItem(prev, activeId)
        const cleared = located?.item.overlayOf ? clearOverlay(prev, activeId) : prev
        const withRow = addNewEmptyRow(cleared)
        const newRowId = withRow.rows[withRow.rows.length - 1].id
        next = moveItem(withRow, activeId, newRowId, 0)
      }
      return pruneEmptyRows(next)
    })
  }, [addToHistory, shiftHeldRef])

  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    setActiveSidebarCard(null)
  }, [])

  const hasCards = layout.rows.some((row) => row.items.length > 0)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="app">
        <Sidebar history={history} onPickCard={addCard} onClear={clearHistory} />
        <div className="app-main">
          <header className="app-header">
            <h1>MTG Image Editor</h1>
            <SearchBox onPickSuggestion={handlePickSuggestion} disabled={isAdding} />
            <p className="app-hint">
              Tip: ドラッグで並び替え。Shift + ドラッグで他カードに重ね合わせ（60% 右下揃え）。サイドバーの履歴もドラッグで配置できます。
            </p>
            {error && (
              <p className="app-error" role="alert">
                {error}
              </p>
            )}
          </header>
          <Canvas layout={layout} onRemoveItem={handleRemoveItem} />
          <ImageExport
            layout={layout}
            disabled={!hasCards}
            onClearAll={handleClearAll}
          />
          <TextOutput layout={layout} />
        </div>
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="drag-overlay">
            <CardView item={activeItem} />
          </div>
        ) : activeSidebarCard ? (
          <div className="drag-overlay">
            <CardView
              item={{ id: 'preview', card: activeSidebarCard }}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function useRefShiftKey() {
  const ref = useRef(false)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      ref.current = event.shiftKey
    }
    const onMouse = (event: MouseEvent) => {
      ref.current = event.shiftKey
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('mousemove', onMouse)
    window.addEventListener('mousedown', onMouse)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('mousedown', onMouse)
    }
  }, [])
  return ref
}

export default App
