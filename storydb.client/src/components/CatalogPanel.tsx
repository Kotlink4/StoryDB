import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
  CatalogPanelPage,
  InlineNameEdit,
  LayoutMode,
} from '../types'
import { buildCatalogGroupTree } from '../domain/catalogGroupTree'
import { CatalogEntryEditorPage } from './catalog/CatalogEntryEditorPage'
import { CatalogEntryDetailsPanel } from './catalog/CatalogEntryDetailsPanel'
import { CatalogGroupEditor } from './catalog/CatalogGroupEditor'
import { CatalogPanelHeader } from './catalog/CatalogPanelHeader'
import { CatalogPageControls } from './catalog/CatalogPageControls'
import { getCatalogPanelPageKicker, getCatalogPanelPageTitle } from './catalog/catalogPanelModel'
import { CatalogTemplatePanel } from './catalog/CatalogTemplatePanel'
import { CatalogEntryCard } from './CatalogEntryCard'

type CatalogPanelProps = {
  activeCatalogEntryMenuId: number | null
  activeCatalog: Catalog | null
  activeCatalogEntry: CatalogEntry | null
  activeCatalogEntryGroup: CatalogEntryGroup | null
  catalogEntries: CatalogEntry[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogEntryDraft: CatalogEntryDraft
  catalogEntryGroups: CatalogEntryGroup[]
  catalogFieldDraft: CatalogFieldDraft
  catalogFields: CatalogFieldDefinition[]
  catalogs: Catalog[]
  formError: string | null
  layoutMode: LayoutMode
  nameDraft: string
  nameEdit: InlineNameEdit
  editingCatalogEntryId: number | null
  editingCatalogFieldId: number | null
  page: CatalogPanelPage
  projectId: number | null
  t: Record<string, string>
  onBackToCatalog: () => void
  onCancelCatalogEntryEdit: () => void
  onCancelCatalogFieldEdit: () => void
  onCancelNameEdit: () => void
  onCatalogEntryDraftChange: (draft: CatalogEntryDraft) => void
  onCreateCatalogEntry: () => void
  onCreateCatalogEntryGroup: () => void
  onCreateCatalogField: () => void
  onDeleteCatalog: (catalog: Catalog) => void
  onDeleteCatalogEntry: (entry: CatalogEntry) => void
  onDeleteCatalogEntryGroup: (group: CatalogEntryGroup) => void
  onDeleteCatalogField: (field: CatalogFieldDefinition) => void
  onEditCatalogEntry: (entry: CatalogEntry) => void
  onEditCatalogField: (field: CatalogFieldDefinition) => void
  onImageUploadError: () => void
  onOpenCatalogEntry: (entry: CatalogEntry) => void
  onOpenReferencedCatalogEntry: (catalogId: number, entryId: number) => void
  onCatalogHierarchySettingsChange: (
    catalog: Catalog,
    supportsHierarchy: boolean,
    hierarchyMode: CatalogHierarchyMode,
  ) => void
  onCatalogEntryGroupParentsChange: (group: CatalogEntryGroup, parentGroupIds: number[]) => void
  onCatalogEntryMenuToggle: (entryId: number) => void
  onNameDraftChange: (value: string) => void
  onCatalogFieldDraftChange: (draft: CatalogFieldDraft) => void
  onSaveNameEdit: () => void
  onStartNameEdit: (edit: Exclude<InlineNameEdit, null>, currentName: string) => void
  onShowEntryForm: () => void
  onShowTemplate: () => void
}

export function CatalogPanel({
  activeCatalogEntryMenuId,
  activeCatalog,
  activeCatalogEntry,
  activeCatalogEntryGroup,
  catalogEntries,
  catalogEntriesByCatalogId,
  catalogEntryDraft,
  catalogEntryGroups,
  catalogFieldDraft,
  catalogFields,
  catalogs,
  formError,
  layoutMode,
  nameDraft,
  nameEdit,
  editingCatalogEntryId,
  editingCatalogFieldId,
  page,
  projectId,
  t,
  onBackToCatalog,
  onCancelCatalogEntryEdit,
  onCancelCatalogFieldEdit,
  onCancelNameEdit,
  onCatalogEntryDraftChange,
  onCreateCatalogEntry,
  onCreateCatalogEntryGroup,
  onCreateCatalogField,
  onDeleteCatalog,
  onDeleteCatalogEntry,
  onDeleteCatalogEntryGroup,
  onDeleteCatalogField,
  onEditCatalogEntry,
  onEditCatalogField,
  onImageUploadError,
  onOpenCatalogEntry,
  onOpenReferencedCatalogEntry,
  onCatalogHierarchySettingsChange,
  onCatalogEntryGroupParentsChange,
  onCatalogEntryMenuToggle,
  onNameDraftChange,
  onCatalogFieldDraftChange,
  onSaveNameEdit,
  onStartNameEdit,
  onShowEntryForm,
  onShowTemplate,
}: CatalogPanelProps) {
  const catalogGroupTree = buildCatalogGroupTree(catalogEntryGroups)

  const pageTitle = getCatalogPanelPageTitle({
    activeCatalog,
    activeCatalogEntry,
    activeCatalogEntryGroup,
    catalogEntryDraftName: catalogEntryDraft.name,
    editingCatalogEntryId,
    page,
    t,
  })
  const pageKicker = getCatalogPanelPageKicker({ activeCatalog, page, t })

  return (
    <section className="hierarchy-panel">
      <CatalogPanelHeader
        activeCatalog={activeCatalog}
        nameDraft={nameDraft}
        nameEdit={nameEdit}
        page={page}
        pageKicker={pageKicker}
        pageTitle={pageTitle}
        t={t}
        onBackToCatalog={onBackToCatalog}
        onCancelNameEdit={onCancelNameEdit}
        onDeleteCatalog={onDeleteCatalog}
        onNameDraftChange={onNameDraftChange}
        onSaveNameEdit={onSaveNameEdit}
        onStartNameEdit={onStartNameEdit}
      />

      {formError !== null && (
        <div className="form-error" role="alert">
          {formError}
        </div>
      )}

      {activeCatalog === null ? (
        <section className="empty-state compact" aria-live="polite">
          <h2>{catalogs.length === 0 ? t.noCatalogs : t.newCatalog}</h2>
        </section>
      ) : (
        <>
          {page === 'catalog' && (
            <CatalogPageControls
              activeCatalog={activeCatalog}
              t={t}
              onCatalogHierarchySettingsChange={onCatalogHierarchySettingsChange}
              onCreateCatalogEntryGroup={onCreateCatalogEntryGroup}
              onShowEntryForm={onShowEntryForm}
              onShowTemplate={onShowTemplate}
            />
          )}

          {page === 'group' && (
            <CatalogGroupEditor
              activeCatalog={activeCatalog}
              activeCatalogEntryGroup={activeCatalogEntryGroup}
              catalogGroupTree={catalogGroupTree}
              nameDraft={nameDraft}
              nameEdit={nameEdit}
              t={t}
              onCancelNameEdit={onCancelNameEdit}
              onCatalogEntryGroupParentsChange={onCatalogEntryGroupParentsChange}
              onCreateCatalogEntryGroup={onCreateCatalogEntryGroup}
              onDeleteCatalogEntryGroup={onDeleteCatalogEntryGroup}
              onNameDraftChange={onNameDraftChange}
              onSaveNameEdit={onSaveNameEdit}
              onShowEntryForm={onShowEntryForm}
              onStartNameEdit={onStartNameEdit}
            />
          )}

          {page === 'template' && (
            <CatalogTemplatePanel
              catalogFieldDraft={catalogFieldDraft}
              catalogFields={catalogFields}
              catalogs={catalogs}
              editingCatalogFieldId={editingCatalogFieldId}
              t={t}
              onCancelCatalogFieldEdit={onCancelCatalogFieldEdit}
              onCatalogFieldDraftChange={onCatalogFieldDraftChange}
              onCreateCatalogField={onCreateCatalogField}
              onDeleteCatalogField={onDeleteCatalogField}
              onEditCatalogField={onEditCatalogField}
            />
          )}

          {(page === 'catalog' || page === 'group') && (
          <div className={layoutMode === 'grid' ? 'folder-view grid' : 'folder-view list'} aria-label={t.catalogEntries}>
            {catalogEntries.map((entry) => (
              <CatalogEntryCard
                activeMenuId={activeCatalogEntryMenuId}
                entry={entry}
                key={entry.id}
                t={t}
                onDelete={onDeleteCatalogEntry}
                onEdit={onEditCatalogEntry}
                onMenuToggle={onCatalogEntryMenuToggle}
                onOpen={onOpenCatalogEntry}
              />
            ))}
            {catalogEntries.length === 0 && (
              <section className="empty-state compact" aria-live="polite">
                <h2>{t.noCatalogEntries}</h2>
              </section>
            )}
          </div>
          )}

          {page === 'entryForm' && (
            <CatalogEntryEditorPage
              activeCatalog={activeCatalog}
              catalogEntriesByCatalogId={catalogEntriesByCatalogId}
              catalogEntryDraft={catalogEntryDraft}
              catalogFields={catalogFields}
              catalogGroupTree={catalogGroupTree}
              editingCatalogEntryId={editingCatalogEntryId}
              projectId={projectId}
              t={t}
              onCancelCatalogEntryEdit={onCancelCatalogEntryEdit}
              onCatalogEntryDraftChange={onCatalogEntryDraftChange}
              onCreateCatalogEntry={onCreateCatalogEntry}
              onImageUploadError={onImageUploadError}
            />
          )}

          {page === 'entry' && activeCatalogEntry !== null && (
            <CatalogEntryDetailsPanel
              catalogEntriesByCatalogId={catalogEntriesByCatalogId}
              catalogEntry={activeCatalogEntry}
              catalogFields={catalogFields}
              t={t}
              onOpenReferencedCatalogEntry={onOpenReferencedCatalogEntry}
            />
          )}
        </>
      )}
    </section>
  )
}



