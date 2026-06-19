import type {
  TimelineEvent,
  TimelineEventDraft,
  TimelineEventLink,
  TimelineEventLinkDraft,
  TimelineInfo,
  TimelineLayout,
  TimelineLayoutRules,
} from '../types'
import { apiBaseUrl, apiFetch, ensureOk } from './apiClient'

const normalizeTimelineNumber = (value: string) => {
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    return null
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

const toTimelinePayload = (draft: TimelineEventDraft) => {
  const isRangeEvent = draft.eventType === 'duration' || draft.eventType === 'era'
  const startLabel = draft.startLabel.trim() || null
  const endLabel = isRangeEvent ? draft.endLabel.trim() || null : null
  const startValue = normalizeTimelineNumber(draft.startValue)
  const endValue = isRangeEvent ? normalizeTimelineNumber(draft.endValue) : null

  return {
    title: draft.title.trim(),
    eventType: draft.eventType,
    parentEventId:
      draft.eventType === 'point' && draft.parentEventId.trim().length > 0
        ? Number(draft.parentEventId)
        : null,
    description: draft.description.trim() || null,
    startLabel,
    endLabel,
    startValue,
    endValue,
    category: draft.category.trim() || null,
    color: draft.color.trim() || null,
    imagePath: draft.imagePath,
    participants: draft.participants
      .map((participant) => ({
        targetType: participant.targetType,
        targetId: Number(participant.targetId),
        role: participant.role.trim() || null,
      }))
      .filter(
        (participant) =>
          participant.targetType.length > 0 &&
          Number.isInteger(participant.targetId) &&
          participant.targetId > 0,
      ),
    changes: draft.changes
      .map((change) => ({
        changeType: change.changeType,
        targetType: change.targetType,
        targetId: Number(change.targetId),
        fieldKey: change.fieldName.trim() || null,
        fieldName: change.fieldName.trim() || null,
        oldValueJson: change.oldValue.trim() || null,
        newValueJson: change.newValue.trim() || null,
        effectiveFromLabel: startLabel,
        effectiveToLabel: endLabel,
        effectiveFromValue: startValue,
        effectiveToValue: endValue,
        notes: change.notes.trim() || null,
      }))
      .filter(
        (change) =>
          change.changeType.length > 0 &&
          change.targetType.length > 0 &&
          Number.isInteger(change.targetId) &&
          change.targetId > 0,
      ),
  }
}

const toTimelineLinkPayload = (draft: TimelineEventLinkDraft) => ({
  sourceEventId: Number(draft.sourceEventId),
  targetEventId: Number(draft.targetEventId),
  linkType: draft.linkType,
  description: draft.description.trim() || null,
})

export const fetchTimelineInfo = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline`)
  await ensureOk(response, 'Failed to load timeline settings.')

  return (await response.json()) as TimelineInfo
}

export const updateTimelineInfoRequest = async (projectId: number, mode: TimelineInfo['mode'], name?: string) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, name: name ?? null }),
  })
  await ensureOk(response, 'Failed to update timeline settings.')

  return (await response.json()) as TimelineInfo
}

export const fetchTimelineLayout = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/layout`)
  await ensureOk(response, 'Failed to load timeline layout.')

  if (response.status === 204) {
    return null
  }

  const body = await response.text()
  if (body.trim().length === 0) {
    return null
  }

  return JSON.parse(body) as TimelineLayout | null
}

export const fetchTimelineLayoutRules = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/layout/rules`)
  await ensureOk(response, 'Failed to load timeline layout rules.')

  return (await response.json()) as TimelineLayoutRules
}

export const generateTimelineLayoutRequest = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/layout/generate`, {
    method: 'POST',
  })
  await ensureOk(response, 'Failed to generate timeline layout.')

  return (await response.json()) as TimelineLayout
}

export const fetchTimelineEvents = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events`)
  await ensureOk(response, 'Failed to load timeline events.')

  return (await response.json()) as TimelineEvent[]
}

export const fetchTimelineEventLinks = async (projectId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/links`)
  await ensureOk(response, 'Failed to load timeline event links.')

  return (await response.json()) as TimelineEventLink[]
}

export const createTimelineEventLinkRequest = async (projectId: number, draft: TimelineEventLinkDraft) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTimelineLinkPayload(draft)),
  })
  await ensureOk(response, 'Failed to create timeline event link.')

  return (await response.json()) as TimelineEventLink
}

export const deleteTimelineEventLinkRequest = async (projectId: number, linkId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/links/${linkId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete timeline event link.')
}

export const createTimelineEventRequest = async (projectId: number, draft: TimelineEventDraft) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTimelinePayload(draft)),
  })
  await ensureOk(response, 'Failed to create timeline event.')

  return (await response.json()) as TimelineEvent
}

export const updateTimelineEventRequest = async (
  projectId: number,
  eventId: number,
  draft: TimelineEventDraft,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toTimelinePayload(draft)),
  })
  await ensureOk(response, 'Failed to update timeline event.')

  return (await response.json()) as TimelineEvent
}

export const deleteTimelineEventRequest = async (projectId: number, eventId: number) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}`, {
    method: 'DELETE',
  })
  await ensureOk(response, 'Failed to delete timeline event.')
}

export const addTimelineEventGalleryImageRequest = async (
  projectId: number,
  eventId: number,
  imagePath: string,
  caption: string,
) => {
  const response = await apiFetch(`${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imagePath,
      caption: caption.trim() || null,
    }),
  })
  await ensureOk(response, 'Failed to add timeline event gallery image.')

  return (await response.json()) as TimelineEvent
}

export const deleteTimelineEventGalleryImageRequest = async (
  projectId: number,
  eventId: number,
  imageId: number,
) => {
  const response = await apiFetch(
    `${apiBaseUrl}/projects/${projectId}/timeline/events/${eventId}/gallery/${imageId}`,
    { method: 'DELETE' },
  )
  await ensureOk(response, 'Failed to delete timeline event gallery image.')

  return (await response.json()) as TimelineEvent
}
