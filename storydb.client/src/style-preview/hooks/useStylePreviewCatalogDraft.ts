import { useState } from 'react'

import type { CatalogDialogTab } from '../../components/CatalogEditorDialog'
import {
  emptyCatalogFieldDraft,
} from '../domain/stylePreviewConfig'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
} from '../../types'

export const emptyCatalogEntryDraft: CatalogEntryDraft = {
  name: '',
  description: '',
  imagePath: null,
  entryGroupId: '',
  parentEntryIds: [],
  fieldValues: {},
}

export function useStylePreviewCatalogDraft() {
  const [catalogName, setCatalogName] = useState('')
  const [catalogDescription, setCatalogDescription] = useState('')
  const [catalogSupportsHierarchy, setCatalogSupportsHierarchy] = useState(false)
  const [catalogHierarchyMode, setCatalogHierarchyMode] = useState<CatalogHierarchyMode>('entries')
  const [catalogDialogTab, setCatalogDialogTab] = useState<CatalogDialogTab>('main')
  const [editingCatalogId, setEditingCatalogId] = useState<number | null>(null)
  const [editingCatalogFieldId, setEditingCatalogFieldId] = useState<number | null>(null)
  const [catalogFieldDraft, setCatalogFieldDraft] = useState<CatalogFieldDraft>(emptyCatalogFieldDraft)
  const [pendingDeleteCatalogId, setPendingDeleteCatalogId] = useState<number | null>(null)
  const [catalogGroupName, setCatalogGroupName] = useState('')
  const [catalogGroupParentIds, setCatalogGroupParentIds] = useState<number[]>([])
  const [editingCatalogGroupId, setEditingCatalogGroupId] = useState<number | null>(null)
  const [selectedCatalogGroupId, setSelectedCatalogGroupId] = useState<number | null>(null)
  const [editingCatalogEntryId, setEditingCatalogEntryId] = useState<number | null>(null)
  const [selectedCatalogEntryId, setSelectedCatalogEntryId] = useState<number | null>(null)
  const [pendingDeleteCatalogEntryId, setPendingDeleteCatalogEntryId] = useState<number | null>(null)
  const [catalogEntryDraft, setCatalogEntryDraft] = useState<CatalogEntryDraft>(emptyCatalogEntryDraft)

  const resetCatalogDraft = () => {
    setCatalogName('')
    setCatalogDescription('')
    setCatalogSupportsHierarchy(false)
    setCatalogHierarchyMode('entries')
    setEditingCatalogId(null)
  }

  const resetCatalogFieldDraft = () => {
    setEditingCatalogFieldId(null)
    setCatalogFieldDraft(emptyCatalogFieldDraft)
  }

  const resetCatalogGroupDraft = () => {
    setCatalogGroupName('')
    setCatalogGroupParentIds([])
    setEditingCatalogGroupId(null)
  }

  const resetCatalogEntryDraft = () => {
    setCatalogEntryDraft(emptyCatalogEntryDraft)
    setEditingCatalogEntryId(null)
  }

  const fillCatalogDraft = (catalog: Catalog) => {
    setEditingCatalogId(catalog.id)
    setCatalogName(catalog.name)
    setCatalogDescription(catalog.description ?? '')
    setCatalogSupportsHierarchy(catalog.supportsHierarchy)
    setCatalogHierarchyMode(catalog.hierarchyMode)
    setCatalogDialogTab('main')
    resetCatalogFieldDraft()
  }

  const fillCatalogGroupDraft = (group: CatalogEntryGroup) => {
    setEditingCatalogGroupId(group.id)
    setCatalogGroupName(group.name)
    setCatalogGroupParentIds(group.parentGroupIds)
  }

  const fillCatalogFieldDraft = (field: CatalogFieldDefinition) => {
    setEditingCatalogFieldId(field.id)
    setCatalogFieldDraft({
      name: field.name,
      dataType: field.dataType,
      isRequired: field.isRequired,
      minValue: field.minValue === null ? '' : String(field.minValue),
      maxValue: field.maxValue === null ? '' : String(field.maxValue),
      optionsText: field.options.join(', '),
      referenceCatalogId: field.referenceCatalogId === null ? '' : String(field.referenceCatalogId),
    })
    setCatalogDialogTab('template')
  }

  const fillCatalogEntryDraft = (entry: CatalogEntry) => {
    setEditingCatalogEntryId(entry.id)
    setCatalogEntryDraft({
      name: entry.name,
      description: entry.description ?? '',
      imagePath: entry.imagePath,
      entryGroupId: entry.entryGroupId === null ? '' : String(entry.entryGroupId),
      parentEntryIds: entry.parentEntryIds,
      fieldValues: Object.fromEntries(
        entry.fieldValues.map((fieldValue) => [
          fieldValue.fieldDefinitionId,
          fieldValue.referencedEntryIds.length > 0
            ? fieldValue.referencedEntryIds.join(',')
            : fieldValue.value ?? '',
        ]),
      ),
    })
  }

  return {
    catalogDescription,
    catalogDialogTab,
    catalogEntryDraft,
    catalogFieldDraft,
    catalogGroupName,
    catalogGroupParentIds,
    catalogHierarchyMode,
    catalogName,
    catalogSupportsHierarchy,
    editingCatalogEntryId,
    editingCatalogFieldId,
    editingCatalogGroupId,
    editingCatalogId,
    fillCatalogDraft,
    fillCatalogEntryDraft,
    fillCatalogFieldDraft,
    fillCatalogGroupDraft,
    pendingDeleteCatalogEntryId,
    pendingDeleteCatalogId,
    resetCatalogDraft,
    resetCatalogEntryDraft,
    resetCatalogFieldDraft,
    resetCatalogGroupDraft,
    selectedCatalogEntryId,
    selectedCatalogGroupId,
    setCatalogDescription,
    setCatalogDialogTab,
    setCatalogEntryDraft,
    setCatalogFieldDraft,
    setCatalogGroupName,
    setCatalogGroupParentIds,
    setCatalogHierarchyMode,
    setCatalogName,
    setCatalogSupportsHierarchy,
    setEditingCatalogEntryId,
    setEditingCatalogFieldId,
    setEditingCatalogGroupId,
    setEditingCatalogId,
    setPendingDeleteCatalogEntryId,
    setPendingDeleteCatalogId,
    setSelectedCatalogEntryId,
    setSelectedCatalogGroupId,
  }
}
