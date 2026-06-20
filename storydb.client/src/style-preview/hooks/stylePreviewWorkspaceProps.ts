import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import { AttributesWorkspace } from '../../components/AttributesWorkspace'
import { CatalogsWorkspace } from '../../components/CatalogsWorkspace'
import { ObjectCardsWorkspace } from '../../components/ObjectCardsWorkspace'
import { ProjectExportWorkspace } from '../../components/ProjectExportWorkspace'
import { StructuresWorkspace } from '../../components/StructuresWorkspace'
import { emptyAttributeDefinitionDraft, type PreviewDialogKind } from '../domain/stylePreviewConfig'
import type { PreviewSection, PreviewTab } from '../domain/stylePreviewRouting'
import type { AuthUser, Catalog, CatalogEntry, CatalogEntryGroup, ObjectTypeKey, StoryObject } from '../../types'

type AttributesWorkspaceProps = ComponentProps<typeof AttributesWorkspace>
type CatalogsWorkspaceProps = ComponentProps<typeof CatalogsWorkspace>
type StructuresWorkspaceProps = Omit<ComponentProps<typeof StructuresWorkspace>, 'selectedProject'>
type ProjectExportWorkspaceProps = ComponentProps<typeof ProjectExportWorkspace>
type ObjectCardsWorkspaceProps = ComponentProps<typeof ObjectCardsWorkspace>

export function buildStylePreviewCatalogsWorkspaceProps({
  catalogEntries,
  catalogGroups,
  createCatalogEntryDraftForGroup,
  groupDisplayMode,
  navigateToPreview,
  openCatalogEntryDetail,
  openEditCatalog,
  openEditCatalogEntry,
  openEditCatalogGroup,
  resetCatalogGroupDraft,
  selectedCatalog,
  selectedCatalogGroupId,
  selectedProjectId,
  setDialog,
  setPendingDeleteCatalogEntryId,
  setPendingDeleteCatalogId,
  setSelectedCatalogGroupId,
  textLinkTargets,
  ui,
  visibleCatalogs,
}: {
  catalogEntries: CatalogEntry[]
  catalogGroups: CatalogEntryGroup[]
  createCatalogEntryDraftForGroup: (groupId: number | null) => void
  groupDisplayMode: CatalogsWorkspaceProps['groupDisplayMode']
  navigateToPreview: (
    projectId: number | null,
    tab: PreviewTab,
    section: PreviewSection,
    objectId?: number | null,
    catalogId?: number | null,
  ) => void
  openCatalogEntryDetail: CatalogsWorkspaceProps['onOpenEntry']
  openEditCatalog: CatalogsWorkspaceProps['onEditCatalog']
  openEditCatalogEntry: CatalogsWorkspaceProps['onEditEntry']
  openEditCatalogGroup: CatalogsWorkspaceProps['onEditGroup']
  resetCatalogGroupDraft: () => void
  selectedCatalog: Catalog | null
  selectedCatalogGroupId: number | null
  selectedProjectId: number | null
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setPendingDeleteCatalogEntryId: Dispatch<SetStateAction<number | null>>
  setPendingDeleteCatalogId: Dispatch<SetStateAction<number | null>>
  setSelectedCatalogGroupId: Dispatch<SetStateAction<number | null>>
  textLinkTargets: CatalogsWorkspaceProps['textLinkTargets']
  ui: CatalogsWorkspaceProps['ui']
  visibleCatalogs: Catalog[]
}): CatalogsWorkspaceProps {
  return {
    catalogEntries,
    catalogGroups,
    catalogs: visibleCatalogs,
    groupDisplayMode,
    selectedCatalog,
    selectedCatalogGroupId,
    textLinkTargets,
    ui,
    onDeleteEntry: (entry) => {
      setPendingDeleteCatalogEntryId(entry.id)
      setDialog('confirmDeleteCatalogEntry')
    },
    onEditCatalog: openEditCatalog,
    onEditEntry: openEditCatalogEntry,
    onEditGroup: openEditCatalogGroup,
    onCreateGroup: () => {
      resetCatalogGroupDraft()
      setDialog('catalogGroup')
    },
    onCreateEntry: () => {
      createCatalogEntryDraftForGroup(selectedCatalogGroupId)
      setDialog('catalogEntry')
    },
    onDeleteCatalog: () => {
      setPendingDeleteCatalogId(selectedCatalog?.id ?? null)
      setDialog('confirmDeleteCatalog')
    },
    onDeleteGroup: (groupId) => {
      setSelectedCatalogGroupId(groupId)
      setDialog('confirmDeleteCatalogGroup')
    },
    onSelectCatalog: (catalogId) => {
      setSelectedCatalogGroupId(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, catalogId)
    },
    onOpenEntry: openCatalogEntryDetail,
    onSelectGroup: setSelectedCatalogGroupId,
  }
}

