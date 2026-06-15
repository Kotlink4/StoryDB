import { getTimelineEventColor } from '../style-preview/domain/timelineDisplay'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'

import type { TimelineEvent, TimelineLayoutItem } from '../types'

export const TIMELINE_CLUSTER_AXIS_Y = 640
export const TIMELINE_CLUSTER_MIN_SIZE = 28
export const TIMELINE_CLUSTER_MAX_SIZE = 46

export type TimelineDetailLevel = 'overview' | 'years' | 'months' | 'days'

export type TimelineViewportEvent = Pick<
  TimelineEvent,
  'category' | 'color' | 'endValue' | 'eventType' | 'id' | 'startLabel' | 'startValue' | 'title'
>

export type TimelineViewportItem = Pick<
  TimelineLayoutItem,
  'height' | 'layer' | 'timelineEventId' | 'width' | 'x' | 'y'
>

export type TimelineViewportCluster = {
  color: string
  eventIds: number[]
  id: string
  label: string
  size: number
  x: number
  y: number
}

export type TimelineViewportModel = {
  clusters: TimelineViewportCluster[]
  visibleEventIds: number[]
}

export type TimelineViewportModelRequest = {
  detailLevel: TimelineDetailLevel
  events: TimelineViewportEvent[]
  items: TimelineViewportItem[]
  selectedEventId: number | null
  visibleMaxX: number
  visibleMinX: number
}

export function getTimelineDetailLevel(pixelsPerYear: number): TimelineDetailLevel {
  if (pixelsPerYear >= 720) {
    return 'days'
  }

  if (pixelsPerYear >= 120) {
    return 'months'
  }

  if (pixelsPerYear >= 6) {
    return 'years'
  }

  return 'overview'
}

export function buildTimelineViewportModel(request: TimelineViewportModelRequest): TimelineViewportModel {
  const eventsById = new Map(request.events.map((event) => [event.id, event]))
  const itemsByEventId = new Map(request.items.map((item) => [item.timelineEventId, item]))
  const eventIndexesById = new Map(request.events.map((event, index) => [event.id, index]))
  const clusters = buildTimelineClusters(request.events, itemsByEventId, eventIndexesById, request.detailLevel)
    .filter((cluster) =>
      cluster.x + cluster.size / 2 >= request.visibleMinX &&
      cluster.x - cluster.size / 2 <= request.visibleMaxX)
  const clusteredEventIds = new Set(clusters.flatMap((cluster) => cluster.eventIds))
  const visibleEventIds = request.events
    .filter((event) => {
      if (event.id === request.selectedEventId) {
        return true
      }

      if (clusteredEventIds.has(event.id)) {
        return false
      }

      const item = itemsByEventId.get(event.id)
      if (item === undefined) {
        return false
      }

      return isTimelineItemVisible(event, item, request.visibleMinX, request.visibleMaxX, eventsById)
    })
    .map((event) => event.id)

  return {
    clusters,
    visibleEventIds,
  }
}

export function getTimelineEventStartValue(event: Pick<TimelineEvent, 'startValue'>, index: number) {
  return event.startValue ?? index
}

export function getTimelineEventEndValue(event: Pick<TimelineEvent, 'endValue' | 'startValue'>, index: number) {
  const startValue = getTimelineEventStartValue(event, index)
  if (event.endValue === null || event.endValue < startValue) {
    return startValue
  }

  return event.endValue
}

export function formatTimelineTickLabel(value: number) {
  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return String(Math.round(value))
  }

  return value.toFixed(1).replace(/\.0$/, '')
}

export function formatTimelineClusterCount(count: number, ui: PreviewText) {
  const lastTwoDigits = count % 100
  const lastDigit = count % 10
  const label =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? ui.timelineClusterEventMany
      : lastDigit === 1
        ? ui.timelineClusterEventOne
        : lastDigit >= 2 && lastDigit <= 4
          ? ui.timelineClusterEventFew
          : ui.timelineClusterEventMany

  return `${count} ${label}`
}

