import type { Dispatch, SetStateAction } from 'react'

import {
  addObjectGalleryImageRequest,
  createObjectRequest,
  deleteObjectGalleryImageRequest,
  deleteObjectRequest,
  fetchObject,
  fetchRelationGraph,
  uploadImageRequest,
  updateObjectRequest,
  updateTimelineEventRequest,
} from '../../api'
import { buildObjectTimelineChanges } from '../domain/objectTimelineChanges'
import {
  isObjectSection,
  isPreviewObjectSection,
  type PreviewDialogKind,
} from '../domain/stylePreviewConfig'
import type { PreviewSection, PreviewTab } from '../domain/stylePreviewRouting'
import { toTimelineEventDraft } from '../domain/stylePreviewTimelineDrafts'
import type { DraftTimelineParticipation } from '../domain/stylePreviewUiTypes'
import type {
  AttributeDefinition,
  DraftAttribute,
  DraftCatalogSelection,
  DraftCharacterRelationship,
  DraftHierarchySelection,
  ObjectTypeKey,
  RelationGraph,
  RelationGraphLayout,
  StoryObject,
  TimelineEvent,
  TimelineLayout,
} from '../../types'
import { validateObjectDraft } from '../../validation'

type ObjectCommandMessages = {
  galleryImageAddFailed: string
  galleryImageDeleteFailed: string
  imageUploadFailed: string
  objectDeleteFailed: string
  objectEditorLoadFailed: string
  objectRelationGraphUpdateFailed: string
  objectSaveFailed: string
  objectTimelineParticipationUpdateFailed: string
  projectTimelineChangeNeedsEvent: string
  projectTimelineChangeNeedsObject: string
  projectTimelineChangeNoChanges: string
  timelineChangeSaved: string
  timelineChangeSaveFailed: string
}

type NavigateToPreview = (
  projectId: number | null,
  tab?: PreviewTab,
  section?: PreviewSection,
  objectId?: number | null,
  catalogId?: number | null,
  replace?: boolean,
) => void

type UseStylePreviewObjectCommandsOptions = {
  activeSection: PreviewSection
  attributeDefinitions: AttributeDefinition[]
  draftAttributes: DraftAttribute[]
  draftCatalogSelections: DraftCatalogSelection[]
  draftCharacterRelationships: DraftCharacterRelationship[]
  draftHierarchySelections: DraftHierarchySelection[]
  draftTimelineParticipations: DraftTimelineParticipation[]
  editingObjectId: number | null
  editorTimelineEventId: string
  fillObjectForm: (objectToEdit: StoryObject, timelineEvents: TimelineEvent[]) => void
  galleryImageCaption: string
  galleryImagePath: string | null
  isObjectSaving: boolean
  loadObjectEditorData: (typeKey: ObjectTypeKey) => Promise<void>
  messages: ObjectCommandMessages
  navigateToPreview: NavigateToPreview
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
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
  resetObjectForm: () => void
  saveObjectAsTimelineChange: boolean
  selectedObject: StoryObject | null
  selectedObjectId: number | null
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setGalleryImageCaption: Dispatch<SetStateAction<string>>
  setGalleryImagePath: Dispatch<SetStateAction<string | null>>
  setIsObjectSaving: Dispatch<SetStateAction<boolean>>
  setObjectImagePath: Dispatch<SetStateAction<string | null>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setRelationGraph: Dispatch<SetStateAction<RelationGraph>>
  setRelationGraphLayout: Dispatch<SetStateAction<RelationGraphLayout | null>>
  setSelectedObjectId: Dispatch<SetStateAction<number | null>>
  setSelectedTimelineEventId: Dispatch<SetStateAction<number | null>>
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  showErrorMessage: (message: string) => void
  showMessage: (message: string) => void
  territoryPlaceIds: number[]
  timelineEvents: TimelineEvent[]
}