export function buildStylePreviewAttributesWorkspaceProps({
  attributeDefinitionDraft,
  attributeDefinitions,
  attributeGroupIconKey,
  attributeGroupName,
  attributeGroups,
  editingAttributeDefinitionId,
  groupDisplayMode,
  openEditAttributeDefinition,
  openEditAttributeGroup,
  previewLanguage,
  saveAttributeDefinition,
  saveAttributeGroup,
  selectedAttributeGroupId,
  setAttributeDefinitionDraft,
  setAttributeGroupIconKey,
  setAttributeGroupName,
  setDialog,
  setEditingAttributeDefinitionId,
  setPendingDeleteAttributeDefinitionId,
  setPendingDeleteAttributeGroupId,
  setSelectedAttributeGroupId,
  ui,
}: {
  attributeDefinitionDraft: AttributesWorkspaceProps['attributeDefinitionDraft']
  attributeDefinitions: AttributesWorkspaceProps['attributeDefinitions']
  attributeGroupIconKey: string
  attributeGroupName: string
  attributeGroups: AttributesWorkspaceProps['attributeGroups']
  editingAttributeDefinitionId: number | null
  groupDisplayMode: AttributesWorkspaceProps['groupDisplayMode']
  openEditAttributeDefinition: AttributesWorkspaceProps['onEditAttribute']
  openEditAttributeGroup: AttributesWorkspaceProps['onEditGroup']
  previewLanguage: AttributesWorkspaceProps['language']
  saveAttributeDefinition: () => void | Promise<void>
  saveAttributeGroup: () => void | Promise<void>
  selectedAttributeGroupId: number | null
  setAttributeDefinitionDraft: AttributesWorkspaceProps['onAttributeDefinitionDraftChange']
  setAttributeGroupIconKey: AttributesWorkspaceProps['onAttributeGroupIconChange']
  setAttributeGroupName: AttributesWorkspaceProps['onAttributeGroupNameChange']
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setEditingAttributeDefinitionId: Dispatch<SetStateAction<number | null>>
  setPendingDeleteAttributeDefinitionId: Dispatch<SetStateAction<number | null>>
  setPendingDeleteAttributeGroupId: Dispatch<SetStateAction<number | null>>
  setSelectedAttributeGroupId: Dispatch<SetStateAction<number | null>>
  ui: AttributesWorkspaceProps['ui']
}): AttributesWorkspaceProps {
  return {
    attributeDefinitionDraft,
    attributeDefinitions,
    attributeGroupIconKey,
    attributeGroupName,
    attributeGroups,
    groupDisplayMode,
    editingAttributeDefinitionId,
    language: previewLanguage,
    selectedAttributeGroupId,
    ui,
    onCancelAttributeEdit: () => {
      setEditingAttributeDefinitionId(null)
      setAttributeDefinitionDraft(emptyAttributeDefinitionDraft)
    },
    onAttributeDefinitionDraftChange: setAttributeDefinitionDraft,
    onAttributeGroupIconChange: setAttributeGroupIconKey,
    onAttributeGroupNameChange: setAttributeGroupName,
    onCreateAttribute: () => void saveAttributeDefinition(),
    onCreateGroup: () => void saveAttributeGroup(),
    onDeleteAttribute: (definition) => {
      setPendingDeleteAttributeDefinitionId(definition.id)
      setDialog('confirmDeleteAttribute')
    },
    onDeleteGroup: (group) => {
      setPendingDeleteAttributeGroupId(group.id)
      setDialog('confirmDeleteAttributeGroup')
    },
    onEditAttribute: openEditAttributeDefinition,
    onEditGroup: openEditAttributeGroup,
    onSelectGroup: setSelectedAttributeGroupId,
  }
}

