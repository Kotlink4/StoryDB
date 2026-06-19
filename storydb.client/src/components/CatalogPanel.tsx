import { Check, Pencil, Trash2 } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
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
import { buildCatalogGroupTree, formatCatalogGroupTreeLabel } from '../domain/catalogGroupTree'
import { CatalogEntryDetailsPanel } from './catalog/CatalogEntryDetailsPanel'
import { CatalogEntryFieldInput } from './catalog/CatalogEntryFields'
import { CatalogTemplatePanel } from './catalog/CatalogTemplatePanel'
import { CatalogEntryCard } from './CatalogEntryCard'
import { ImageDropzone } from './ImageDropzone'

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

  const saveOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSaveNameEdit()
    }
    if (event.key === 'Escape') {
      onCancelNameEdit()
    }
  }

  const submitCatalogEntry = (event: FormEvent) => {
    event.preventDefault()
    onCreateCatalogEntry()
  }

  const pageTitle =
    page === 'template'
      ? t.catalogTemplate
      : page === 'entryForm'
        ? editingCatalogEntryId === null
          ? t.newCatalogEntry
          : `${t.edit}: ${catalogEntryDraft.name || t.catalogEntryName}`
      : page === 'entry'
        ? activeCatalogEntry?.name ?? t.catalogEntryName
        : page === 'group'
          ? activeCatalogEntryGroup?.name ?? t.attributeGroup
          : activeCatalog?.name ?? t.newCatalog
  const pageKicker =
    page === 'template'
      ? activeCatalog?.name ?? t.catalogs
      : page === 'entryForm'
        ? activeCatalog?.name ?? t.catalogs
      : page === 'entry'
        ? activeCatalog?.name ?? t.catalogs
        : page === 'group'
          ? activeCatalog?.name ?? t.catalogs
          : t.catalogs

  return (
    <section className="hierarchy-panel">
      <header className="hierarchy-panel-header">
        <div>
          <p className="panel-kicker">{pageKicker}</p>
          {page === 'catalog' &&
          activeCatalog !== null &&
          nameEdit?.kind === 'catalog' &&
          nameEdit.id === activeCatalog.id ? (
            <div className="inline-title-edit">
              <input
                autoFocus
                value={nameDraft}
                onChange={(event) => onNameDraftChange(event.target.value)}
                onKeyDown={saveOnEnter}
              />
              <button
                aria-label={t.save}
                className="icon-action"
                title={t.save}
                type="button"
                onClick={onSaveNameEdit}
              >
                <Check aria-hidden="true" size={18} />
              </button>
            </div>
          ) : (
            <div className="inline-title-row">
              <h2>{pageTitle}</h2>
              {page === 'catalog' && activeCatalog !== null && (
                <div className="table-actions">
                  <button
                    aria-label={`${t.edit}: ${activeCatalog.name}`}
                    type="button"
                    onClick={() =>
                      onStartNameEdit({ kind: 'catalog', id: activeCatalog.id }, activeCatalog.name)
                    }
                  >
                    <Pencil aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`${t.delete}: ${activeCatalog.name}`}
                    type="button"
                    onClick={() => onDeleteCatalog(activeCatalog)}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              )}
              {page !== 'catalog' && (
                <div className="table-actions">
                  <button type="button" onClick={onBackToCatalog}>
                    {t.back}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

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
            <>
              <section className="catalog-page-actions">
                <button className="primary-action compact" type="button" onClick={onShowEntryForm}>
                  + {t.newCatalogEntry}
                </button>
                <button className="secondary-action compact" type="button" onClick={onShowTemplate}>
                  {t.catalogTemplate}
                </button>
                <button className="primary-action compact" type="button" onClick={onCreateCatalogEntryGroup}>
                  + {t.createAttributeGroup}
                </button>
              </section>
              <section className="catalog-hierarchy-settings">
                <label className="project-name-field checkbox-field">
                  <span>{t.supportsHierarchy}</span>
                  <input
                    type="checkbox"
                    checked={activeCatalog.supportsHierarchy}
                    onChange={(event) =>
                      onCatalogHierarchySettingsChange(
                        activeCatalog,
                        event.target.checked,
                        activeCatalog.hierarchyMode,
                      )
                    }
                  />
                </label>
                {activeCatalog.supportsHierarchy && (
                  <label className="project-name-field">
                    <span>{t.catalogHierarchyMode}</span>
                    <select
                      value={activeCatalog.hierarchyMode}
                      onChange={(event) =>
                        onCatalogHierarchySettingsChange(
                          activeCatalog,
                          true,
                          event.target.value as CatalogHierarchyMode,
                        )
                      }
                    >
                      <option value="entries">{t.catalogHierarchyEntries}</option>
                      <option value="entriesInGroup">{t.catalogHierarchyEntriesInGroup}</option>
                      <option value="groups">{t.catalogHierarchyGroups}</option>
                    </select>
                  </label>
                )}
              </section>
            </>
          )}

          {page === 'group' && (
            <section className="hierarchy-group-editor">
            <label className="project-name-field">
              <span>{t.attributeGroup}</span>
              <strong>{activeCatalogEntryGroup?.name ?? t.attributeGroup}</strong>
            </label>
            {activeCatalogEntryGroup !== null &&
            nameEdit?.kind === 'catalogEntryGroup' &&
            nameEdit.id === activeCatalogEntryGroup.id ? (
              <div className="inline-title-edit compact">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(event) => onNameDraftChange(event.target.value)}
                  onKeyDown={saveOnEnter}
                />
                <button
                  aria-label={t.save}
                  className="icon-action"
                  title={t.save}
                  type="button"
                  onClick={onSaveNameEdit}
                >
                  <Check aria-hidden="true" size={16} />
                </button>
              </div>
            ) : (
              activeCatalogEntryGroup !== null && (
                <div className="table-actions">
                  <button
                    aria-label={`${t.edit}: ${activeCatalogEntryGroup.name}`}
                    type="button"
                    onClick={() =>
                      onStartNameEdit(
                        { kind: 'catalogEntryGroup', id: activeCatalogEntryGroup.id },
                        activeCatalogEntryGroup.name,
                      )
                    }
                  >
                    <Pencil aria-hidden="true" size={16} />
                  </button>
                  <button
                    aria-label={`${t.delete}: ${activeCatalogEntryGroup.name}`}
                    type="button"
                    onClick={() => onDeleteCatalogEntryGroup(activeCatalogEntryGroup)}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>
              )
            )}
            <button className="primary-action compact" type="button" onClick={onCreateCatalogEntryGroup}>
              + {t.createAttributeGroup}
            </button>
            <button className="secondary-action compact" type="button" onClick={onShowEntryForm}>
              + {t.newCatalogEntry}
            </button>
            {activeCatalog.supportsHierarchy &&
              activeCatalog.hierarchyMode === 'groups' &&
              activeCatalogEntryGroup !== null && (
                <label className="project-name-field hierarchy-node-description">
                  <span>{t.hierarchyParents}</span>
                  <select
                    multiple
                    value={activeCatalogEntryGroup.parentGroupIds.map(String)}
                    onChange={(event) =>
                      onCatalogEntryGroupParentsChange(
                        activeCatalogEntryGroup,
                        Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                      )
                    }
                  >
                    {catalogGroupTree
                      .filter(({ group }) => group.id !== activeCatalogEntryGroup.id)
                      .map(({ group, depth }) => (
                        <option key={group.id} value={group.id}>
                          {formatCatalogGroupTreeLabel(group, depth)}
                        </option>
                      ))}
                  </select>
                </label>
              )}
          </section>
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
            <form className="catalog-entry-editor-page" onSubmit={submitCatalogEntry}>
              <section className="catalog-entry-dossier catalog-entry-editor-dossier">
                <ImageDropzone
                  imagePath={catalogEntryDraft.imagePath}
                  label={t.cover}
                  placeholder={t.coverDropzone}
                  projectId={projectId}
                  onChange={(imagePath) => onCatalogEntryDraftChange({ ...catalogEntryDraft, imagePath })}
                  onError={onImageUploadError}
                />
                <div className="catalog-entry-editor-main">
                  <label className="project-name-field">
                    <span>{t.catalogEntryName}</span>
                    <input
                      type="text"
                      value={catalogEntryDraft.name}
                      onChange={(event) =>
                        onCatalogEntryDraftChange({ ...catalogEntryDraft, name: event.target.value })
                      }
                      placeholder={t.catalogEntryName}
                    />
                  </label>
                  <label className="project-name-field">
                    <span>{t.attributeGroup}</span>
                    <select
                      value={catalogEntryDraft.entryGroupId}
                      onChange={(event) =>
                        onCatalogEntryDraftChange({
                          ...catalogEntryDraft,
                          entryGroupId: event.target.value,
                          parentEntryIds:
                            activeCatalog.hierarchyMode === 'entriesInGroup'
                              ? []
                              : catalogEntryDraft.parentEntryIds,
                        })
                      }
                    >
                      <option value="">{t.primaryAttributeGroup}</option>
                      {catalogGroupTree.map(({ group, depth }) => (
                        <option key={group.id} value={group.id}>
                          {formatCatalogGroupTreeLabel(group, depth)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {activeCatalog.supportsHierarchy &&
                    activeCatalog.hierarchyMode !== 'groups' && (
                      <label className="project-name-field hierarchy-node-description">
                        <span>{t.hierarchyParents}</span>
                        <select
                          multiple
                          value={catalogEntryDraft.parentEntryIds.map(String)}
                          onChange={(event) =>
                            onCatalogEntryDraftChange({
                              ...catalogEntryDraft,
                              parentEntryIds: Array.from(event.target.selectedOptions).map((option) =>
                                Number(option.value),
                              ),
                            })
                          }
                        >
                          {(catalogEntriesByCatalogId[activeCatalog.id] ?? [])
                            .filter((entry) => entry.id !== editingCatalogEntryId)
                            .filter(
                              (entry) =>
                                activeCatalog.hierarchyMode !== 'entriesInGroup' ||
                                String(entry.entryGroupId ?? '') === catalogEntryDraft.entryGroupId,
                            )
                            .map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                  <label className="project-name-field hierarchy-node-description">
                    <span>{t.description}</span>
                    <textarea
                      value={catalogEntryDraft.description}
                      onChange={(event) =>
                        onCatalogEntryDraftChange({
                          ...catalogEntryDraft,
                          description: event.target.value,
                        })
                      }
                      placeholder={t.descriptionPlaceholder}
                    />
                  </label>
                </div>
              </section>

              <section className="catalog-template-panel">
                <header className="catalog-template-header">
                  <div>
                    <p className="panel-kicker">{t.catalogTemplate}</p>
                    <h3>{t.catalogTemplate}</h3>
                  </div>
                </header>
                <div className="catalog-entry-field-grid">
                  {catalogFields.map((field) => (
                    <CatalogEntryFieldInput
                      catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                      field={field}
                      key={field.id}
                      t={t}
                      value={catalogEntryDraft.fieldValues[field.id] ?? ''}
                      onChange={(value) =>
                        onCatalogEntryDraftChange({
                          ...catalogEntryDraft,
                          fieldValues: {
                            ...catalogEntryDraft.fieldValues,
                            [field.id]: value,
                          },
                        })
                      }
                    />
                  ))}
                  {catalogFields.length === 0 && (
                    <section className="empty-state compact" aria-live="polite">
                      <h2>{t.noCatalogFields}</h2>
                    </section>
                  )}
                </div>
              </section>

              <div className="attribute-definition-actions">
                <button className="secondary-action compact" type="button" onClick={onCancelCatalogEntryEdit}>
                  {t.cancel}
                </button>
                <button className="primary-action compact" type="submit">
                  {editingCatalogEntryId === null ? t.newCatalogEntry : t.save}
                </button>
              </div>
            </form>
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

