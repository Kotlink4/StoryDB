import { updateTimelineEventRequest } from '../../api'
import type { TimelineEvent } from '../../types'
import { toTimelineEventDraft } from '../domain/stylePreviewTimelineDrafts'
import type { DraftTimelineParticipation } from '../domain/stylePreviewUiTypes'

export async function syncObjectTimelineParticipationsRequest(
  projectId: number,
  objectId: number,
  participations: DraftTimelineParticipation[],
  timelineEvents: TimelineEvent[],
) {
  const desiredRolesByEventId = new Map<number, string>()

  participations.forEach((participation) => {
    const eventId = Number(participation.timelineEventId)
    if (Number.isInteger(eventId) && eventId > 0) {
      desiredRolesByEventId.set(eventId, participation.role)
    }
  })

  const eventsToUpdate = timelineEvents.filter((event) => {
    const currentParticipant = event.participants.find(
      (participant) => participant.targetType === 'storyObject' && participant.targetId === objectId,
    )
    const nextRole = desiredRolesByEventId.get(event.id)

    if (currentParticipant === undefined) {
      return nextRole !== undefined
    }

    return nextRole === undefined || (currentParticipant.role ?? '') !== nextRole
  })

  if (eventsToUpdate.length === 0) {
    return []
  }

  return Promise.all(
    eventsToUpdate.map((event) => {
      const nextParticipants = event.participants
        .filter((participant) => !(participant.targetType === 'storyObject' && participant.targetId === objectId))
        .map((participant) => ({
          targetType: participant.targetType,
          targetId: String(participant.targetId),
          role: participant.role ?? '',
        }))
      const nextRole = desiredRolesByEventId.get(event.id)

      if (nextRole !== undefined) {
        nextParticipants.push({
          targetType: 'storyObject',
          targetId: String(objectId),
          role: nextRole,
        })
      }

      return updateTimelineEventRequest(projectId, event.id, {
        ...toTimelineEventDraft(event),
        participants: nextParticipants,
      })
    }),
  )
}
