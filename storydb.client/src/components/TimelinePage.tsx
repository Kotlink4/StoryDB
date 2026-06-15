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
import {
  buildTimelineViewportModel,
  formatTimelineClusterCount,
  formatTimelineTickLabel,
  getTimelineDetailLevel,
  getTimelineEventEndValue,
  getTimelineEventStartValue,
  type TimelineViewportCluster,
  type TimelineViewportModel,
  type TimelineViewportModelRequest,
} from '../timeline/timelineViewportModel'
import type {
  TimelineEvent,
  TimelineEventLink,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutItem,
  TimelineLayoutRules,
} from '../types'
import TimelineViewportWorker from '../workers/timelineViewportWorker?worker'

const TIMELINE_DURATION_TITLE_HEIGHT = 34
const TIMELINE_DURATION_POINT_BAND_HEIGHT = 30
const TIMELINE_MIN_DURATION_WIDTH = 8
const TIMELINE_MIN_ZOOM = 0.2
const TIMELINE_MAX_ZOOM = 8192
const TIMELINE_ZOOM_STEP = 1.35
const TIMELINE_DAYS_PER_YEAR = 365
const TIMELINE_AXIS_Y = 640
const TIMELINE_CHAPTER_LANE_Y = TIMELINE_AXIS_Y + 34
const TIMELINE_ERA_LABEL_Y = TIMELINE_AXIS_Y + 108
const TIMELINE_VIEWPORT_OVERSCAN = 420
const TIMELINE_SCALE_PRESETS = [
  { key: 'century', pixelsPerYear: 3 },
  { key: 'decade', pixelsPerYear: 14 },
  { key: 'years', pixelsPerYear: 48 },
  { key: 'months', pixelsPerYear: 180 },
  { key: 'days', pixelsPerYear: 5200 },
] as const
const TIMELINE_MONTHS = [
  { label: 'янв', days: 31 },
  { label: 'фев', days: 28 },
  { label: 'мар', days: 31 },
  { label: 'апр', days: 30 },
  { label: 'май', days: 31 },
  { label: 'июн', days: 30 },
  { label: 'июл', days: 31 },
  { label: 'авг', days: 31 },
  { label: 'сен', days: 30 },
  { label: 'окт', days: 31 },
  { label: 'ноя', days: 30 },
  { label: 'дек', days: 31 },
] as const

type TimelineScalePresetKey = typeof TIMELINE_SCALE_PRESETS[number]['key']

