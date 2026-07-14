import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import {
  calculateObjectGridColumns,
  calculateObjectListVirtualWindow,
  defaultObjectListVirtualizationThreshold,
  getObjectGridCardHeight,
  objectGridGap,
} from '../style-preview/domain/objectListVirtualization'
import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import { getFilteredStoryObjects, type ObjectCardsFilter } from '../style-preview/domain/objectFilters'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type {
  AuthUser,
  StoryObject,
} from '../types'
import { KebabMenu, ObjectPortrait } from './StylePreviewPrimitives'

const objectListVirtualRowHeight = 154

export function ObjectCardsWorkspace({
  currentUser,
  layoutMode,
  sectionTitle,
  selectedObjectId,
  ui,
  viewSectionLabel,
  visibleObjects,
  onCreateObject,
  onDeleteObject,
  onEditObject,
  onLayoutModeChange,
  onOpenObject,
}: {
  currentUser: AuthUser | null
  layoutMode: 'grid' | 'list'
  sectionTitle: string
  selectedObjectId: number | null
  ui: PreviewText
  viewSectionLabel: string
  visibleObjects: StoryObject[]
  onCreateObject: () => void
  onDeleteObject: (storyObject: StoryObject) => void
  onEditObject: (storyObject: StoryObject) => void
  onLayoutModeChange: (layoutMode: 'grid' | 'list') => void
  onOpenObject: (storyObject: StoryObject) => void
}) {
  const cardsRef = useRef<HTMLDivElement | null>(null)
  const [objectFilter, setObjectFilter] = useState<ObjectCardsFilter>('all')
  const [listViewport, setListViewport] = useState({ scrollTop: 0, viewportHeight: 0 })
  const [gridWidth, setGridWidth] = useState(0)
  const filteredObjects = useMemo(
    () => getFilteredStoryObjects(visibleObjects, objectFilter),
    [objectFilter, visibleObjects],
  )
  const canUseWindowVirtualization = filteredObjects.length > defaultObjectListVirtualizationThreshold
  const virtualColumns = layoutMode === 'grid' ? calculateObjectGridColumns(gridWidth) : 1
  const virtualCardHeight = layoutMode === 'grid' ? getObjectGridCardHeight(filteredObjects[0]?.typeKey) : objectListVirtualRowHeight
  const virtualRowHeight = layoutMode === 'grid' ? virtualCardHeight + objectGridGap : objectListVirtualRowHeight

  useEffect(() => {
    if (!canUseWindowVirtualization) {
      setListViewport({ scrollTop: 0, viewportHeight: 0 })
      return undefined
    }

    const cardsElement = cardsRef.current
    const scrollElement = cardsElement?.closest('.sp-content')
    if (!(scrollElement instanceof HTMLElement) || cardsElement === null) {
      return undefined
    }

    let animationFrame = 0
    const updateViewport = () => {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => {
        const cardsRect = cardsElement.getBoundingClientRect()
        const scrollRect = scrollElement.getBoundingClientRect()
        const gridTop = scrollElement.scrollTop + cardsRect.top - scrollRect.top
        setListViewport({
          scrollTop: Math.max(0, scrollElement.scrollTop - gridTop),
          viewportHeight: scrollElement.clientHeight,
        })
      })
    }

    updateViewport()
    scrollElement.addEventListener('scroll', updateViewport, { passive: true })
    window.addEventListener('resize', updateViewport)

    return () => {
      cancelAnimationFrame(animationFrame)
      scrollElement.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [canUseWindowVirtualization, filteredObjects.length, layoutMode])

  useEffect(() => {
    const cardsElement = cardsRef.current
    if (cardsElement === null || typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const observer = new ResizeObserver(([entry]) => {
      setGridWidth(entry?.contentRect.width ?? cardsElement.clientWidth)
    })
    observer.observe(cardsElement)
    setGridWidth(cardsElement.clientWidth)

    return () => observer.disconnect()
  }, [])

  const virtualWindow = useMemo(
    () =>
      calculateObjectListVirtualWindow({
        columns: virtualColumns,
        itemCount: filteredObjects.length,
        rowHeight: virtualRowHeight,
        scrollTop: listViewport.scrollTop,
        viewportHeight: listViewport.viewportHeight,
      }),
    [filteredObjects.length, listViewport.scrollTop, listViewport.viewportHeight, virtualColumns, virtualRowHeight],
  )
  const renderedObjects = canUseWindowVirtualization
    ? filteredObjects.slice(virtualWindow.startIndex, virtualWindow.endIndex)
    : filteredObjects
  const topSpacerStyle = { height: virtualWindow.topSpacerHeight } satisfies CSSProperties
  const bottomSpacerStyle = { height: virtualWindow.bottomSpacerHeight } satisfies CSSProperties
  const cardsStyle: CSSProperties & Record<'--sp-object-card-height', string> = {
    '--sp-object-card-height': `${virtualCardHeight}px`,
  }

  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{sectionTitle}</h2>
        </div>
        {currentUser !== null && (
          <button className="sp-button primary sp-content-create" type="button" onClick={onCreateObject}>
            + {ui.newObject}
          </button>
        )}
        <div className="sp-filters">
          <button
            className={objectFilter === 'all' ? 'sp-pill active' : 'sp-pill'}
            type="button"
            onClick={() => setObjectFilter('all')}
          >
            {ui.all}
          </button>
          <button
            className={objectFilter === 'active' ? 'sp-pill active' : 'sp-pill'}
            type="button"
            onClick={() => setObjectFilter('active')}
          >
            {ui.active}
          </button>
          <button className="sp-pill" disabled type="button">{ui.favorites}</button>
        </div>
      </div>
      <div className="sp-toolbar">
        <span>
          {ui.view}: {ui.database} / {viewSectionLabel}
        </span>
        <div className="sp-switch">
          <button
            className={layoutMode === 'grid' ? 'active' : ''}
            type="button"
            onClick={() => onLayoutModeChange('grid')}
            aria-label={ui.gridView}
          >
            <span className="sp-view-icon grid" aria-hidden="true" />
          </button>
          <button
            className={layoutMode === 'list' ? 'active' : ''}
            type="button"
            onClick={() => onLayoutModeChange('list')}
            aria-label={ui.listView}
          >
            <span className="sp-view-icon list" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className={`sp-cards ${layoutMode === 'list' ? 'list' : ''} ${canUseWindowVirtualization ? 'is-windowed' : ''}`}
        ref={cardsRef}
        style={cardsStyle}
      >
        {canUseWindowVirtualization && virtualWindow.topSpacerHeight > 0 && (
          <div aria-hidden="true" className="sp-cards-virtual-spacer" style={topSpacerStyle} />
        )}
        {renderedObjects.map((storyObject) => {
          const displayName = getObjectFullName(storyObject)
          const roleLabel = storyObject.role ?? storyObject.typeKey

          return (
            <article
              className={`sp-card ${storyObject.id === selectedObjectId ? 'selected' : ''}`}
              key={storyObject.id}
            >
              <button className="sp-card-main" type="button" onClick={() => onOpenObject(storyObject)}>
                <ObjectPortrait storyObject={storyObject} />
              </button>
              <div className="sp-card-body" onClick={() => onOpenObject(storyObject)}>
                <h3 className="sp-card-title" title={displayName}>{displayName}</h3>
                <span className="sp-card-meta" title={roleLabel}>{roleLabel}</span>
                <div className="sp-tags">
                  {storyObject.attributes.slice(0, 3).map((attribute) => (
                    <span key={attribute.id}>{attribute.name}</span>
                  ))}
                </div>
              </div>
              <KebabMenu
                ariaLabel={`${storyObject.name}: ${ui.actions}`}
                className="sp-card-menu"
                ui={ui}
                onDelete={() => onDeleteObject(storyObject)}
                onEdit={() => onEditObject(storyObject)}
              />
              <div className="sp-card-actions" aria-hidden="true">
                <button type="button" onClick={() => onEditObject(storyObject)}>
                  {ui.edit}
                </button>
                <button type="button" onClick={() => onDeleteObject(storyObject)}>
                  {ui.delete}
                </button>
              </div>
            </article>
          )
        })}
        {canUseWindowVirtualization && virtualWindow.bottomSpacerHeight > 0 && (
          <div aria-hidden="true" className="sp-cards-virtual-spacer" style={bottomSpacerStyle} />
        )}
        {filteredObjects.length === 0 && (
          <div className="sp-empty">
            <strong>{ui.noObjects}</strong>
            <span>{ui.noObjectsHint}</span>
          </div>
        )}
      </div>
    </>
  )
}
