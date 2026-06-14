import type { ComponentProps, Dispatch, SetStateAction } from 'react'

import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { PreviewLanguage, PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
} from '../types'
import { CatalogEntryDialog, CatalogGroupDialog } from './CatalogDialogs'
import { CatalogEditorDialog, type CatalogDialogTab } from './CatalogEditorDialog'
import { CatalogEntryDetail } from './CatalogEntryDetail'
import { DeletePreviewDialog } from './DeletePreviewDialog'
import { PreviewDialog } from './StylePreviewPrimitives'

type CatalogEntryLinksById = ComponentProps<typeof CatalogEntryDetail>['catalogEntryLinksById']
type CatalogEntriesByCatalogId = ComponentProps<typeof CatalogEntryDialog>['catalogEntriesByCatalogId']
type TextLinkTargets = ComponentProps<typeof CatalogEntryDetail>['textLinkTargets']

export function StylePreviewCatalogDialogs({
  catalogDescription,
  catalogDialogFields,
  catalogDialogTab,
  catalogEntries,
  catalogEntriesByCatalogId,
  catalogEntryDraft,
  catalogEntryLinksById,
  catalogFieldDraft,
  catalogGroupName,
  catalogGroupParentIds,
  catalogGroups,
  catalogHierarchyMode,
  catalogName,
  catalogSupportsHierarchy,
  dialog,
  editingCatalogEntryId,
  editingCatalogFieldId,
  editingCatalogGroupId,
  editingCatalogId,
  language,
  pendingDeleteCatalogEntryId,
  pendingDeleteCatalogId,
  selectedCatalog,
  selectedCatalogEntry,
  selectedCatalogFields,
  selectedCatalogGroupId,
  selectedProjectId,
  textLinkTargets,
  ui,
  visibleCatalogs,
  onCancelCatalogFieldEdit,
  onCatalogDescriptionChange,
  onCatalogDialogTabChange,
  onCatalogEntryDraftChange,
  onCatalogFieldDraftChange,
  onCatalogGroupNameChange,
  onCatalogGroupParentIdsChange,
  onCatalogHierarchyModeChange,
  onCatalogNameChange,
  onCatalogSupportsHierarchyChange,
  onClose,
  onDeleteCatalogField,
  onDeletePendingCatalog,
  onDeletePendingCatalogEntry,
  onDeleteSelectedCatalogGroup,
  onEditCatalogField,
  onEditSelectedCatalogEntry,
  onOpenConfirmDeleteCatalogEntry,
  onSaveCatalog,
  onSaveCatalogEntry,
  onSaveCatalogField,
  onSaveCatalogGroup,
}: {
  catalogDescription: string
  catalogDialogFields: CatalogFieldDefinition[]
  catalogDialogTab: CatalogDialogTab
  catalogEntries: CatalogEntry[]
  catalogEntriesByCatalogId: CatalogEntriesByCatalogId
  catalogEntryDraft: CatalogEntryDraft
  catalogEntryLinksById: CatalogEntryLinksById
  catalogFieldDraft: CatalogFieldDraft
  catalogGroupName: string
  catalogGroupParentIds: number[]
  catalogGroups: CatalogEntryGroup[]
  catalogHierarchyMode: CatalogHierarchyMode
  catalogName: string
  catalogSupportsHierarchy: boolean
  dialog: PreviewDialogKind
  editingCatalogEntryId: number | null
  editingCatalogFieldId: number | null
  editingCatalogGroupId: number | null
  editingCatalogId: number | null
  language: PreviewLanguage
  pendingDeleteCatalogEntryId: number | null
  pendingDeleteCatalogId: number | null
  selectedCatalog: Catalog | null
  selectedCatalogEntry: CatalogEntry | null
  selectedCatalogFields: CatalogFieldDefinition[]
  selectedCatalogGroupId: number | null
  selectedProjectId: number | null
  textLinkTargets: TextLinkTargets
  ui: PreviewText
  visibleCatalogs: Catalog[]
  onCancelCatalogFieldEdit: () => void
  onCatalogDescriptionChange: (value: string) => void
  onCatalogDialogTabChange: (tab: CatalogDialogTab) => void
  onCatalogEntryDraftChange: Dispatch<SetStateAction<CatalogEntryDraft>>
  onCatalogFieldDraftChange: Dispatch<SetStateAction<CatalogFieldDraft>>
  onCatalogGroupNameChange: (value: string) => void
  onCatalogGroupParentIdsChange: (value: number[]) => void
  onCatalogHierarchyModeChange: (mode: CatalogHierarchyMode) => void
  onCatalogNameChange: (value: string) => void
  onCatalogSupportsHierarchyChange: (supportsHierarchy: boolean) => void
  onClose: () => void
  onDeleteCatalogField: (fieldId: number) => void
  onDeletePendingCatalog: () => void
  onDeletePendingCatalogEntry: () => void
  onDeleteSelectedCatalogGroup: () => void
  onEditCatalogField: (field: CatalogFieldDefinition) => void
  onEditSelectedCatalogEntry: (entry: CatalogEntry) => void
  onOpenConfirmDeleteCatalogEntry: (entryId: number) => void
  onSaveCatalog: () => void
  onSaveCatalogEntry: () => void
  onSaveCatalogField: () => void
  onSaveCatalogGroup: () => void
}) {
  const pendingCatalog = visibleCatalogs.find((catalog) => catalog.id === pendingDeleteCatalogId) ?? selectedCatalog

  return (
    <>
      {dialog === 'catalog' && (
        <CatalogEditorDialog
          catalogDescription={catalogDescription}
          catalogDialogFields={catalogDialogFields}
          catalogDialogTab={catalogDialogTab}
          catalogFieldDraft={catalogFieldDraft}
          catalogHierarchyMode={catalogHierarchyMode}
          catalogName={catalogName}
          catalogSupportsHierarchy={catalogSupportsHierarchy}
          editingCatalogFieldId={editingCatalogFieldId}
          editingCatalogId={editingCatalogId}
          language={language}
          ui={ui}
          visibleCatalogs={visibleCatalogs}
          onCancel={onClose}
          onCancelCatalogFieldEdit={onCancelCatalogFieldEdit}
          onCatalogDescriptionChange={onCatalogDescriptionChange}
          onCatalogDialogTabChange={onCatalogDialogTabChange}
          onCatalogFieldDraftChange={onCatalogFieldDraftChange}
          onCatalogHierarchyModeChange={onCatalogHierarchyModeChange}
          onCatalogNameChange={onCatalogNameChange}
          onCatalogSupportsHierarchyChange={onCatalogSupportsHierarchyChange}
          onDeleteCatalogField={onDeleteCatalogField}
          onEditCatalogField={onEditCatalogField}
          onSaveCatalog={onSaveCatalog}
          onSaveCatalogField={onSaveCatalogField}
        />
      )}

      {dialog === 'catalogGroup' && selectedCatalog !== null && (
        <CatalogGroupDialog
          catalog={selectedCatalog}
          catalogGroupName={catalogGroupName}
          catalogGroupParentIds={catalogGroupParentIds}
          catalogGroups={catalogGroups}
          editingCatalogGroupId={editingCatalogGroupId}
          ui={ui}
          onCancel={onClose}
          onCatalogGroupNameChange={onCatalogGroupNameChange}
          onCatalogGroupParentIdsChange={onCatalogGroupParentIdsChange}
          onSave={onSaveCatalogGroup}
        />
      )}

      {dialog === 'catalogEntry' && selectedCatalog !== null && (
        <CatalogEntryDialog
          catalog={selectedCatalog}
          catalogEntries={catalogEntries}
          catalogEntriesByCatalogId={catalogEntriesByCatalogId}
          catalogEntryDraft={catalogEntryDraft}
          catalogGroups={catalogGroups}
          editingCatalogEntryId={editingCatalogEntryId}
          fieldDefinitions={selectedCatalogFields}
          language={language}
          selectedProjectId={selectedProjectId}
          ui={ui}
          onCancel={onClose}
          onCatalogEntryDraftChange={onCatalogEntryDraftChange}
          onSave={onSaveCatalogEntry}
        />
      )}

      {dialog === 'catalogEntryDetail' && selectedCatalogEntry !== null && (
        <PreviewDialog title={selectedCatalogEntry.name} onClose={onClose}>
          <CatalogEntryDetail
            catalog={selectedCatalog}
            catalogEntryLinksById={catalogEntryLinksById}
            fieldDefinitions={selectedCatalogFields}
            entry={selectedCatalogEntry}
            textLinkTargets={textLinkTargets}
            ui={ui}
            onDelete={() => onOpenConfirmDeleteCatalogEntry(selectedCatalogEntry.id)}
            onEdit={() => onEditSelectedCatalogEntry(selectedCatalogEntry)}
          />
        </PreviewDialog>
      )}

      {dialog === 'confirmDeleteCatalogEntry' && (
        <DeletePreviewDialog
          title={ui.delete}
          itemName={catalogEntries.find((entry) => entry.id === pendingDeleteCatalogEntryId)?.name ?? ui.entry}
          hint={ui.catalogEntryDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeletePendingCatalogEntry}
        />
      )}

      {dialog === 'confirmDeleteCatalog' && pendingCatalog !== null && (
        <DeletePreviewDialog
          title={ui.deleteCatalog}
          itemName={pendingCatalog.name}
          hint={ui.catalogDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeletePendingCatalog}
        />
      )}

      {dialog === 'confirmDeleteCatalogGroup' && (
        <DeletePreviewDialog
          title={ui.deleteGroup}
          itemName={catalogGroups.find((group) => group.id === selectedCatalogGroupId)?.name ?? ui.group}
          hint={ui.catalogGroupDeleteHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeleteSelectedCatalogGroup}
        />
      )}
    </>
  )
}
