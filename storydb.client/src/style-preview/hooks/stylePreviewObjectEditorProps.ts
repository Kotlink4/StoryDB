import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import { ObjectEditor } from '../../components/ObjectEditor'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import { isObjectSection } from '../domain/stylePreviewConfig'
import type { PreviewSection } from '../domain/stylePreviewRouting'
import type {
  CatalogEntry,
  ObjectTypeKey,
  TimelineEvent,
  TimelineLayout,
} from '../../types'
import {
  toggleNumberSelection,
} from './useStylePreviewShellEffects'
import { updateTimelineEventAndMarkLayoutStale } from './stylePreviewDetailProps'

type ObjectEditorProps = ComponentProps<typeof ObjectEditor>
type MaybePromise = void | Promise<void>

export function buildStylePreviewObjectEditorProps({
  activeSection,
  attributeDefinitions,
  attributeGroups,
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
  draftAttributes,
  draftCatalogSelections,
  draftCharacterRelationships,
  draftHierarchySelections,
  draftTimelineParticipations,
  editingObjectId,
  editorTimelineEventId,
  hierarchyGroups,
  hierarchyNodesByGroupId,
  isObjectSaving,
  objectAge,
  objectCurrentStatus,
  objectDescription,
  objectEditorTab,
  objectImagePath,
  objectName,
  objectRole,
  objectSurname,
  objectSurnameForm,
  objectsByType,
  ownedItemIds,
  ownerCharacterIds,
  ownerOrganizationIds,
  saveObject,
  saveObjectAsTimelineChange,
  selectedProjectId,
  setDialog,
  setDraftAttributes,
  setDraftCatalogSelections,
  setDraftCharacterRelationships,
  setDraftHierarchySelections,
  setDraftTimelineParticipations,
  setEditorTimelineEventId,
  setObjectAge,
  setObjectCurrentStatus,
  setObjectDescription,
  setObjectEditorTab,
  setObjectName,
  setObjectRole,
  setObjectSurname,
  setObjectSurnameForm,
  setOwnedItemIds,
  setOwnerCharacterIds,
  setOwnerOrganizationIds,
  setSaveObjectAsTimelineChange,
  setTerritoryPlaceIds,
  setTimelineEvents,
  setTimelineLayout,
  territoryPlaceIds,
  timelineEvents,
  ui,
  updateObjectStructureAssignments,
  refreshRelationWorkspaceData,
  uploadObjectImage,
  validationErrors,
}: {
  activeSection: PreviewSection
  attributeDefinitions: ObjectEditorProps['attributeDefinitions']
  attributeGroups: ObjectEditorProps['attributeGroups']
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: ObjectEditorProps['catalogGroupsByCatalogId']
  catalogs: ObjectEditorProps['catalogs']
  draftAttributes: ObjectEditorProps['draftAttributes']
  draftCatalogSelections: ObjectEditorProps['draftCatalogSelections']
  draftCharacterRelationships: ObjectEditorProps['draftCharacterRelationships']
  draftHierarchySelections: ObjectEditorProps['draftHierarchySelections']
  draftTimelineParticipations: ObjectEditorProps['draftTimelineParticipations']
  editingObjectId: number | null
  editorTimelineEventId: string
  hierarchyGroups: ObjectEditorProps['hierarchyGroups']
  hierarchyNodesByGroupId: ObjectEditorProps['hierarchyNodesByGroupId']
  isObjectSaving: boolean
  objectAge: string
  objectCurrentStatus: string
  objectDescription: string
  objectEditorTab: ObjectEditorProps['objectEditorTab']
  objectImagePath: string | null
  objectName: string
  objectRole: string
  objectSurname: string
  objectSurnameForm: string
  objectsByType: ObjectEditorProps['objectsByType']
  ownedItemIds: number[]
  ownerCharacterIds: number[]
  ownerOrganizationIds: number[]
  saveObject: () => MaybePromise
  saveObjectAsTimelineChange: boolean
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setDraftAttributes: ObjectEditorProps['onDraftAttributesChange']
  setDraftCatalogSelections: ObjectEditorProps['onDraftCatalogSelectionsChange']
  setDraftCharacterRelationships: ObjectEditorProps['onDraftCharacterRelationshipsChange']
  setDraftHierarchySelections: ObjectEditorProps['onDraftHierarchySelectionsChange']
  setDraftTimelineParticipations: ObjectEditorProps['onDraftTimelineParticipationsChange']
  setEditorTimelineEventId: ObjectEditorProps['onEditorTimelineEventIdChange']
  setObjectAge: ObjectEditorProps['onObjectAgeChange']
  setObjectCurrentStatus: ObjectEditorProps['onObjectCurrentStatusChange']
  setObjectDescription: ObjectEditorProps['onObjectDescriptionChange']
  setObjectEditorTab: ObjectEditorProps['onObjectEditorTabChange']
  setObjectName: ObjectEditorProps['onObjectNameChange']
  setObjectRole: ObjectEditorProps['onObjectRoleChange']
  setObjectSurname: ObjectEditorProps['onObjectSurnameChange']
  setObjectSurnameForm: ObjectEditorProps['onObjectSurnameFormChange']
  setOwnedItemIds: ObjectEditorProps['onOwnedItemIdsChange']
  setOwnerCharacterIds: ObjectEditorProps['onOwnerCharacterIdsChange']
  setOwnerOrganizationIds: ObjectEditorProps['onOwnerOrganizationIdsChange']
  setSaveObjectAsTimelineChange: ObjectEditorProps['onSaveObjectAsTimelineChange']
  setTerritoryPlaceIds: ObjectEditorProps['onTerritoryPlaceIdsChange']
  setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>
  setTimelineLayout: Dispatch<SetStateAction<TimelineLayout | null>>
  territoryPlaceIds: number[]
  timelineEvents: TimelineEvent[]
  ui: ObjectEditorProps['ui']
  updateObjectStructureAssignments: NonNullable<ObjectEditorProps['onStructureAssignmentsChange']>
  refreshRelationWorkspaceData: NonNullable<ObjectEditorProps['onStructureWorkspaceChange']>
  uploadObjectImage: ObjectEditorProps['onImageUpload']
  validationErrors?: ObjectEditorProps['validationErrors']
}): ObjectEditorProps {
  const activeType: ObjectTypeKey = isObjectSection(activeSection) ? activeSection : 'characters'

  return {
    activeType,
    attributeDefinitions,
    attributeGroups,
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    catalogs,
    draftAttributes,
    draftCatalogSelections,
    draftCharacterRelationships,
    draftHierarchySelections,
    draftTimelineParticipations,
    editingObjectId,
    editorTimelineEventId,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    isSaving: isObjectSaving,
    objectAge,
    objectCurrentStatus,
    objectDescription,
    objectEditorTab,
    objectImagePath,
    objectName,
    objectRole,
    objectSurname,
    objectSurnameForm,
    objectsByType,
    ownedItemIds,
    ownerCharacterIds,
    ownerOrganizationIds,
    saveObjectAsTimelineChange,
    selectedProjectId,
    timelineEvents,
    territoryPlaceIds,
    validationErrors,
    ui,
    onCancel: () => setDialog(null),
    onDraftAttributesChange: setDraftAttributes,
    onDraftCatalogSelectionsChange: setDraftCatalogSelections,
    onDraftCharacterRelationshipsChange: setDraftCharacterRelationships,
    onDraftHierarchySelectionsChange: setDraftHierarchySelections,
    onDraftTimelineParticipationsChange: setDraftTimelineParticipations,
    onEditorTimelineEventIdChange: setEditorTimelineEventId,
    onImageUpload: uploadObjectImage,
    onObjectAgeChange: setObjectAge,
    onObjectCurrentStatusChange: setObjectCurrentStatus,
    onObjectDescriptionChange: setObjectDescription,
    onObjectEditorTabChange: setObjectEditorTab,
    onObjectNameChange: setObjectName,
    onObjectRoleChange: setObjectRole,
    onObjectSurnameChange: setObjectSurname,
    onObjectSurnameFormChange: setObjectSurnameForm,
    onOwnedItemIdsChange: setOwnedItemIds,
    onOwnerCharacterIdsChange: setOwnerCharacterIds,
    onOwnerOrganizationIdsChange: setOwnerOrganizationIds,
    onSave: () => void saveObject(),
    onSaveObjectAsTimelineChange: setSaveObjectAsTimelineChange,
    onStructureAssignmentsChange: updateObjectStructureAssignments,
    onStructureWorkspaceChange: refreshRelationWorkspaceData,
    onTerritoryPlaceIdsChange: setTerritoryPlaceIds,
    onTimelineEventUpdated: (timelineEvent) =>
      updateTimelineEventAndMarkLayoutStale({
        setTimelineEvents,
        setTimelineLayout,
        timelineEvent,
      }),
    toggleNumberSelection,
  }
}
