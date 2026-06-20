import type { Dispatch, SetStateAction } from 'react'

import { updateTimelineEventRequest } from '../../api'
import { buildObjectTimelineChanges } from '../domain/objectTimelineChanges'
import { toTimelineEventDraft } from '../domain/stylePreviewTimelineDrafts'
import type {
  DraftTimelineParticipation,
} from '../domain/stylePreviewUiTypes'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type {
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  StoryObject,
  TimelineEvent,
  TimelineLayout,
} from '../../types'

type ObjectTimelineChangeMessages = {
  projectTimelineChangeNeedsEvent: string
  projectTimelineChangeNeedsObject: string
  projectTimelineChangeNoChanges: string
  timelineChangeSaved: string
  timelineChangeSaveFailed: string
}

type SaveObjectTimelineChangeOptions = {
  draftAttributes: DraftAttribute[]
  draftCatalogSelections: DraftCatalogSelection[]
  draftCharacterRelationships: DraftCharacterRelationship[]
  draftHierarchySelections: DraftHierarchySelection[]
  editorTimelineEventId: string
  messages: ObjectTimelineChangeMessages
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
  objectId: number | null
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  objectSurnameForm: string
  objects: StoryObject[]
  ownedItemIds: number[]
  ownerCharacterIds: number[]
  ownerOrganizationIds: number[]
  parentObjectIds: number[]
  previousObject: StoryObject | null
  projectId: number
  resetObjectForm: () => void
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsObjectSaving: Dispatch<SetStateAction<boolean>>
  setSelectedTimelineEventId: Dispatch<SetStateAction<number | null>>
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  showErrorMessage: (message: string) => void
  showMessage: (message: string) => void
  territoryPlaceIds: number[]
  timelineEvents: TimelineEvent[]
  timelineParticipations: DraftTimelineParticipation[]
}

export const saveObjectTimelineChange = async ({
  draftAttributes,
  draftCatalogSelections,
  draftCharacterRelationships,
  draftHierarchySelections,
  editorTimelineEventId,
  messages,
  objectAge,
  objectCurrentStatus,
  objectDescription,
  objectId,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  objectSurnameForm,
  objects,
  ownedItemIds,
  ownerCharacterIds,
  ownerOrganizationIds,
  parentObjectIds,
  previousObject,
  projectId,
  resetObjectForm,
  setDialog,
  setIsObjectSaving,
  setSelectedTimelineEventId,
  setTimelineEvents,
  setTimelineLayout,
  showErrorMessage,
  showMessage,
  territoryPlaceIds,
  timelineEvents,
  timelineParticipations,
}: SaveObjectTimelineChangeOptions) => {
  const targetEventId = Number(editorTimelineEventId)
  const baseObject =
    objectId === null
      ? null
      : previousObject?.id === objectId
        ? previousObject
        : objects.find((storyObject) => storyObject.id === objectId) ?? null
  const targetEvent = timelineEvents.find((event) => event.id === targetEventId) ?? null

  if (objectId === null || baseObject === null) {
    showErrorMessage(messages.projectTimelineChangeNeedsObject)
    return
  }

  if (!Number.isInteger(targetEventId) || targetEventId <= 0 || targetEvent === null) {
    showErrorMessage(messages.projectTimelineChangeNeedsEvent)
    return
  }

  const objectChanges = buildObjectTimelineChanges({
    baseObject,
    draftAttributes,
    draftCatalogSelections,
    draftCharacterRelationships,
    draftHierarchySelections,
    objectAge,
    objectCurrentStatus,
    objectDescription,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    parentObjectIds,
    targetObjectId: objectId,
    territoryPlaceIds,
  })

  if (objectChanges.length === 0) {
    showErrorMessage(messages.projectTimelineChangeNoChanges)
    return
  }

  try {
    setIsObjectSaving(true)
    const changedFieldNames = new Set(objectChanges.map((change) => `${change.changeType}:${change.fieldName}`))
    const eventDraft = toTimelineEventDraft(targetEvent)
    const retainedChanges = eventDraft.changes.filter(
      (change) =>
        !(
          change.targetType === 'storyObject' &&
          Number(change.targetId) === objectId &&
          changedFieldNames.has(`${change.changeType}:${change.fieldName}`)
        ),
    )
    const participationRole =
      timelineParticipations.find((participation) => participation.timelineEventId === String(targetEvent.id))?.role ?? ''
    const participants = [
      ...eventDraft.participants.filter(
        (participant) => !(participant.targetType === 'storyObject' && Number(participant.targetId) === objectId),
      ),
      { targetType: 'storyObject', targetId: String(objectId), role: participationRole },
    ]
    const savedEvent = await updateTimelineEventRequest(projectId, targetEvent.id, {
      ...eventDraft,
      participants,
      changes: [...retainedChanges, ...objectChanges],
    })

    setTimelineEvents((currentEvents) =>
      currentEvents.map((event) => (event.id === savedEvent.id ? savedEvent : event)),
    )
    setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
    setSelectedTimelineEventId(savedEvent.id)
    setDialog(null)
    resetObjectForm()
    showMessage(messages.timelineChangeSaved)
  } catch {
    showErrorMessage(messages.timelineChangeSaveFailed)
  } finally {
    setIsObjectSaving(false)
  }
}
