import type {
  TimelineEvent,
  TimelineEventLink,
  TimelineLayoutItem,
} from '../../types'
import {
  getTimelineDetailLevel,
  getTimelineEventEndValue,
  getTimelineEventStartValue,
  type TimelineDetailLevel,
  type TimelineViewportModelRequest,
} from '../../timeline/timelineViewportModel'
import {
  getTimelineAnchor,
  getTimelineLinkRoute,
} from './timelinePageGeometry'

export const TIMELINE_MIN_DURATION_WIDTH = 8
export const TIMELINE_MIN_ZOOM = 0.2
export const TIMELINE_MAX_ZOOM = 8192
export const TIMELINE_ZOOM_STEP = 1.35
export const TIMELINE_AXIS_Y = 640
export const TIMELINE_VIEWPORT_OVERSCAN = 420

export type TimelineEventCounts = {
  chapter: number
  duration: number
  era: number
  point: number
}

export type TimelineLinkLine = {
  link: TimelineEventLink
  path: string
}

export type TimelineViewportMetrics = {
  detailLevel: TimelineDetailLevel
  effectiveViewportWidth: number
  pixelsPerYear: number
  visibleMaxX: number
  visibleMinX: number
}

export function buildTimelineEventCounts(events: TimelineEvent[]): TimelineEventCounts {
  return {
    era: events.filter((event) => event.eventType === 'era').length,
    duration: events.filter((event) => event.eventType === 'duration').length,
    point: events.filter((event) => event.eventType === 'point').length,
    chapter: events.filter((event) => event.eventType === 'chapter').length,
  }
}

export function buildRenderedTimelineLayoutItems({
  eventIndexesById,
  events,
  layoutItemsByEventId,
  timelineTimeScale,
}: {
  eventIndexesById: Map<number, number>
  events: TimelineEvent[]
  layoutItemsByEventId: Map<number, TimelineLayoutItem>
  timelineTimeScale: (value: number) => number
}) {
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
}

export function buildTimelineViewportMetrics({
  timelineTimeScale,
  viewportWidth,
}: {
  timelineTimeScale: (value: number) => number
  viewportWidth: number
}): TimelineViewportMetrics {
  const effectiveViewportWidth = Math.max(viewportWidth, 1)
  const visibleMinX = -TIMELINE_VIEWPORT_OVERSCAN
  const visibleMaxX = effectiveViewportWidth + TIMELINE_VIEWPORT_OVERSCAN
  const pixelsPerYear = Math.abs(timelineTimeScale(1) - timelineTimeScale(0))

  return {
    detailLevel: getTimelineDetailLevel(pixelsPerYear),
    effectiveViewportWidth,
    pixelsPerYear,
    visibleMaxX,
    visibleMinX,
  }
}

export function buildTimelineViewportRequest({
  detailLevel,
  events,
  renderedLayoutItemsByEventId,
  selectedEventId,
  visibleMaxX,
  visibleMinX,
}: {
  detailLevel: TimelineDetailLevel
  events: TimelineEvent[]
  renderedLayoutItemsByEventId: Map<number, TimelineLayoutItem>
  selectedEventId: number | null
  visibleMaxX: number
  visibleMinX: number
}): TimelineViewportModelRequest {
  return {
    detailLevel,
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
    selectedEventId,
    visibleMaxX,
    visibleMinX,
  }
}

export function buildTimelineLinkLines({
  clusteredEventIds,
  eventsById,
  links,
  renderedLayoutItemsByEventId,
  visibleEventIds,
}: {
  clusteredEventIds: Set<number>
  eventsById: Map<number, TimelineEvent>
  links: TimelineEventLink[]
  renderedLayoutItemsByEventId: Map<number, TimelineLayoutItem>
  visibleEventIds: Set<number> | null
}): TimelineLinkLine[] {
  return links
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

      return {
        link,
        path: getTimelineLinkRoute(
          getTimelineAnchor(source, sourceEvent?.eventType, target),
          getTimelineAnchor(target, targetEvent?.eventType, source),
        ),
      }
    })
    .filter((line): line is TimelineLinkLine => line !== null)
}
