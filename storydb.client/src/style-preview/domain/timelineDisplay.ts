import { timelineEventColorTokens } from './styleRuntimeTokens'
import type { PreviewText } from './stylePreviewI18n'
import type { TimelineEvent, TimelineEventLink } from '../../types'

export function getTimelineEventTypeLabel(eventType: TimelineEvent['eventType'], ui: PreviewText) {
  if (eventType === 'duration') {
    return ui.timelineEventTypeDuration
  }

  if (eventType === 'era') {
    return ui.timelineEventTypeEra
  }

  if (eventType === 'chapter') {
    return ui.timelineEventTypeChapter
  }

  return ui.timelineEventTypePoint
}

export function getTimelineEventColor(eventType: TimelineEvent['eventType']) {
  return timelineEventColorTokens[eventType]
}

export function getTimelineLinkTypeLabel(linkType: TimelineEventLink['linkType'], ui: PreviewText) {
  if (linkType === 'precedes') {
    return ui.timelineLinkPrecedes
  }

  if (linkType === 'causes') {
    return ui.timelineLinkCauses
  }

  if (linkType === 'simultaneous') {
    return ui.timelineLinkSimultaneous
  }

  if (linkType === 'partOf') {
    return ui.timelineLinkPartOf
  }

  return ui.timelineLinkRelated
}

export function formatTimelineChangeValue(value: string | null, ui: PreviewText) {
  if (value === null || value.trim().length === 0) {
    return '-'
  }

  try {
    const parsedValue = JSON.parse(value) as unknown

    if (Array.isArray(parsedValue)) {
      return parsedValue.length === 0 ? '[]' : `${parsedValue.length} ${ui.recordsCount}`
    }

    if (typeof parsedValue === 'object' && parsedValue !== null) {
      return JSON.stringify(parsedValue)
    }
  } catch {
    // Timeline changes can store either plain text or JSON snapshots.
  }

  return value
}