export function buildStylePreviewStructuresWorkspaceProps({
  apiUnavailableMessage,
  catalogEntriesByCatalogId,
  detailMode,
  setStructureDetailPanel,
  showErrorMessage,
  showMessage,
  ui,
  visibleCatalogs,
}: {
  apiUnavailableMessage: string
  catalogEntriesByCatalogId: StructuresWorkspaceProps['catalogEntriesByCatalogId']
  detailMode: StructuresWorkspaceProps['detailMode']
  setStructureDetailPanel: StructuresWorkspaceProps['onDetailPanelChange']
  showErrorMessage: StructuresWorkspaceProps['onError']
  showMessage: StructuresWorkspaceProps['onMessage']
  ui: StructuresWorkspaceProps['ui']
  visibleCatalogs: Catalog[]
}): StructuresWorkspaceProps {
  return {
    catalogEntriesByCatalogId,
    catalogs: visibleCatalogs,
    detailMode,
    errorMessage: apiUnavailableMessage,
    ui,
    onDetailPanelChange: setStructureDetailPanel,
    onError: showErrorMessage,
    onMessage: showMessage,
  }
}

export function buildStylePreviewProjectExportWorkspaceProps({
  apiUnavailableMessage,
  enabledObjectTypes,
  navigateToPreview,
  objectsByType,
  selectedProjectId,
  selectedProjectRuntimeId,
  showErrorMessage,
  showMessage,
  ui,
}: {
  apiUnavailableMessage: string
  enabledObjectTypes: ObjectTypeKey[]
  navigateToPreview: (
    projectId: number | null,
    tab: PreviewTab,
    section: PreviewSection,
    objectId?: number | null,
    catalogId?: number | null,
  ) => void
  objectsByType: ProjectExportWorkspaceProps['objectsByType']
  selectedProjectId: number | null
  selectedProjectRuntimeId: number
  showErrorMessage: ProjectExportWorkspaceProps['onError']
  showMessage: ProjectExportWorkspaceProps['onMessage']
  ui: ProjectExportWorkspaceProps['ui']
}): ProjectExportWorkspaceProps {
  return {
    enabledObjectTypes,
    errorMessage: apiUnavailableMessage,
    objectsByType,
    selectedProjectId: selectedProjectRuntimeId,
    ui,
    onBackToProject: () => navigateToPreview(selectedProjectId, 'database', 'characters'),
    onError: showErrorMessage,
    onMessage: showMessage,
  }
}

export function buildStylePreviewObjectCardsWorkspaceProps({
  activeObjectMenuId,
  currentUser,
  isObjectSectionActive,
  layoutMode,
  objectSectionLabel,
  openCreateObjectDialog,
  openEditObjectDialog,
  openObjectDetail,
  selectedObjectId,
  setActiveObjectMenuId,
  setDialog,
  setLayoutMode,
  setSelectedObjectId,
  ui,
  visibleObjects,
}: {
  activeObjectMenuId: number | null
  currentUser: AuthUser | null
  isObjectSectionActive: boolean
  layoutMode: ObjectCardsWorkspaceProps['layoutMode']
  objectSectionLabel: string
  openCreateObjectDialog: ObjectCardsWorkspaceProps['onCreateObject']
  openEditObjectDialog: ObjectCardsWorkspaceProps['onEditObject']
  openObjectDetail: ObjectCardsWorkspaceProps['onOpenObject']
  selectedObjectId: number | null
  setActiveObjectMenuId: ObjectCardsWorkspaceProps['onObjectMenuChange']
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setLayoutMode: ObjectCardsWorkspaceProps['onLayoutModeChange']
  setSelectedObjectId: Dispatch<SetStateAction<number | null>>
  ui: ObjectCardsWorkspaceProps['ui']
  visibleObjects: StoryObject[]
}): ObjectCardsWorkspaceProps {
  return {
    activeObjectMenuId,
    currentUser,
    layoutMode,
    sectionTitle: isObjectSectionActive ? objectSectionLabel : ui.database,
    selectedObjectId,
    ui,
    viewSectionLabel: objectSectionLabel,
    visibleObjects,
    onCreateObject: openCreateObjectDialog,
    onDeleteObject: (storyObject) => {
      setSelectedObjectId(storyObject.id)
      setDialog('confirmDeleteObject')
    },
    onEditObject: openEditObjectDialog,
    onLayoutModeChange: setLayoutMode,
    onObjectMenuChange: setActiveObjectMenuId,
    onOpenObject: openObjectDetail,
  }
}