export function useStylePreviewObjectCommands({
  activeSection,
  attributeDefinitions,
  draftAttributes,
  draftCatalogSelections,
  draftCharacterRelationships,
  draftHierarchySelections,
  draftTimelineParticipations,
  editingObjectId,
  editorTimelineEventId,
  fillObjectForm,
  galleryImageCaption,
  galleryImagePath,
  isObjectSaving,
  loadObjectEditorData,
  messages,
  navigateToPreview,
  objectAge,
  objectCurrentStatus,
  objectDescription,
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
  resetObjectForm,
  saveObjectAsTimelineChange,
  selectedObject,
  selectedObjectId,
  selectedProjectId,
  setDialog,
  setGalleryImageCaption,
  setGalleryImagePath,
  setIsObjectSaving,
  setObjectImagePath,
  setObjects,
  setRelationGraph,
  setRelationGraphLayout,
  setSelectedObjectId,
  setSelectedTimelineEventId,
  setTimelineEvents,
  setTimelineLayout,
  showErrorMessage,
  showMessage,
  territoryPlaceIds,
  timelineEvents,
}: UseStylePreviewObjectCommandsOptions) {
  const uploadObjectImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      const result = await uploadImageRequest(file, selectedProjectId)
      setObjectImagePath(result.path)
    } catch {
      showErrorMessage(messages.imageUploadFailed)
    }
  }

  const uploadGalleryImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      const result = await uploadImageRequest(file, selectedProjectId)
      setGalleryImagePath(result.path)
    } catch {
      showErrorMessage(messages.imageUploadFailed)
    }
  }

  const openCreateObjectDialog = () => {
    resetObjectForm()
    if (isObjectSection(activeSection)) {
      void loadObjectEditorData(activeSection)
    }
    setDialog('object')
  }

  const openEditObjectDialog = async (storyObject: StoryObject) => {
    let objectToEdit = storyObject
    const editorTypeKey = isObjectSection(activeSection)
      ? activeSection
      : isPreviewObjectSection(storyObject.typeKey)
        ? storyObject.typeKey
        : 'characters'

    void loadObjectEditorData(editorTypeKey)

    if (selectedProjectId !== null && storyObject.id > 0) {
      try {
        objectToEdit = await fetchObject(selectedProjectId, storyObject.id)
        setObjects((currentObjects) =>
          currentObjects.map((currentObject) => (currentObject.id === objectToEdit.id ? objectToEdit : currentObject)),
        )
      } catch {
        showErrorMessage(messages.objectEditorLoadFailed)
      }
    }

    fillObjectForm(objectToEdit, timelineEvents)
    setDialog('object')
  }

  const deleteSelectedObject = async () => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      await deleteObjectRequest(selectedProjectId, selectedObject.id)
      setObjects((currentObjects) => currentObjects.filter((storyObject) => storyObject.id !== selectedObject.id))
      setRelationGraph((currentGraph) => ({
        nodes: currentGraph.nodes.filter((node) => node.id !== selectedObject.id),
        edges: currentGraph.edges.filter(
          (edge) => edge.sourceId !== selectedObject.id && edge.targetId !== selectedObject.id,
        ),
      }))
      setRelationGraphLayout((currentLayout) =>
        currentLayout === null
          ? null
          : {
              ...currentLayout,
              isStale: true,
              items: currentLayout.items.filter((item) => item.storyObjectId !== selectedObject.id),
            },
      )
      setSelectedObjectId(null)
      navigateToPreview(selectedProjectId, 'database', activeSection)
      setDialog(null)
    } catch {
      showErrorMessage(messages.objectDeleteFailed)
    }
  }

  const updateSelectedObject = (updatedObject: StoryObject) => {
    setObjects((currentObjects) =>
      currentObjects.map((storyObject) => (storyObject.id === updatedObject.id ? updatedObject : storyObject)),
    )
    setSelectedObjectId(updatedObject.id)
  }

  const addGalleryImage = async () => {
    if (selectedProjectId === null || selectedObject === null || galleryImagePath === null) {
      return
    }

    try {
      const updatedObject = await addObjectGalleryImageRequest(
        selectedProjectId,
        selectedObject.id,
        galleryImagePath,
        galleryImageCaption,
      )
      updateSelectedObject(updatedObject)
      setGalleryImagePath(null)
      setGalleryImageCaption('')
    } catch {
      showErrorMessage(messages.galleryImageAddFailed)
    }
  }

  const addObjectCoverToGallery = async () => {
    if (selectedProjectId === null || selectedObject === null || selectedObject.imagePath === null) {
      return
    }

    try {
      const updatedObject = await addObjectGalleryImageRequest(
        selectedProjectId,
        selectedObject.id,
        selectedObject.imagePath,
        '',
      )
      updateSelectedObject(updatedObject)
    } catch {
      showErrorMessage(messages.galleryImageAddFailed)
    }
  }

  const deleteGalleryImage = async (imageId: number) => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      const updatedObject = await deleteObjectGalleryImageRequest(selectedProjectId, selectedObject.id, imageId)
      updateSelectedObject(updatedObject)
    } catch {
      showErrorMessage(messages.galleryImageDeleteFailed)
    }
  }

  const syncObjectTimelineParticipations = async (
    projectId: number,
    objectId: number,
    participations: DraftTimelineParticipation[],
  ) => {
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
      return
    }

    const updatedEvents = await Promise.all(
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

    const updatedEventsById = new Map(updatedEvents.map((event) => [event.id, event]))
    setTimelineEvents((currentEvents) =>
      currentEvents.map((event) => updatedEventsById.get(event.id) ?? event),
    )
    setTimelineLayout((currentLayout) => (currentLayout === null ? null : { ...currentLayout, isStale: true }))
  }

  const saveObject = async () => {
    if (isObjectSaving || selectedProjectId === null || !isObjectSection(activeSection)) {
      return
    }

    const validationMessage = validateObjectDraft(
      objectName,
      objectSurname,
      objectSurnameForm,
      objectDescription,
      objectAge,
      objectRole,
      objectCurrentStatus,
      objectImagePath,
    )
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    const projectId = selectedProjectId
    const section = activeSection
    const objectId = editingObjectId
    const previousObject = selectedObject
    const selectedObjectIdBeforeSave = selectedObjectId
    const shouldSelectSavedObject = objectId !== null && selectedObjectIdBeforeSave === objectId
    const timelineParticipationsToSave = draftTimelineParticipations

    if (saveObjectAsTimelineChange) {
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
          timelineParticipationsToSave.find((participation) => participation.timelineEventId === String(targetEvent.id))
            ?.role ?? ''
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

      return
    }

    const optimisticObject =
      previousObject !== null && previousObject.id === objectId
        ? {
            ...previousObject,
            name: objectName.trim(),
            surname: objectSurname.trim() || null,
            surnameForm: section === 'organizations' ? objectSurnameForm.trim() || null : null,
            description: objectDescription.trim() || null,
            age: objectAge.trim() || null,
            role: objectRole.trim() || null,
            currentStatus: objectCurrentStatus.trim() || null,
            imagePath: objectImagePath,
            attributes: draftAttributes
              .map((attribute, index) => {
                const name = attribute.name.trim()
                const existingAttribute = previousObject?.attributes.find(
                  (currentAttribute) => currentAttribute.name.toLowerCase() === name.toLowerCase(),
                )
                const definition = attributeDefinitions.find(
                  (currentDefinition) => currentDefinition.name.toLowerCase() === name.toLowerCase(),
                )

                return {
                  id: existingAttribute?.id ?? -(index + 1),
                  attributeDefinitionId: existingAttribute?.attributeDefinitionId ?? definition?.id ?? 0,
                  name,
                  value: attribute.value.trim() || null,
                }
              })
              .filter((attribute) => attribute.name.length > 0),
          }
        : null

    setIsObjectSaving(true)
    if (optimisticObject !== null) {
      setObjects((currentObjects) =>
        currentObjects.map((storyObject) => (storyObject.id === optimisticObject.id ? optimisticObject : storyObject)),
      )
      if (shouldSelectSavedObject) {
        setSelectedObjectId(optimisticObject.id)
      }
      setDialog(null)
      resetObjectForm()
    }

    try {
      const saved =
        objectId === null
          ? await createObjectRequest(
              projectId,
              section,
              objectName,
              objectSurname,
              objectSurnameForm,
              objectDescription,
              objectAge,
              objectRole,
              objectCurrentStatus,
              objectImagePath,
              draftAttributes,
              draftHierarchySelections,
              draftCatalogSelections,
              ownedItemIds,
              ownerCharacterIds,
              territoryPlaceIds,
              ownerOrganizationIds,
              parentObjectIds,
              draftCharacterRelationships,
            )
          : await updateObjectRequest(
              projectId,
              objectId,
              objectName,
              objectSurname,
              objectSurnameForm,
              objectDescription,
              objectAge,
              objectRole,
              objectCurrentStatus,
              objectImagePath,
              draftAttributes,
              draftHierarchySelections,
              draftCatalogSelections,
              ownedItemIds,
              ownerCharacterIds,
              territoryPlaceIds,
              ownerOrganizationIds,
              parentObjectIds,
              draftCharacterRelationships,
            )

      const mergeSavedSummary = (storyObject: StoryObject): StoryObject => ({
        ...storyObject,
        id: saved.id,
        name: saved.name,
        surname: saved.surname,
        surnameForm: saved.surnameForm,
        description: saved.description,
        age: saved.age,
        role: saved.role,
        currentStatus: saved.currentStatus,
        imagePath: saved.imagePath,
        typeKey: saved.typeKey,
        attributes: saved.attributes,
      })

      setObjects((currentObjects) =>
        objectId === null
          ? [saved, ...currentObjects.filter((storyObject) => storyObject.id !== saved.id)]
          : currentObjects.map((storyObject) => (storyObject.id === saved.id ? mergeSavedSummary(storyObject) : storyObject)),
      )
      if (shouldSelectSavedObject) {
        setSelectedObjectId(saved.id)
        navigateToPreview(projectId, 'database', section, saved.id)
      } else {
        navigateToPreview(projectId, 'database', section, selectedObjectIdBeforeSave)
      }
      if (optimisticObject === null) {
        setDialog(null)
        resetObjectForm()
      }
      try {
        await syncObjectTimelineParticipations(projectId, saved.id, timelineParticipationsToSave)
      } catch {
        showErrorMessage(messages.objectTimelineParticipationUpdateFailed)
      }
      void fetchObject(projectId, saved.id)
        .then((loadedObject) => {
          setObjects((currentObjects) =>
            currentObjects.map((storyObject) => (storyObject.id === loadedObject.id ? loadedObject : storyObject)),
          )
        })
        .catch(() => undefined)
      void fetchRelationGraph(projectId)
        .then((graph) => {
          setRelationGraph(graph)
          setRelationGraphLayout((currentLayout) =>
            currentLayout === null ? null : { ...currentLayout, isStale: true },
          )
        })
        .catch(() => {
          showErrorMessage(messages.objectRelationGraphUpdateFailed)
        })
    } catch {
      if (optimisticObject !== null && previousObject !== null) {
        setObjects((currentObjects) =>
          currentObjects.map((storyObject) => (storyObject.id === previousObject.id ? previousObject : storyObject)),
        )
        setSelectedObjectId(previousObject.id)
      }
      showErrorMessage(messages.objectSaveFailed)
    } finally {
      setIsObjectSaving(false)
    }
  }

  return {
    addGalleryImage,
    addObjectCoverToGallery,
    deleteGalleryImage,
    deleteSelectedObject,
    openCreateObjectDialog,
    openEditObjectDialog,
    saveObject,
    updateSelectedObject,
    uploadGalleryImage,
    uploadObjectImage,
  }
}