function buildTimelineClusters(
  events: TimelineViewportEvent[],
  renderedItemsByEventId: Map<number, TimelineViewportItem>,
  eventIndexesById: Map<number, number>,
  detailLevel: TimelineDetailLevel,
) {
  const clusterDistance = detailLevel === 'overview'
    ? 96
    : detailLevel === 'years'
      ? 56
      : 0

  if (clusterDistance <= 0) {
    return []
  }

  const clusterCandidates = events
    .flatMap((event) => {
      const item = renderedItemsByEventId.get(event.id)
      if (item === undefined || event.eventType === 'era') {
        return []
      }

      if (event.eventType === 'duration' && item.width > clusterDistance * 1.35) {
        return []
      }

      return [{
        centerX: item.x + item.width / 2,
        event,
        item,
        lane: Math.round(item.y / 48),
        timeValue: getTimelineEventStartValue(event, eventIndexesById.get(event.id) ?? 0),
      }]
    })
    .sort((left, right) => left.lane - right.lane || left.centerX - right.centerX)
  const clusters: TimelineViewportCluster[] = []
  let currentGroup: typeof clusterCandidates = []

  const flushGroup = () => {
    if (currentGroup.length < 2) {
      currentGroup = []
      return
    }

    const sortedGroup = [...currentGroup].sort((left, right) => left.timeValue - right.timeValue)
    const averageX = sortedGroup.reduce((sum, entry) => sum + entry.centerX, 0) / sortedGroup.length
    const averageY = sortedGroup.reduce((sum, entry) => sum + entry.item.y + entry.item.height / 2, 0) / sortedGroup.length
    const primaryEntry = sortedGroup.find((entry) => entry.event.eventType === 'duration') ?? sortedGroup[0]
    const eventIds = sortedGroup.map((entry) => entry.event.id)
    const size = Math.min(
      TIMELINE_CLUSTER_MAX_SIZE,
      TIMELINE_CLUSTER_MIN_SIZE + Math.max(0, sortedGroup.length - 2) * 4,
    )

    clusters.push({
      color: primaryEntry.event.color ?? getTimelineEventColor(primaryEntry.event.eventType),
      eventIds,
      id: `cluster-${detailLevel}-${sortedGroup[0].lane}-${sortedGroup[0].event.id}-${sortedGroup.at(-1)?.event.id ?? ''}`,
      label: formatTimelineClusterLabel(sortedGroup[0].timeValue, sortedGroup.at(-1)?.timeValue ?? sortedGroup[0].timeValue),
      size,
      x: averageX,
      y: Math.min(TIMELINE_CLUSTER_AXIS_Y - 28, averageY),
    })
    currentGroup = []
  }

  for (const candidate of clusterCandidates) {
    const previous = currentGroup.at(-1)
    if (previous === undefined || previous.lane === candidate.lane && candidate.centerX - previous.centerX <= clusterDistance) {
      currentGroup.push(candidate)
      continue
    }

    flushGroup()
    currentGroup.push(candidate)
  }

  flushGroup()

  return clusters
}

function isTimelineItemVisible(
  event: TimelineViewportEvent,
  item: TimelineViewportItem,
  visibleMinX: number,
  visibleMaxX: number,
  eventsById: Map<number, TimelineViewportEvent>,
) {
  if (event.eventType === 'era') {
    return true
  }

  const itemMinX = item.x
  const itemMaxX = item.x + item.width
  if (itemMaxX >= visibleMinX && itemMinX <= visibleMaxX) {
    return true
  }

  const linkedEvent = eventsById.get(event.id)
  return linkedEvent?.eventType === 'duration' && item.width >= visibleMaxX - visibleMinX
}

function formatTimelineClusterLabel(startValue: number, endValue: number) {
  if (Math.abs(startValue - endValue) < 0.001) {
    return formatTimelineTickLabel(startValue)
  }

  return `${formatTimelineTickLabel(startValue)} - ${formatTimelineTickLabel(endValue)}`
}