export type TimelinePageProps = {
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
}

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
}: TimelinePageProps) {
  const timelineViewportRef = useRef<HTMLDivElement | null>(null)
  const timelineZoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null)
  const timelineWorkerRef = useRef<Worker | null>(null)
  const timelineWorkerRequestIdRef = useRef(0)
  const [timelineTransform, setTimelineTransform] = useState<ZoomTransform>(zoomIdentity)
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0)
  const [timelineViewportModel, setTimelineViewportModel] = useState<TimelineViewportModel | null>(null)
  const [isTimelinePanning, setIsTimelinePanning] = useState(false)
  const [isLinksPopoverOpen, setIsLinksPopoverOpen] = useState(false)
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null)
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
  const baseTimelineHeight = Math.max(
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
  const basePixelsPerYear = Math.abs(baseTimeScale(1) - baseTimeScale(0))
  const timelineTimeScale = useMemo(
    () => timelineTransform.rescaleX(baseTimeScale),
    [baseTimeScale, timelineTransform],
  )
  const effectiveViewportWidth = Math.max(timelineViewportWidth, 1)
  const visibleMinX = -TIMELINE_VIEWPORT_OVERSCAN
  const visibleMaxX = effectiveViewportWidth + TIMELINE_VIEWPORT_OVERSCAN
  const pixelsPerYear = Math.abs(timelineTimeScale(1) - timelineTimeScale(0))
  const timelineDetailLevel = getTimelineDetailLevel(pixelsPerYear)
  const activeScalePresetKey = getActiveTimelineScalePresetKey(pixelsPerYear)
  const axisTicks = buildTimelineAxisTicks(timelineTimeScale, visibleMaxX, timelineZoom)
  const storyStartX = timelineTimeScale(0)
  const renderedLayoutItemsByEventId = useMemo(() => {
    if (layout === null) {
      return new Map<number, TimelineLayoutItem>()
    }

    const renderedItems = new Map<number, TimelineLayoutItem>(
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
            : Math.max(TIMELINE_MIN_DURATION_WIDTH, Math.abs(endX - startX))
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

    return renderedItems
  }, [eventIndexesById, events, layout, layoutItemsByEventId, timelineTimeScale])
  const timelineViewportRequest = useMemo<TimelineViewportModelRequest>(() => ({
    detailLevel: timelineDetailLevel,
    events: events.map((event) => ({
      category: event.category,
      color: event.color,
      endValue: event.endValue,
      eventType: event.eventType,
      id: event.id,
      startLabel: event.startLabel,
      startValue: event.startValue,
      title: event.title,
    })),
    items: Array.from(renderedLayoutItemsByEventId.values()).map((item) => ({
      height: item.height,
      layer: item.layer,
      timelineEventId: item.timelineEventId,
      width: item.width,
      x: item.x,
      y: item.y,
    })),
    selectedEventId: selectedEvent?.id ?? null,
    visibleMaxX,
    visibleMinX,
  }), [events, renderedLayoutItemsByEventId, selectedEvent, timelineDetailLevel, visibleMaxX, visibleMinX])
  const timelineClusters = useMemo(
    () => hydrateTimelineClusters(timelineViewportModel?.clusters ?? [], eventsById),
    [eventsById, timelineViewportModel],
  )
  const clusteredEventIds = useMemo(
    () => new Set(timelineClusters.flatMap((cluster) => Array.from(cluster.eventIds))),
    [timelineClusters],
  )
  const visibleEventIds = useMemo(
    () => timelineViewportModel === null ? null : new Set(timelineViewportModel.visibleEventIds),
    [timelineViewportModel],
  )
  const visibleTimelineEvents = useMemo(
    () => visibleEventIds === null
      ? events.filter((event) => !clusteredEventIds.has(event.id) || selectedEvent?.id === event.id)
      : events.filter((event) => visibleEventIds.has(event.id)),
    [clusteredEventIds, events, selectedEvent, visibleEventIds],
  )
  const activeCluster = timelineClusters.find((cluster) => cluster.id === activeClusterId) ?? null
  const timelineHeight = Math.max(
    baseTimelineHeight,
    ...Array.from(renderedLayoutItemsByEventId.values()).map((item) => item.y + item.height + 140),
  )
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
            if (clusteredEventIds.has(link.sourceEventId) || clusteredEventIds.has(link.targetEventId)) {
              return null
            }

            if (
              visibleEventIds !== null &&
              (!visibleEventIds.has(link.sourceEventId) || !visibleEventIds.has(link.targetEventId))
            ) {
              return null
            }

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

    const updateViewportWidth = () => {
      setTimelineViewportWidth(viewport.getBoundingClientRect().width)
    }
    const observer = new ResizeObserver(updateViewportWidth)

    updateViewportWidth()
    observer.observe(viewport)

    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const worker = new TimelineViewportWorker()

    timelineWorkerRef.current = worker
    worker.onmessage = (event: MessageEvent<{ model: TimelineViewportModel; requestId: number }>) => {
      if (event.data.requestId === timelineWorkerRequestIdRef.current) {
        setTimelineViewportModel(event.data.model)
      }
    }

    return () => {
      worker.terminate()
      timelineWorkerRef.current = null
    }
  }, [])
  useEffect(() => {
    if (layout === null) {
      setTimelineViewportModel(null)
      return
    }

    const worker = timelineWorkerRef.current
    if (worker === null) {
      setTimelineViewportModel(buildTimelineViewportModel(timelineViewportRequest))
      return
    }

    const requestId = timelineWorkerRequestIdRef.current + 1
    timelineWorkerRequestIdRef.current = requestId
    worker.postMessage({
      payload: timelineViewportRequest,
      requestId,
    })
  }, [layout, timelineViewportRequest])
  useEffect(() => {
    if (activeClusterId !== null && !timelineClusters.some((cluster) => cluster.id === activeClusterId)) {
      setActiveClusterId(null)
    }
  }, [activeClusterId, timelineClusters])
  useEffect(() => {
    const viewport = timelineViewportRef.current
    if (viewport === null) {
      return undefined
    }

    const behavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([TIMELINE_MIN_ZOOM, TIMELINE_MAX_ZOOM])
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
    const clampedZoom = Math.min(TIMELINE_MAX_ZOOM, Math.max(TIMELINE_MIN_ZOOM, nextZoom))
    behavior.scaleTo(select(viewport), clampedZoom, [rect.width / 2, rect.height / 2])
  }, [])
  const zoomTimelineToPixelsPerYear = useCallback((nextPixelsPerYear: number) => {
    const viewport = timelineViewportRef.current
    const behavior = timelineZoomBehaviorRef.current
    if (viewport === null || behavior === null) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    const nextZoom = Math.min(
      TIMELINE_MAX_ZOOM,
      Math.max(TIMELINE_MIN_ZOOM, nextPixelsPerYear / Math.max(basePixelsPerYear, 0.001)),
    )
    const centerTimeValue = timelineTimeScale.invert(rect.width / 2)
    const centeredX = rect.width / 2 - baseTimeScale(centerTimeValue) * nextZoom
    const centeredY = rect.height / 2 - TIMELINE_AXIS_Y
    const nextTransform = zoomIdentity.translate(centeredX, centeredY).scale(nextZoom)

    behavior.transform(select(viewport), nextTransform)
  }, [basePixelsPerYear, baseTimeScale, timelineTimeScale])
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
      <div className={`sp-timeline is-${timelineDetailLevel}`}>
        <div className="sp-timeline-tools">
          <div className="sp-timeline-scale-presets" aria-label={ui.timelineScalePresets}>
            {TIMELINE_SCALE_PRESETS.map((preset) => (
              <button
                className={activeScalePresetKey === preset.key ? 'is-active' : ''}
                key={preset.key}
                type="button"
                onClick={() => zoomTimelineToPixelsPerYear(preset.pixelsPerYear)}
              >
                {getTimelineScalePresetLabel(preset.key, ui)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => zoomTimeline(timelineZoom / TIMELINE_ZOOM_STEP)} title={ui.zoomOut}>
            -
          </button>
          <strong>{Math.round(timelineZoom * 100)}%</strong>
          <button type="button" onClick={() => zoomTimeline(timelineZoom * TIMELINE_ZOOM_STEP)} title={ui.zoomIn}>
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
            timelineClusters.map((cluster) => {
              const clusterStyle = {
                '--event-color': cluster.color,
                height: `${cluster.size}px`,
                left: `${cluster.x - cluster.size / 2}px`,
                top: `${cluster.y - cluster.size / 2}px`,
                width: `${cluster.size}px`,
              } as CSSProperties

              return (
                <button
                  className={`sp-timeline-cluster ${activeClusterId === cluster.id ? 'is-open' : ''}`}
                  key={cluster.id}
                  style={clusterStyle}
                  type="button"
                  onClick={() => setActiveClusterId((currentId) => (currentId === cluster.id ? null : cluster.id))}
                >
                  <strong>{cluster.events.length}</strong>
                  <span>{cluster.label}</span>
                </button>
              )
            })}
          {activeCluster !== null && (
            <div
              className="sp-timeline-cluster-popover"
              style={{
                left: `${activeCluster.x}px`,
                top: `${Math.max(24, activeCluster.y - activeCluster.size / 2 - 12)}px`,
              }}
            >
              <div>
                <strong>{formatTimelineClusterCount(activeCluster.events.length, ui)}</strong>
                <button className="sp-icon-button" type="button" onClick={() => setActiveClusterId(null)}>
                  x
                </button>
              </div>
              {activeCluster.events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setActiveClusterId(null)
                    onSelectEvent(event.id)
                  }}
                >
                  <i style={{ background: event.color ?? getTimelineEventColor(event.eventType) }} />
                  <span>{event.title}</span>
                  <em>{event.startLabel ?? event.category ?? getTimelineEventTypeLabel(event.eventType, ui)}</em>
                </button>
              ))}
            </div>
          )}
          {layout !== null &&
            visibleTimelineEvents.map((event) => {
              const item = renderedLayoutItemsByEventId.get(event.id)
              if (item === undefined) {
                return null
              }
              const timeLabel = [event.startLabel, event.endLabel].filter(Boolean).join(' - ') ||
                event.category ||
                getTimelineEventTypeLabel(event.eventType, ui)
              const isCompactDuration =
                event.eventType === 'duration' &&
                (item.width < 180 || timelineZoom < 0.7)
              const isCompactPoint = event.eventType === 'point' && timelineZoom < 0.75
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
                '--chapter-lane-y': `${TIMELINE_CHAPTER_LANE_Y}px`,
                '--era-label-y': `${TIMELINE_ERA_LABEL_Y}px`,
                height: event.eventType === 'era' ? `${timelineHeight}px` : `${item.height}px`,
                left: `${item.x}px`,
                top: getTimelineEventRenderTop(event.eventType, item),
                width: `${item.width}px`,
                zIndex: eventZIndex,
              } as CSSProperties

              return (
                <article
                  className={`sp-timeline-item ${event.eventType}${isCompactDuration ? ' is-compact' : ''}${isCompactPoint ? ' is-compact' : ''}${selectedEvent?.id === event.id ? ' is-selected' : ''}`}
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

function hydrateTimelineClusters(clusters: TimelineViewportCluster[], eventsById: Map<number, TimelineEvent>) {
  return clusters.map((cluster) => ({
    ...cluster,
    eventIds: new Set(cluster.eventIds),
    events: cluster.eventIds
      .map((eventId) => eventsById.get(eventId))
      .filter((event): event is TimelineEvent => event !== undefined),
  }))
}

function getActiveTimelineScalePresetKey(pixelsPerYear: number): TimelineScalePresetKey {
  if (pixelsPerYear >= 720) {
    return 'days'
  }

  if (pixelsPerYear >= 120) {
    return 'months'
  }

  if (pixelsPerYear >= 28) {
    return 'years'
  }

  if (pixelsPerYear >= 8) {
    return 'decade'
  }

  return 'century'
}

function getTimelineScalePresetLabel(presetKey: TimelineScalePresetKey, ui: PreviewText) {
  if (presetKey === 'days') {
    return ui.timelineScaleDays
  }

  if (presetKey === 'months') {
    return ui.timelineScaleMonths
  }

  if (presetKey === 'years') {
    return ui.timelineScaleYears
  }

  if (presetKey === 'decade') {
    return ui.timelineScaleDecade
  }

  return ui.timelineScaleCentury
}

function getTimelineEventRenderTop(eventType: TimelineEvent['eventType'], item: TimelineLayoutItem) {
  if (eventType === 'era') {
    return '0px'
  }

  if (eventType === 'chapter') {
    return `${TIMELINE_CHAPTER_LANE_Y}px`
  }

  return `${item.y}px`
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

function buildTimelineAxisTicks(timeScale: ScaleLinear<number, number>, canvasWidth: number, zoom: number) {
  const visibleStart = timeScale.invert(0)
  const visibleEnd = timeScale.invert(canvasWidth)
  const minValue = Math.min(visibleStart, visibleEnd)
  const maxValue = Math.max(visibleStart, visibleEnd)
  const pixelsPerValue = Math.abs(timeScale(1) - timeScale(0))

  if (pixelsPerValue >= 120) {
    return buildCalendarTimelineAxisTicks(timeScale, minValue, maxValue, pixelsPerValue)
  }

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

function buildCalendarTimelineAxisTicks(
  timeScale: ScaleLinear<number, number>,
  minValue: number,
  maxValue: number,
  pixelsPerYear: number,
) {
  const monthStarts = getTimelineMonthStarts()
  const visibleSpan = maxValue - minValue
  const dayPixelWidth = pixelsPerYear / TIMELINE_DAYS_PER_YEAR
  const showMonthLabels = pixelsPerYear >= 120
  const showMonthYear = visibleSpan <= 1.25
  const showDayTicks = dayPixelWidth >= 7
  const showDayLabels = dayPixelWidth >= 14
  const dayStep = getTimelineDayStep(84 / Math.max(dayPixelWidth, 0.001))
  const firstYear = Math.floor(minValue) - 1
  const lastYear = Math.ceil(maxValue) + 1
  const ticks: Array<{ kind: 'major' | 'minor' | 'month' | 'day'; label: string; value: number; x: number }> = []
  const pushedValues = new Set<string>()

  const pushTick = (kind: 'major' | 'minor' | 'month' | 'day', value: number, label: string) => {
    if (value < minValue - 0.001 || value > maxValue + 0.001) {
      return
    }

    const key = value.toFixed(6)
    if (pushedValues.has(key)) {
      return
    }

    pushedValues.add(key)
    ticks.push({
      kind,
      label,
      value,
      x: timeScale(value),
    })
  }

  for (let year = firstYear; year <= lastYear; year += 1) {
    pushTick('major', year, String(year))

    for (let monthIndex = 1; monthIndex < TIMELINE_MONTHS.length; monthIndex += 1) {
      const monthValue = year + monthStarts[monthIndex] / TIMELINE_DAYS_PER_YEAR
      const monthLabel = showMonthYear
        ? `${TIMELINE_MONTHS[monthIndex].label} ${year}`
        : TIMELINE_MONTHS[monthIndex].label
      pushTick('month', monthValue, showMonthLabels ? monthLabel : '')
    }

    if (!showDayTicks) {
      continue
    }

    for (let monthIndex = 0; monthIndex < TIMELINE_MONTHS.length; monthIndex += 1) {
      const month = TIMELINE_MONTHS[monthIndex]
      const monthStart = monthStarts[monthIndex]
      for (let day = 1; day <= month.days; day += dayStep) {
        if (day === 1) {
          continue
        }

        const dayValue = year + (monthStart + day - 1) / TIMELINE_DAYS_PER_YEAR
        pushTick('day', dayValue, showDayLabels ? String(day) : '')
      }
    }
  }

  return ticks.sort((left, right) => left.value - right.value)
}

function getTimelineMonthStarts() {
  let currentDay = 0
  return TIMELINE_MONTHS.map((month) => {
    const monthStart = currentDay
    currentDay += month.days
    return monthStart
  })
}

function getTimelineDayStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 1) {
    return 1
  }

  if (rawStep <= 2) {
    return 2
  }

  if (rawStep <= 5) {
    return 5
  }

  if (rawStep <= 10) {
    return 10
  }

  if (rawStep <= 15) {
    return 15
  }

  return 30
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




