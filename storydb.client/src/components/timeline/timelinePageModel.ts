import type {
  TimelineEvent,
  TimelineEventLink,
  TimelineLayoutItem,
} from '../../types'
import {
  getTimelineAnchor,
  getTimelineLinkRoute,
} from './timelinePageGeometry'

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

export function buildTimelineEventCounts(events: TimelineEvent[]): TimelineEventCounts {
  return {
    era: events.filter((event) => event.eventType === 'era').length,
    duration: events.filter((event) => event.eventType === 'duration').length,
    point: events.filter((event) => event.eventType === 'point').length,
    chapter: events.filter((event) => event.eventType === 'chapter').length,
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
