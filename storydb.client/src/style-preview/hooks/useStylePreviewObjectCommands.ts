import type { Dispatch, SetStateAction } from 'react'

import {
  createObjectRequest,
  deleteObjectRequest,
  fetchObject,
  fetchRelationGraph,
  updateObjectRequest,
} from '../../api'
import {
  addObjectCoverToGallery as addObjectCoverToGalleryRequest,
  addObjectGalleryImage,
  deleteObjectGalleryImage,
  uploadObjectMediaPath,
} from './objectMediaCommands'
import { syncObjectTimelineParticipationsRequest } from './objectTimelineParticipationCommands'
import {
  buildOptimisticObjectSummary,
  mergeSavedObjectSummary,
} from './objectSaveModel'
import { saveObjectTimelineChange } from './objectTimelineChangeSave'
import {
  isObjectSection,
  isPreviewObjectSection,
  type PreviewDialogKind,
} from '../domain/stylePreviewConfig'
import type { PreviewSection, PreviewTab } from '../domain/stylePreviewRouting'
import type { DraftTimelineParticipation, ObjectEditorTab } from '../domain/stylePreviewUiTypes'
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
import {
  validateObjectDraftIssues,
  validationIssuesToMap,
} from '../../validation'
import type { ValidationIssueMap } from '../../validation'

