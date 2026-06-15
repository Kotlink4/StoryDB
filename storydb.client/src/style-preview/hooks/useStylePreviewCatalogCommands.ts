import type { Dispatch, SetStateAction } from 'react'

import {
  createCatalogEntryGroupRequest,
  createCatalogEntryRequest,
  createCatalogFieldDefinitionRequest,
  createCatalogRequest,
  deleteCatalogEntryGroupRequest,
  deleteCatalogEntryRequest,
  deleteCatalogFieldDefinitionRequest,
  deleteCatalogRequest,
  fetchCatalogFieldDefinitions,
  getApiErrorMessage,
  updateCatalogEntryGroupRequest,
  updateCatalogEntryRequest,
  updateCatalogFieldDefinitionRequest,
  updateCatalogRequest,
} from '../../api'
import type { PreviewDialogKind } from '../domain/stylePreviewConfig'
import type { PreviewSection, PreviewTab } from '../domain/stylePreviewRouting'
import { emptyCatalogEntryDraft } from './useStylePreviewCatalogDraft'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
} from '../../types'
import {
  validateCatalogDraft,
  validateCatalogEntryDraft,
  validateCatalogFieldDraft,
  validateCatalogGroupDraft,
} from '../../validation'

type CatalogCommandMessages = {
  catalogCreateFailed: string
  catalogDeleteFailed: string
  catalogEntryCreateFailed: string
  catalogEntryDeleteFailed: string
  catalogGroupCreateFailed: string
  catalogGroupDeleteFailed: string
  catalogTemplateLoadFailed: string
  templateFieldDeleteFailed: string
  templateFieldSaveFailed: string
}

type NavigateToPreview = (
  projectId: number | null,
  tab?: PreviewTab,
  section?: PreviewSection,
  objectId?: number | null,
  catalogId?: number | null,
  replace?: boolean,
) => void

type UseStylePreviewCatalogCommandsOptions = {
  catalogDescription: string
  catalogEntryDraft: CatalogEntryDraft
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogFieldDraft: CatalogFieldDraft
  catalogFieldsByCatalogId: Record<number, CatalogFieldDefinition[]>
  catalogGroupName: string
  catalogGroupParentIds: number[]
  catalogHierarchyMode: Catalog['hierarchyMode']
  catalogName: string
  catalogSupportsHierarchy: boolean
  detailMode: 'modal' | 'panel' | 'page'
  editingCatalogEntryId: number | null
  editingCatalogFieldId: number | null
  editingCatalogGroupId: number | null
  editingCatalogId: number | null
  fillCatalogDraft: (catalog: Catalog) => void
  fillCatalogEntryDraft: (entry: CatalogEntry) => void
  fillCatalogFieldDraft: (field: CatalogFieldDefinition) => void
  fillCatalogGroupDraft: (group: CatalogEntryGroup) => void
  messages: CatalogCommandMessages
  navigateToPreview: NavigateToPreview
  pendingDeleteCatalogEntryId: number | null
  pendingDeleteCatalogId: number | null
  resetCatalogDraft: () => void
  resetCatalogEntryDraft: () => void
  resetCatalogFieldDraft: () => void
  resetCatalogGroupDraft: () => void
  selectedCatalog: Catalog | null
  selectedCatalogGroupId: number | null
  selectedProjectId: number | null
  setActiveSection: Dispatch<SetStateAction<PreviewSection>>
  setActiveTab: Dispatch<SetStateAction<PreviewTab>>
  setCatalogEntries: Dispatch<SetStateAction<CatalogEntry[]>>
  setCatalogEntriesByCatalogId: Dispatch<SetStateAction<Record<number, CatalogEntry[]>>>
  setCatalogEntryDraft: Dispatch<SetStateAction<CatalogEntryDraft>>
  setCatalogFieldsByCatalogId: Dispatch<SetStateAction<Record<number, CatalogFieldDefinition[]>>>
  setCatalogGroups: Dispatch<SetStateAction<CatalogEntryGroup[]>>
  setCatalogs: Dispatch<SetStateAction<Catalog[]>>
  setDialog: Dispatch<SetStateAction<PreviewDialogKind>>
  setIsObjectPageOpen: Dispatch<SetStateAction<boolean>>
  setPendingDeleteCatalogEntryId: Dispatch<SetStateAction<number | null>>
  setPendingDeleteCatalogId: Dispatch<SetStateAction<number | null>>
  setSelectedCatalogEntryId: Dispatch<SetStateAction<number | null>>
  setSelectedCatalogGroupId: Dispatch<SetStateAction<number | null>>
  setSelectedCatalogId: Dispatch<SetStateAction<number | null>>
  setSelectedObjectId: Dispatch<SetStateAction<number | null>>
  showErrorMessage: (message: string) => void
  visibleCatalogs: Catalog[]
}

