import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { scaleLinear, type ScaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import {
  getTimelineEventColor,
  getTimelineEventTypeLabel,
  getTimelineLinkTypeLabel,
} from '../style-preview/domain/timelineDisplay'
import type {
  TimelineEvent,
  TimelineEventLink,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutItem,
  TimelineLayoutRules,
} from '../types'
const TIMELINE_DURATION_TITLE_HEIGHT = 34
const TIMELINE_DURATION_POINT_BAND_HEIGHT = 30

export function TimelinePage({
  events,
  isGenerating,
  layout,
  layoutRules,
  links,
  selectedEvent,
  timeline,
  ui,
  onCreate,
  onCreateLink,
  onDeleteLink,
  onGenerate,
  onSelectEvent,
}: {
  events: TimelineEvent[]
  isGenerating: boolean
  layout: TimelineLayout | null
  layoutRules: TimelineLayoutRules | null
  links: TimelineEventLink[]
  selectedEvent: TimelineEvent | null
  timeline: TimelineInfo | null
  ui: PreviewText
  onCreate: () => void
  onCreateLink: () => void
  onDeleteLink: (linkId: number) => void
  onGenerate: () => void
  onSelectEvent: (eventId: number) => void
}) {
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const timelineZoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null)
  const [timelineTransform, setTimelineTransform] = useState<ZoomTransform>(zoomIdentity)
  const [isTimelinePanning, setIsTimelinePanning] = useState(false)
  const [isLinksPopoverOpen, setIsLinksPopoverOpen] = useState(false)
  const timelineZoom = timelineTransform.k
  const layoutItemsByEventId = useMemo(
    () => new Map(layout?.items.map((item) => [item.timelineEventId, item]) ?? []),
    [layout],
  )
  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events])
  const eventIndexesById = useMemo(
    () => new Map(events.map((event, index) => [event.id, index])),
    [events],
  )
  const layoutItems = layout?.items ?? []
  const timelineWidth = Math.max(
    1600,
    ...layoutItems.map((item) => item.x + item.width + 640),
  )
  const timelineHeight = Math.max(
    760,
    ...layoutItems.map((item) => item.y + item.height + 120),
  )
  const numericValues = events
    .flatMap((event) => [event.startValue, event.endValue])
    .filter((value): value is number => typeof value === 'number')
  const timelineDomainValues = numericValues.length === 0 ? [0, Math.max(events.length, 1)] : [...numericValues, 0]
  const minValue = Math.min(...timelineDomainValues)
  const maxValue = Math.max(...timelineDomainValues, minValue + 1)
  const baseTimeScale = useMemo(
    () => scaleLinear().domain([minValue, maxValue]).range([96, 1056]),
    [maxValue, minValue],
  )
  const timelineTimeScale = useMemo(
    () => timelineTransform.rescaleX(baseTimeScale),
    [baseTimeScale, timelineTransform],
  )
  const axisTicks = buildTimelineAxisTicks(timelineTimeScale, timelineWidth, timelineZoom)
  const storyStartX = timelineTimeScale(0)
  const renderedLayoutItemsByEventId = useMemo(() => {
    if (layout === null) {
      return new Map<number, TimelineLayoutItem>()
    }

    return new Map(
      events.flatMap((event) => {
        const item = layoutItemsByEventId.get(event.id)
        if (item === undefined) {
          return []
        }

        const index = eventIndexesById.get(event.id) ?? 0
        const startValue = getTimelineEventStartValue(event, index)
        const endValue = getTimelineEventEndValue(event, index)
        const startX = timelineTimeScale(startValue)
        const endX = timelineTimeScale(endValue)
        const width =
          event.eventType === 'point' || event.eventType === 'chapter'
            ? item.width
            : Math.max(item.width, Math.abs(endX - startX))
        const x = event.eventType === 'point'
          ? startX - item.width / 2
          : Math.min(startX, endX)

        return [[
          event.id,
          {
            ...item,
            x,
            width,
          },
        ]]
      }),
    )
  }, [eventIndexesById, events, layout, layoutItemsByEventId, timelineTimeScale])
  const eventCounts = {
    era: events.filter((event) => event.eventType === 'era').length,
    duration: events.filter((event) => event.eventType === 'duration').length,
    point: events.filter((event) => event.eventType === 'point').length,
    chapter: events.filter((event) => event.eventType === 'chapter').length,
  }
  const linkLines =
    layout === null
      ? []
      : links
          .map((link) => {
            const source = renderedLayoutItemsByEventId.get(link.sourceEventId)
            const target = renderedLayoutItemsByEventId.get(link.targetEventId)
            const sourceEvent = eventsById.get(link.sourceEventId)
            const targetEvent = eventsById.get(link.targetEventId)
            if (source === undefined || target === undefined) {
              return null
            }
            if (link.linkType === 'partOf') {
              return null
            }
            const sourceAnchor = getTimelineAnchor(source, sourceEvent?.eventType, target)
            const targetAnchor = getTimelineAnchor(target, targetEvent?.eventType, source)
            const path = getTimelineLinkRoute(sourceAnchor, targetAnchor)

            return {
              link,
              path,
            }
          })
          .filter((line): line is NonNullable<typeof line> => line !== null)
  useEffect(() => {
    const viewport = timelineViewportRef.current
    if (viewport === null) {
      return undefined
    }

    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.25, 48])
      .filter((event) => {
        if (event.type === 'dblclick') {
          return false
        }

        if (event.type === 'wheel') {
          return true
        }

        return !(event.target instanceof Element &&
          event.target.closest('.sp-timeline-item, button, a, input, select, textarea') !== null)
      })
      .on('start', () => setIsTimelinePanning(true))
      .on('zoom', (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
        setTimelineTransform(event.transform)
      })
      .on('end', () => setIsTimelinePanning(false))

    timelineZoomBehaviorRef.current = behavior
    select(viewport).call(behavior).on('dblclick.zoom', null)

    return () => {
      select(viewport).on('.zoom', null)
      timelineZoomBehaviorRef.current = null
    }
  }, [])
  const zoomTimeline = useCallback((nextZoom: number) => {
    const viewport = timelineViewportRef.current
    const behavior = timelineZoomBehaviorRef.current
    if (viewport === null || behavior === null) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    const clampedZoom = Math.min(48, Math.max(0.25, nextZoom))
    behavior.scaleTo(select(viewport), clampedZoom, [rect.width / 2, rect.height / 2])
  }, [])
  const resetTimelineViewport = useCallback(() => {
    const viewport = timelineViewportRef.current
    const behavior = timelineZoomBehaviorRef.current
    if (viewport === null || behavior === null) {
      return
    }

    behavior.transform(select(viewport), zoomIdentity)
  }, [])
  const modeLabel =
    timeline?.mode === 'dated'
      ? ui.timelineModeDated
      : timeline?.mode === 'freeform'
        ? ui.timelineModeFreeform
        : ui.timelineModeChapters
  const layoutButtonLabel = layout === null ? ui.layoutGenerate : layout.isStale ? ui.layoutUpdate : ui.layoutRegenerate
  const layoutSourceStatus = layoutRules?.coordinateStorage === 'project-file'
    ? `file: ${layoutRules.layoutStateFile}`
    : 'layout rules loading'
  const timelineStatus = layout === null
    ? ui.layoutNotGenerated
    : layout.isStale
      ? ui.layoutStale
      : ui.layoutSaved

  return (
    <div className="sp-timeline-page">
      <div className="sp-timeline-overlay-head">
        <div>
          <h2>{ui.timeline}</h2>
          <p>
            {modeLabel} · {events.length} {ui.eventsCount} · {timelineStatus}
          </p>
          <div className="sp-timeline-type-summary">
            <span className="era">{ui.timelineEras}: {eventCounts.era}</span>
            <span className="duration">{ui.timelineDurations}: {eventCounts.duration}</span>
            <span className="point">{ui.timelinePoints}: {eventCounts.point}</span>
            <span className="chapter">{ui.timelineChapters}: {eventCounts.chapter}</span>
            <span className="layout-source">{layoutSourceStatus}</span>
          </div>
        </div>
      </div>
      <div className="sp-timeline-overlay-actions">
          <button className="sp-button" type="button" disabled={isGenerating} onClick={onGenerate}>
            {isGenerating ? ui.layoutGenerating : layoutButtonLabel}
          </button>
          <button
            className="sp-button"
            type="button"
            aria-expanded={isLinksPopoverOpen}
            onClick={() => setIsLinksPopoverOpen((value) => !value)}
          >
            {ui.timelineEventLinks}
            <span className="sp-button-count">{links.length}</span>
          </button>
          <button className="sp-button" type="button" disabled={events.length < 2} onClick={onCreateLink}>
            {ui.linkEvents}
          </button>
          <button className="sp-button primary" type="button" onClick={onCreate}>
            {ui.newEvent}
          </button>
      </div>
      {isLinksPopoverOpen && (
        <div className="sp-timeline-links-popover">
          <div className="sp-timeline-links-popover-head">
            <div>
              <strong>{ui.timelineEventLinks}</strong>
              <span>{links.length} {ui.linksCount}</span>
            </div>
            <button className="sp-icon-button" type="button" onClick={() => setIsLinksPopoverOpen(false)}>
              x
            </button>
          </div>
          {links.length > 0 ? (
            <div className="sp-timeline-links-list">
              {links.map((link) => (
                <div className="sp-timeline-link-row" key={link.id}>
                  <span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLinksPopoverOpen(false)
                        onSelectEvent(link.sourceEventId)
                      }}
                    >
                      {eventsById.get(link.sourceEventId)?.title ?? ui.timelineEvent}
                    </button>
                    {' → '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLinksPopoverOpen(false)
                        onSelectEvent(link.targetEventId)
                      }}
                    >
                      {eventsById.get(link.targetEventId)?.title ?? ui.timelineEvent}
                    </button>
                  </span>
                  <em>{getTimelineLinkTypeLabel(link.linkType, ui)}</em>
                  <button className="sp-icon-button" type="button" onClick={() => onDeleteLink(link.id)}>
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="sp-empty compact">
              {ui.noEventLinks}
            </div>
          )}
        </div>
      )}
      <div className="sp-timeline">
        <div className="sp-timeline-tools">
          <button type="button" onClick={() => zoomTimeline(timelineZoom / 1.18)} title={ui.zoomOut}>
            -
          </button>
          <strong>{Math.round(timelineZoom * 100)}%</strong>
          <button type="button" onClick={() => zoomTimeline(timelineZoom * 1.18)} title={ui.zoomIn}>
            +
          </button>
          <button type="button" onClick={resetTimelineViewport} title={ui.zoomReset}>
            1:1
          </button>
        </div>
        <div
          className={`sp-timeline-viewport${isTimelinePanning ? ' is-panning' : ''}`}
          ref={timelineViewportRef}
        >
          <div
            className="sp-timeline-scale-frame"
            style={{ height: `${timelineHeight}px`, width: `${timelineWidth}px` }}
          >
        <div
          className={`sp-axis${layout === null ? ' is-unformed' : ''}`}
          style={{
            height: `${timelineHeight}px`,
            transform: `translateY(${timelineTransform.y}px)`,
            width: `${timelineWidth}px`,
          }}
        >
          {layout !== null && (
            <div className="sp-timeline-ticks">
              {axisTicks.map((tick) => (
                <span
                  className={tick.kind}
                  key={`${tick.kind}-${tick.value}`}
                  style={{ left: `${tick.x}px` }}
                >
                  {tick.label}
                </span>
              ))}
            </div>
          )}
          {layout !== null && (
            <div className="sp-timeline-origin" style={{ left: `${storyStartX}px` }}>
              <span>{ui.timelineStoryStart}</span>
            </div>
          )}
          {linkLines.length > 0 && (
            <svg
              className="sp-timeline-link-lines"
              aria-hidden="true"
              height={timelineHeight}
              width={timelineWidth}
            >
              {linkLines.map(({ link, path }) => (
                <g className={`sp-timeline-link-line ${link.linkType}`} key={link.id}>
                  <path d={path} vectorEffect="non-scaling-stroke" />
                </g>
              ))}
            </svg>
          )}
          {layout !== null &&
            events.map((event) => {
              const item = renderedLayoutItemsByEventId.get(event.id)
              if (item === undefined) {
                return null
              }
              const timeLabel = [event.startLabel, event.endLabel].filter(Boolean).join(' - ') ||
                event.category ||
                getTimelineEventTypeLabel(event.eventType, ui)
              const eventZIndex =
                event.eventType === 'point'
                  ? 70 + item.layer
                  : event.eventType === 'duration'
                    ? 20 + item.layer
                    : event.eventType === 'chapter'
                      ? 8 + item.layer
                      : 4 + item.layer
              const eventStyle = {
                '--event-color': event.color ?? getTimelineEventColor(event.eventType),
                height: event.eventType === 'era' ? `${timelineHeight}px` : `${item.height}px`,
                left: `${item.x}px`,
                top: event.eventType === 'era' ? '0px' : `${item.y}px`,
                width: `${item.width}px`,
                zIndex: eventZIndex,
              } as CSSProperties

              return (
                <article
                  className={`sp-timeline-item ${event.eventType}${selectedEvent?.id === event.id ? ' is-selected' : ''}`}
                  key={event.id}
                  onClick={event.eventType === 'era' ? undefined : () => onSelectEvent(event.id)}
                  style={eventStyle}
                >
                  {event.eventType === 'chapter' ? (
                    <span className="sp-timeline-chapter-label">
                      <strong>{event.title}</strong>
                      <em>{timeLabel}</em>
                    </span>
                  ) : event.eventType === 'point' ? (
                    null
                  ) : (
                    <>
                      <i className="sp-timeline-item-marker" />
                      <strong>{event.title}</strong>
                      {event.eventType !== 'duration' && <span>{timeLabel}</span>}
                      {event.description !== null &&
                        event.description.trim().length > 0 &&
                        event.eventType !== 'era' &&
                        event.eventType !== 'duration' && (
                        <em>{event.description}</em>
                      )}
                    </>
                  )}
                </article>
              )
            })}
          {layout === null && events.slice(0, 8).map((event, index) => (
            <div className="sp-timepoint" key={event.id} style={{ left: `${8 + index * 12}%` }}>
              <i />
              <article
                className={`${index % 2 === 0 ? 'top' : 'bottom'}${selectedEvent?.id === event.id ? ' is-selected' : ''}`}
                onClick={() => onSelectEvent(event.id)}
              >
                <strong>{event.title}</strong>
                <span>{event.startLabel ?? event.category ?? ui.timelineEvent}</span>
              </article>
            </div>
          ))}
          {events.length === 0 && (
            <div className="sp-empty sp-timeline-empty">
              <strong>{ui.noEvents}</strong>
              <span>{ui.noEventsHint}</span>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTimelineAnchor(
  item: TimelineLayoutItem,
  eventType: TimelineEvent['eventType'] | undefined,
  otherItem: TimelineLayoutItem,
) {
  const centerX = item.x + item.width / 2
  const centerY = item.y + item.height / 2

  if (eventType === 'point') {
    return { x: centerX, y: centerY }
  }

  const otherCenterX = otherItem.x + otherItem.width / 2
  const anchorY = eventType === 'duration'
    ? item.y + TIMELINE_DURATION_TITLE_HEIGHT + TIMELINE_DURATION_POINT_BAND_HEIGHT / 2
    : centerY

  return {
    x: otherCenterX >= centerX ? item.x + item.width : item.x,
    y: anchorY,
  }
}

function getTimelineLinkRoute(source: { x: number; y: number }, target: { x: number; y: number }) {
  if (Math.abs(source.x - target.x) < 1 || Math.abs(source.y - target.y) < 1) {
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
  }

  const elbowX = target.x

  return `M ${source.x} ${source.y} L ${elbowX} ${source.y} L ${target.x} ${target.y}`
}

function getTimelineEventStartValue(event: TimelineEvent, index: number) {
  return event.startValue ?? index
}

function getTimelineEventEndValue(event: TimelineEvent, index: number) {
  const startValue = getTimelineEventStartValue(event, index)
  if (event.endValue === null || event.endValue < startValue) {
    return startValue
  }

  return event.endValue
}

function formatTimelineTickLabel(value: number) {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return String(Math.round(value))
  }

  return value.toFixed(1).replace(/\.0$/, '')
}

function buildTimelineAxisTicks(timeScale: ScaleLinear<number, number>, canvasWidth: number, zoom: number) {
  const visibleStart = timeScale.invert(0)
  const visibleEnd = timeScale.invert(canvasWidth)
  const minValue = Math.min(visibleStart, visibleEnd)
  const maxValue = Math.max(visibleStart, visibleEnd)
  const pixelsPerValue = Math.abs(timeScale(1) - timeScale(0))
  const majorStep = getNiceTimelineStep(120 / Math.max(pixelsPerValue, 0.001))
  const minorCandidates = [5, 4, 2].map((division) => ({
    division,
    step: majorStep / division,
  }))
  const minorStep = zoom > 0.7
    ? minorCandidates.find((candidate) => candidate.step * pixelsPerValue >= 22)?.step ?? majorStep
    : majorStep
  const precision = Math.max(0, Math.ceil(-Math.log10(minorStep)) + 2)
  const firstValue = Math.ceil(minValue / minorStep) * minorStep
  const ticks: Array<{ kind: 'major' | 'minor'; label: string; value: number; x: number }> = []

  for (let value = firstValue; value <= maxValue + minorStep * 0.5; value += minorStep) {
    const normalizedValue = Number(value.toFixed(precision))
    if (normalizedValue < minValue - minorStep * 0.25 || normalizedValue > maxValue + minorStep * 0.25) {
      continue
    }

    const majorRatio = Math.abs(normalizedValue / majorStep - Math.round(normalizedValue / majorStep))
    const isMajor = majorRatio < 0.001 || Math.abs(normalizedValue - minValue) < minorStep * 0.25
    ticks.push({
      kind: isMajor ? 'major' : 'minor',
      label: isMajor ? formatTimelineTickLabel(normalizedValue) : '',
      value: normalizedValue,
      x: timeScale(normalizedValue),
    })
  }

  return ticks
}

function getNiceTimelineStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  const niceNormalized =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 5
          ? 5
          : 10

  return niceNormalized * magnitude
}