type ObjectCommandMessages = {
  galleryImageAddFailed: string
  galleryImageDeleteFailed: string
  imageUploadFailed: string
  objectDeleteFailed: string
  objectEditorLoadFailed: string
  fieldValidationFailed: string
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
  setObjectEditorTab: Dispatch<SetStateAction<ObjectEditorTab>>
  setObjectValidationErrors: Dispatch<SetStateAction<ValidationIssueMap>>
  setObjects: Dispatch<SetStateAction<StoryObject[]>>
  setObjectsByType: Dispatch<SetStateAction<Record<ObjectTypeKey, StoryObject[]>>>
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
  setObjectEditorTab,
  setObjectValidationErrors,
  setObjects,
  setObjectsByType,
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
  const upsertObjectByType = (storyObject: StoryObject) => {
    const objectTypeKey = isPreviewObjectSection(storyObject.typeKey)
      ? storyObject.typeKey
      : isObjectSection(activeSection)
        ? activeSection
        : null

    if (objectTypeKey === null) {
      return
    }

    setObjectsByType((currentObjectsByType) => {
      const nextObjectsByType = { ...currentObjectsByType }

      ;(Object.keys(nextObjectsByType) as ObjectTypeKey[]).forEach((typeKey) => {
        nextObjectsByType[typeKey] = nextObjectsByType[typeKey].filter(
          (currentObject) => currentObject.id !== storyObject.id,
        )
      })

      const currentTypeObjects = currentObjectsByType[objectTypeKey] ?? []
      const existingIndex = currentTypeObjects.findIndex((currentObject) => currentObject.id === storyObject.id)
      const nextTypeObjects = [...(nextObjectsByType[objectTypeKey] ?? [])]

      if (existingIndex >= 0) {
        nextTypeObjects.splice(existingIndex, 0, storyObject)
      } else {
        nextTypeObjects.unshift(storyObject)
      }

      nextObjectsByType[objectTypeKey] = nextTypeObjects
      return nextObjectsByType
    })
  }

  const removeObjectByType = (objectId: number) => {
    setObjectsByType((currentObjectsByType) => {
      const nextObjectsByType = { ...currentObjectsByType }

      ;(Object.keys(nextObjectsByType) as ObjectTypeKey[]).forEach((typeKey) => {
        nextObjectsByType[typeKey] = nextObjectsByType[typeKey].filter(
          (currentObject) => currentObject.id !== objectId,
        )
      })

      return nextObjectsByType
    })
  }

  const uploadObjectImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      setObjectImagePath(await uploadObjectMediaPath(file, selectedProjectId))
    } catch {
      showErrorMessage(messages.imageUploadFailed)
    }
  }

  const uploadGalleryImage = async (file: File | null) => {
    if (file === null) {
      return
    }

    try {
      setGalleryImagePath(await uploadObjectMediaPath(file, selectedProjectId))
    } catch {
      showErrorMessage(messages.imageUploadFailed)
    }
  }

  const openCreateObjectDialog = () => {
    resetObjectForm()
    setObjectValidationErrors({})
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
        upsertObjectByType(objectToEdit)
      } catch {
        showErrorMessage(messages.objectEditorLoadFailed)
      }
    }

    fillObjectForm(objectToEdit, timelineEvents)
    setObjectValidationErrors({})
    setDialog('object')
  }

  const deleteSelectedObject = async () => {
    if (selectedProjectId === null || selectedObject === null) {
      return
    }

    try {
      await deleteObjectRequest(selectedProjectId, selectedObject.id)
      setObjects((currentObjects) => currentObjects.filter((storyObject) => storyObject.id !== selectedObject.id))
      removeObjectByType(selectedObject.id)
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
    upsertObjectByType(updatedObject)
    setSelectedObjectId(updatedObject.id)
  }

  const addGalleryImage = async () => {
    if (selectedProjectId === null || selectedObject === null || galleryImagePath === null) {
      return
    }

    try {
      const updatedObject = await addObjectGalleryImage(
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
      const updatedObject = await addObjectCoverToGalleryRequest(
        selectedProjectId,
        selectedObject.id,
        selectedObject.imagePath,
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
      const updatedObject = await deleteObjectGalleryImage(selectedProjectId, selectedObject.id, imageId)
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
    const updatedEvents = await syncObjectTimelineParticipationsRequest(
      projectId,
      objectId,
      participations,
      timelineEvents,
    )

    if (updatedEvents.length === 0) {
      return
    }

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

    const validationIssues = validateObjectDraftIssues(
      objectName,
      objectSurname,
      objectSurnameForm,
      objectDescription,
      objectAge,
      objectRole,
      objectCurrentStatus,
      objectImagePath,
    )
    if (validationIssues.length > 0) {
      setObjectEditorTab('main')
      setObjectValidationErrors(validationIssuesToMap(validationIssues))
      showErrorMessage(messages.fieldValidationFailed)
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
      await saveObjectTimelineChange({
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
        timelineParticipations: timelineParticipationsToSave,
      })
      return
    }

    const optimisticObject = buildOptimisticObjectSummary({
      attributeDefinitions,
      draftAttributes,
      objectAge,
      objectCurrentStatus,
      objectDescription,
      objectId,
      objectImagePath,
      objectName,
      objectRole,
      objectSurname,
      objectSurnameForm,
      previousObject,
      section,
    })

    setIsObjectSaving(true)
    if (optimisticObject !== null) {
      setObjects((currentObjects) =>
        currentObjects.map((storyObject) => (storyObject.id === optimisticObject.id ? optimisticObject : storyObject)),
      )
      upsertObjectByType(optimisticObject)
      if (shouldSelectSavedObject) {
        setSelectedObjectId(optimisticObject.id)
      }
      setDialog(null)
      setObjectValidationErrors({})
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

      setObjects((currentObjects) =>
        objectId === null
          ? [saved, ...currentObjects.filter((storyObject) => storyObject.id !== saved.id)]
          : currentObjects.map((storyObject) =>
              storyObject.id === saved.id ? mergeSavedObjectSummary(storyObject, saved) : storyObject,
            ),
      )
      upsertObjectByType(saved)
      if (shouldSelectSavedObject) {
        setSelectedObjectId(saved.id)
        navigateToPreview(projectId, 'database', section, saved.id)
      } else {
        navigateToPreview(projectId, 'database', section, selectedObjectIdBeforeSave)
      }
      if (optimisticObject === null) {
        setDialog(null)
        setObjectValidationErrors({})
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
          upsertObjectByType(loadedObject)
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
        upsertObjectByType(previousObject)
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
