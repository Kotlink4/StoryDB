import type { TimelineEvent, TimelineEventDraft } from '../../types'

export const toTimelineEventDraft = (event: TimelineEvent): TimelineEventDraft => ({
  title: event.title,
  eventType: event.eventType,
  parentEventId: event.parentEventId === null ? '' : String(event.parentEventId),
  description: event.description ?? '',
  startLabel: event.startLabel ?? '',
  endLabel: event.endLabel ?? '',
  startValue: event.startValue === null ? '' : String(event.startValue),
  endValue: event.endValue === null ? '' : String(event.endValue),
  category: event.category ?? '',
  color: event.color ?? '',
  imagePath: event.imagePath,
  participants: event.participants.map((participant) => ({
    targetType: participant.targetType,
    targetId: String(participant.targetId),
    role: participant.role ?? '',
  })),
  changes: event.changes.map((change) => ({
    changeType: change.changeType,
    targetType: change.targetType,
    targetId: String(change.targetId),
    fieldName: change.fieldName ?? change.fieldKey ?? '',
    oldValue: change.oldValueJson ?? '',
    newValue: change.newValueJson ?? '',
    notes: change.notes ?? '',
  })),
})