export function useStylePreviewCatalogCommands({
  catalogDescription,
  catalogEntryDraft,
  catalogEntriesByCatalogId,
  catalogFieldDraft,
  catalogFieldsByCatalogId,
  catalogGroupName,
  catalogGroupParentIds,
  catalogHierarchyMode,
  catalogName,
  catalogSupportsHierarchy,
  detailMode,
  editingCatalogEntryId,
  editingCatalogFieldId,
  editingCatalogGroupId,
  editingCatalogId,
  fillCatalogDraft,
  fillCatalogEntryDraft,
  fillCatalogFieldDraft,
  fillCatalogGroupDraft,
  messages,
  navigateToPreview,
  pendingDeleteCatalogEntryId,
  pendingDeleteCatalogId,
  resetCatalogDraft,
  resetCatalogEntryDraft,
  resetCatalogFieldDraft,
  resetCatalogGroupDraft,
  selectedCatalog,
  selectedCatalogGroupId,
  selectedProjectId,
  setActiveSection,
  setActiveTab,
  setCatalogEntries,
  setCatalogEntriesByCatalogId,
  setCatalogEntryDraft,
  setCatalogFieldsByCatalogId,
  setCatalogGroups,
  setCatalogs,
  setDialog,
  setIsObjectPageOpen,
  setPendingDeleteCatalogEntryId,
  setPendingDeleteCatalogId,
  setSelectedCatalogEntryId,
  setSelectedCatalogGroupId,
  setSelectedCatalogId,
  setSelectedObjectId,
  showErrorMessage,
  visibleCatalogs,
}: UseStylePreviewCatalogCommandsOptions) {
  const saveCatalog = async () => {
    if (selectedProjectId === null) {
      return
    }

    const validationMessage = validateCatalogDraft(catalogName, catalogDescription)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingCatalogId === null
          ? await createCatalogRequest(
              selectedProjectId,
              catalogName,
              catalogDescription,
              catalogSupportsHierarchy,
              catalogSupportsHierarchy ? catalogHierarchyMode : 'entries',
            )
          : await updateCatalogRequest(
              selectedProjectId,
              editingCatalogId,
              catalogName,
              catalogDescription,
              catalogSupportsHierarchy,
              catalogSupportsHierarchy ? catalogHierarchyMode : 'entries',
            )
      setCatalogs((currentCatalogs) =>
        editingCatalogId === null
          ? [...currentCatalogs, saved]
          : currentCatalogs.map((catalog) => (catalog.id === saved.id ? saved : catalog)),
      )
      setSelectedCatalogId(saved.id)
      resetCatalogDraft()
      setDialog(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, saved.id)
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.catalogCreateFailed))
    }
  }

  const deleteSelectedCatalog = async () => {
    if (selectedProjectId === null) {
      return
    }

    const targetCatalog =
      visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog
    if (targetCatalog === null) {
      return
    }

    try {
      await deleteCatalogRequest(selectedProjectId, targetCatalog.id)
      setCatalogs((currentCatalogs) => currentCatalogs.filter((catalog) => catalog.id !== targetCatalog.id))
      setSelectedCatalogId(null)
      setCatalogEntries([])
      setCatalogGroups([])
      setPendingDeleteCatalogId(null)
      navigateToPreview(selectedProjectId, 'database', 'catalogs')
      setDialog(null)
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.catalogDeleteFailed))
    }
  }

  const saveCatalogGroup = async () => {
    if (selectedProjectId === null || selectedCatalog === null) {
      return
    }

    const validationMessage = validateCatalogGroupDraft(catalogGroupName)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const parentIds =
        selectedCatalog.supportsHierarchy && selectedCatalog.hierarchyMode === 'groups' ? catalogGroupParentIds : []
      const saved =
        editingCatalogGroupId === null
          ? await createCatalogEntryGroupRequest(selectedProjectId, selectedCatalog.id, catalogGroupName, parentIds)
          : await updateCatalogEntryGroupRequest(
              selectedProjectId,
              selectedCatalog.id,
              editingCatalogGroupId,
              catalogGroupName,
              parentIds,
            )
      setCatalogGroups((currentGroups) =>
        editingCatalogGroupId === null
          ? [...currentGroups, saved]
          : currentGroups.map((group) => (group.id === saved.id ? saved : group)),
      )
      setSelectedCatalogGroupId(saved.id)
      resetCatalogGroupDraft()
      setDialog(null)
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.catalogGroupCreateFailed))
    }
  }

  const saveCatalogField = async () => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    if (selectedProjectId === null || targetCatalogId === null) {
      return
    }

    const validationMessage = validateCatalogFieldDraft(catalogFieldDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const saved =
        editingCatalogFieldId === null
          ? await createCatalogFieldDefinitionRequest(selectedProjectId, targetCatalogId, catalogFieldDraft)
          : await updateCatalogFieldDefinitionRequest(
              selectedProjectId,
              targetCatalogId,
              editingCatalogFieldId,
              catalogFieldDraft,
            )

      setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
        ...currentFieldsByCatalogId,
        [targetCatalogId]:
          editingCatalogFieldId === null
            ? [...(currentFieldsByCatalogId[targetCatalogId] ?? []), saved]
            : (currentFieldsByCatalogId[targetCatalogId] ?? []).map((field) =>
                field.id === saved.id ? saved : field,
              ),
      }))
      resetCatalogFieldDraft()
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.templateFieldSaveFailed))
    }
  }

  const editCatalogField = (field: CatalogFieldDefinition) => {
    fillCatalogFieldDraft(field)
  }

  const deleteCatalogField = async (fieldId: number) => {
    const targetCatalogId = editingCatalogId ?? selectedCatalog?.id ?? null
    if (selectedProjectId === null || targetCatalogId === null) {
      return
    }

    try {
      await deleteCatalogFieldDefinitionRequest(selectedProjectId, targetCatalogId, fieldId)
      setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
        ...currentFieldsByCatalogId,
        [targetCatalogId]: (currentFieldsByCatalogId[targetCatalogId] ?? []).filter((field) => field.id !== fieldId),
      }))
      setCatalogEntries((currentEntries) =>
        currentEntries.map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((fieldValue) => fieldValue.fieldDefinitionId !== fieldId),
        })),
      )
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [targetCatalogId]: (currentEntriesByCatalogId[targetCatalogId] ?? []).map((entry) => ({
          ...entry,
          fieldValues: entry.fieldValues.filter((fieldValue) => fieldValue.fieldDefinitionId !== fieldId),
        })),
      }))
      setCatalogEntryDraft((draft) => {
        const fieldValues = { ...draft.fieldValues }
        delete fieldValues[fieldId]
        return { ...draft, fieldValues }
      })
      if (editingCatalogFieldId === fieldId) {
        resetCatalogFieldDraft()
      }
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.templateFieldDeleteFailed))
    }
  }

  const saveCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null) {
      return
    }

    const validationMessage = validateCatalogEntryDraft(catalogEntryDraft)
    if (validationMessage !== null) {
      showErrorMessage(validationMessage)
      return
    }

    try {
      const fieldDefinitions =
        catalogFieldsByCatalogId[selectedCatalog.id] ?? (await fetchCatalogFieldDefinitions(selectedProjectId, selectedCatalog.id))
      const draftForSave: CatalogEntryDraft = {
        ...catalogEntryDraft,
        parentEntryIds:
          selectedCatalog.supportsHierarchy && selectedCatalog.hierarchyMode !== 'groups'
            ? catalogEntryDraft.parentEntryIds
            : [],
      }
      const saved =
        editingCatalogEntryId === null
          ? await createCatalogEntryRequest(selectedProjectId, selectedCatalog.id, draftForSave, fieldDefinitions)
          : await updateCatalogEntryRequest(
              selectedProjectId,
              selectedCatalog.id,
              editingCatalogEntryId,
              draftForSave,
              fieldDefinitions,
            )
      setCatalogEntries((currentEntries) =>
        editingCatalogEntryId === null
          ? [saved, ...currentEntries]
          : currentEntries.map((entry) => (entry.id === saved.id ? saved : entry)),
      )
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [selectedCatalog.id]:
          editingCatalogEntryId === null
            ? [saved, ...(currentEntriesByCatalogId[selectedCatalog.id] ?? [])]
            : (currentEntriesByCatalogId[selectedCatalog.id] ?? []).map((entry) =>
                entry.id === saved.id ? saved : entry,
              ),
      }))
      resetCatalogEntryDraft()
      setDialog(null)
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.catalogEntryCreateFailed))
    }
  }

  const deleteSelectedCatalogGroup = async () => {
    if (selectedProjectId === null || selectedCatalog === null || selectedCatalogGroupId === null) {
      return
    }

    try {
      await deleteCatalogEntryGroupRequest(selectedProjectId, selectedCatalog.id, selectedCatalogGroupId)
      setCatalogGroups((currentGroups) => currentGroups.filter((group) => group.id !== selectedCatalogGroupId))
      setSelectedCatalogGroupId(null)
      setDialog(null)
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.catalogGroupDeleteFailed))
    }
  }

  const openEditCatalog = (catalog: Catalog) => {
    fillCatalogDraft(catalog)
    if (selectedProjectId !== null) {
      void fetchCatalogFieldDefinitions(selectedProjectId, catalog.id)
        .then((fields) =>
          setCatalogFieldsByCatalogId((currentFieldsByCatalogId) => ({
            ...currentFieldsByCatalogId,
            [catalog.id]: fields,
          })),
        )
        .catch(() => showErrorMessage(messages.catalogTemplateLoadFailed))
    }
    setDialog('catalog')
  }

  const openEditCatalogGroup = (group: CatalogEntryGroup) => {
    fillCatalogGroupDraft(group)
    setDialog('catalogGroup')
  }

  const openEditCatalogEntry = (entry: CatalogEntry) => {
    fillCatalogEntryDraft(entry)
    setDialog('catalogEntry')
  }

  const openCatalogEntryDetail = (entry: CatalogEntry, catalogId?: number) => {
    const catalogEntryBucket = Object.entries(catalogEntriesByCatalogId).find(([, entries]) =>
      entries.some((catalogEntry) => catalogEntry.id === entry.id),
    )
    const targetCatalogId =
      catalogId ?? (catalogEntryBucket === undefined ? selectedCatalog?.id ?? null : Number(catalogEntryBucket[0]))

    setSelectedObjectId(null)
    setActiveTab('database')
    setActiveSection('catalogs')
    setIsObjectPageOpen(false)
    if (targetCatalogId !== null && Number.isFinite(targetCatalogId)) {
      setSelectedCatalogId(targetCatalogId)
      setCatalogEntries((catalogEntriesByCatalogId[targetCatalogId] ?? [entry]).map((catalogEntry) =>
        catalogEntry.id === entry.id ? entry : catalogEntry,
      ))
    }
    setSelectedCatalogEntryId(entry.id)
    if (detailMode === 'modal') {
      setDialog('catalogEntryDetail')
    } else {
      setDialog(null)
    }

    if (selectedProjectId !== null) {
      navigateToPreview(selectedProjectId, 'database', 'catalogs', null, targetCatalogId)
    }
  }

  const deletePendingCatalogEntry = async () => {
    if (selectedProjectId === null || selectedCatalog === null || pendingDeleteCatalogEntryId === null) {
      return
    }

    try {
      await deleteCatalogEntryRequest(selectedProjectId, selectedCatalog.id, pendingDeleteCatalogEntryId)
      setCatalogEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== pendingDeleteCatalogEntryId))
      setCatalogEntriesByCatalogId((currentEntriesByCatalogId) => ({
        ...currentEntriesByCatalogId,
        [selectedCatalog.id]: (currentEntriesByCatalogId[selectedCatalog.id] ?? []).filter(
          (entry) => entry.id !== pendingDeleteCatalogEntryId,
        ),
      }))
      setSelectedCatalogEntryId((currentId) => (currentId === pendingDeleteCatalogEntryId ? null : currentId))
      setPendingDeleteCatalogEntryId(null)
      setDialog(null)
    } catch (error) {
      showErrorMessage(getApiErrorMessage(error, messages.catalogEntryDeleteFailed))
    }
  }

  const createCatalogEntryDraftForGroup = (selectedCatalogGroupId: number | null) => {
    setCatalogEntryDraft({
      ...emptyCatalogEntryDraft,
      entryGroupId: selectedCatalogGroupId === null ? '' : String(selectedCatalogGroupId),
    })
  }

  return {
    createCatalogEntryDraftForGroup,
    deleteCatalogField,
    deletePendingCatalogEntry,
    deleteSelectedCatalog,
    deleteSelectedCatalogGroup,
    editCatalogField,
    openCatalogEntryDetail,
    openEditCatalog,
    openEditCatalogEntry,
    openEditCatalogGroup,
    saveCatalog,
    saveCatalogEntry,
    saveCatalogField,
    saveCatalogGroup,
  }
}
