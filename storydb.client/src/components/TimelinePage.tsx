import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import {
  getTimelineEventColor,
  getTimelineEventTypeLabel,
} from '../style-preview/domain/timelineDisplay'
import {
  buildTimelineViewportModel,
  formatTimelineClusterCount,
  type TimelineViewportModel,
} from '../timeline/timelineViewportModel'
import type {
  TimelineEvent,
  TimelineEventLink,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
} from '../types'
import {
  buildTimelineAxisTicks,
  getActiveTimelineScalePresetKey,
  getTimelineEventRenderTop,
  getTimelineScalePresetLabel,
  hydrateTimelineClusters,
  TIMELINE_CHAPTER_LANE_Y,
  TIMELINE_DEFAULT_PIXELS_PER_YEAR,
  TIMELINE_ERA_LABEL_Y,
  TIMELINE_SCALE_PRESETS,
} from './timeline/timelinePageGeometry'
import {
  buildTimelineEventCounts,
  buildTimelineLinkLines,
  buildRenderedTimelineLayoutItems,
  buildTimelineViewportMetrics,
  buildTimelineViewportRequest,
  TIMELINE_AXIS_Y,
  TIMELINE_MAX_ZOOM,
  TIMELINE_MIN_ZOOM,
  TIMELINE_ZOOM_STEP,
} from './timeline/timelinePageModel'
import { TimelinePageHeader } from './timeline/TimelinePageHeader'
import { TimelineLinksPopover } from './timeline/TimelineLinksPopover'
import TimelineViewportWorker from '../workers/timelineViewportWorker?worker'

export type TimelinePageProps = {
  canEdit: boolean
  events: TimelineEvent[]
  isGenerating: boolean
  layout: TimelineLayout | null
  layoutRules: TimelineLayoutRules | null
  links: TimelineEventLink[]
  selectedEvent: TimelineEvent | null
  timeline: TimelineInfo | null
  ui: PreviewText
  onCreate?: () => void
  onCreateLink?: () => void
  onDeleteLink: (linkId: number) => void
  onGenerate?: () => void
  onSelectEvent: (eventId: number) => void
}

export function TimelinePage({
  canEdit,
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
  const hasInitializedTimelineScaleRef = useRef(false)
  const [timelineTransform, setTimelineTransform] = useState<ZoomTransform>(zoomIdentity)
  const [timelineViewportWidth, setTimelineViewportWidth] = useState(0)
  const [timelineViewportModel, setTimelineViewportModel] = useState<TimelineViewportModel | null>(null)
  const [isTimelinePanning, setIsTimelinePanning] = useState(false)
  const [isLinksPopoverOpen, setIsLinksPopoverOpen] = useState(false)
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null)
  const selectedEventId = selectedEvent?.id ?? null
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
  const viewportMetrics = buildTimelineViewportMetrics({
    timelineTimeScale,
    viewportWidth: timelineViewportWidth,
  })
  const {
    detailLevel: timelineDetailLevel,
    pixelsPerYear,
    visibleMaxX,
    visibleMinX,
  } = viewportMetrics
  const timelineScalePercent = Math.round((pixelsPerYear / TIMELINE_DEFAULT_PIXELS_PER_YEAR) * 100)
  const activeScalePresetKey = getActiveTimelineScalePresetKey(pixelsPerYear)
  const axisTicks = buildTimelineAxisTicks(timelineTimeScale, visibleMaxX, timelineZoom)
  const storyStartX = timelineTimeScale(0)
  const renderedLayoutItemsByEventId = useMemo(() => {
    if (layout === null) {
      return new Map()
    }

    return buildRenderedTimelineLayoutItems({
      eventIndexesById,
      events,
      layoutItemsByEventId,
      timelineTimeScale,
    })
  }, [eventIndexesById, events, layout, layoutItemsByEventId, timelineTimeScale])
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
  const eventCounts = useMemo(() => buildTimelineEventCounts(events), [events])
  const linkLines = useMemo(() =>
    layout === null
      ? []
      : buildTimelineLinkLines({
          clusteredEventIds,
          eventsById,
          links,
          renderedLayoutItemsByEventId,
          visibleEventIds,
        }),
    [clusteredEventIds, eventsById, layout, links, renderedLayoutItemsByEventId, visibleEventIds],
  )
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

    const timelineViewportRequest = buildTimelineViewportRequest({
      detailLevel: timelineDetailLevel,
      events,
      renderedLayoutItemsByEventId,
      selectedEventId,
      visibleMaxX,
      visibleMinX,
    })
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
  }, [
    events,
    layout,
    renderedLayoutItemsByEventId,
    selectedEventId,
    timelineDetailLevel,
    visibleMaxX,
    visibleMinX,
  ])
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
    zoomTimelineToPixelsPerYear(TIMELINE_DEFAULT_PIXELS_PER_YEAR)
  }, [zoomTimelineToPixelsPerYear])
  useEffect(() => {
    if (hasInitializedTimelineScaleRef.current || timelineViewportWidth <= 0) {
      return
    }

    if (timelineViewportRef.current === null || timelineZoomBehaviorRef.current === null) {
      return
    }

    hasInitializedTimelineScaleRef.current = true
    zoomTimelineToPixelsPerYear(TIMELINE_DEFAULT_PIXELS_PER_YEAR)
  }, [timelineViewportWidth, zoomTimelineToPixelsPerYear])
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
      <TimelinePageHeader
        canEdit={canEdit}
        eventCount={events.length}
        eventCounts={eventCounts}
        isGenerating={isGenerating}
        isLinksPopoverOpen={isLinksPopoverOpen}
        layoutButtonLabel={layoutButtonLabel}
        layoutSourceStatus={layoutSourceStatus}
        linkCount={links.length}
        modeLabel={modeLabel}
        timelineStatus={timelineStatus}
        ui={ui}
        onCreate={onCreate}
        onCreateLink={onCreateLink}
        onGenerate={onGenerate}
        onToggleLinksPopover={() => setIsLinksPopoverOpen((value) => !value)}
      />
      {isLinksPopoverOpen && (
        <TimelineLinksPopover
          eventsById={eventsById}
          links={links}
          ui={ui}
          onClose={() => setIsLinksPopoverOpen(false)}
          onDeleteLink={onDeleteLink}
          onSelectEvent={onSelectEvent}
        />
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
          <strong>{timelineScalePercent}%</strong>
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
                  ) : event.eventType === 'era' ? (
                    <button
                      className="sp-timeline-era-label"
                      type="button"
                      aria-label={`${event.title}: ${timeLabel}`}
                      onClick={() => onSelectEvent(event.id)}
                    >
                      <strong>{event.title}</strong>
                      <span>{timeLabel}</span>
                    </button>
                  ) : (
                    <>
                      <i className="sp-timeline-item-marker" />
                      <strong>{event.title}</strong>
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

