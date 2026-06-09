import { Check, Pencil, Trash2 } from 'lucide-react'
import type { FormEvent, KeyboardEvent } from 'react'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDataType,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
  CatalogPanelPage,
  InlineNameEdit,
  LayoutMode,
} from '../types'
import { resolveAssetUrl } from '../api'
import { CatalogEntryCard } from './CatalogEntryCard'
import { ImageDropzone } from './ImageDropzone'

const fieldDataTypes: CatalogFieldDataType[] = [
  'text',
  'longText',
  'number',
  'select',
  'entryReference',
  'multipleEntryReference',
]

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
                    {catalogEntryGroups
                      .filter((group) => group.id !== activeCatalogEntryGroup.id)
                      .map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
          </section>
          )}

          {page === 'template' && (
            <section className="catalog-template-panel">
            <header className="catalog-template-header">
              <div>
                <p className="panel-kicker">{t.catalogTemplate}</p>
                <h3>{t.catalogTemplate}</h3>
              </div>
            </header>

            <form
              className="attribute-definition-form"
              onSubmit={(event) => {
                event.preventDefault()
                onCreateCatalogField()
              }}
            >
              <label className="project-name-field">
                <span>{t.catalogFieldName}</span>
                <input
                  type="text"
                  value={catalogFieldDraft.name}
                  onChange={(event) =>
                    onCatalogFieldDraftChange({ ...catalogFieldDraft, name: event.target.value })
                  }
                  placeholder={t.catalogFieldName}
                />
              </label>
              <label className="project-name-field">
                <span>{t.attributeDataType}</span>
                <select
                  value={catalogFieldDraft.dataType}
                  onChange={(event) =>
                    onCatalogFieldDraftChange({
                      ...catalogFieldDraft,
                      dataType: event.target.value as CatalogFieldDataType,
                    })
                  }
                >
                  {fieldDataTypes.map((dataType) => (
                    <option key={dataType} value={dataType}>
                      {t[`catalogFieldType${dataType}`]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="project-name-field checkbox-field">
                <span>{t.catalogFieldRequired}</span>
                <input
                  type="checkbox"
                  checked={catalogFieldDraft.isRequired}
                  onChange={(event) =>
                    onCatalogFieldDraftChange({
                      ...catalogFieldDraft,
                      isRequired: event.target.checked,
                    })
                  }
                />
              </label>
              {catalogFieldDraft.dataType === 'number' && (
                <>
                  <label className="project-name-field">
                    <span>{t.attributeMin}</span>
                    <input
                      type="number"
                      value={catalogFieldDraft.minValue}
                      onChange={(event) =>
                        onCatalogFieldDraftChange({
                          ...catalogFieldDraft,
                          minValue: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="project-name-field">
                    <span>{t.attributeMax}</span>
                    <input
                      type="number"
                      value={catalogFieldDraft.maxValue}
                      onChange={(event) =>
                        onCatalogFieldDraftChange({
                          ...catalogFieldDraft,
                          maxValue: event.target.value,
                        })
                      }
                    />
                  </label>
                </>
              )}
              {catalogFieldDraft.dataType === 'select' && (
                <label className="project-name-field attribute-definition-wide">
                  <span>{t.attributeOptions}</span>
                  <input
                    type="text"
                    value={catalogFieldDraft.optionsText}
                    onChange={(event) =>
                      onCatalogFieldDraftChange({
                        ...catalogFieldDraft,
                        optionsText: event.target.value,
                      })
                    }
                    placeholder={t.attributeOptionsPlaceholder}
                  />
                </label>
              )}
              {(catalogFieldDraft.dataType === 'entryReference' ||
                catalogFieldDraft.dataType === 'multipleEntryReference') && (
                <label className="project-name-field">
                  <span>{t.catalogFieldReference}</span>
                  <select
                    value={catalogFieldDraft.referenceCatalogId}
                    onChange={(event) =>
                      onCatalogFieldDraftChange({
                        ...catalogFieldDraft,
                        referenceCatalogId: event.target.value,
                      })
                    }
                  >
                    <option value="">{t.catalogFieldReference}</option>
                    {catalogs.map((catalog) => (
                      <option key={catalog.id} value={catalog.id}>
                        {catalog.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="attribute-definition-actions">
                {editingCatalogFieldId !== null && (
                  <button className="secondary-action compact" type="button" onClick={onCancelCatalogFieldEdit}>
                    {t.cancel}
                  </button>
                )}
                <button className="primary-action compact" type="submit">
                  {editingCatalogFieldId === null ? t.addAttribute : t.save}
                </button>
              </div>
            </form>

            <table className="attribute-definition-table">
              <thead>
                <tr>
                  <th>{t.catalogFieldName}</th>
                  <th>{t.attributeDataType}</th>
                  <th>{t.attributeValue}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {catalogFields.map((field) => (
                  <tr key={field.id}>
                    <td>{field.name}</td>
                    <td>{t[`catalogFieldType${field.dataType}`]}</td>
                    <td>{formatCatalogFieldValue(field, catalogs)}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => onEditCatalogField(field)}>
                          {t.edit}
                        </button>
                        <button type="button" onClick={() => onDeleteCatalogField(field)}>
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {catalogFields.length === 0 && (
              <section className="empty-state compact" aria-live="polite">
                <h2>{t.noCatalogFields}</h2>
              </section>
            )}
          </section>
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
                      {catalogEntryGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
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
            <section className="catalog-entry-page">
              <div className="catalog-entry-dossier">
                {resolveAssetUrl(activeCatalogEntry.imagePath) !== null && (
                  <img src={resolveAssetUrl(activeCatalogEntry.imagePath) ?? undefined} alt="" />
                )}
                <div>
                  <p className="setting-label">
                    {activeCatalogEntry.entryGroupName ?? t.primaryAttributeGroup}
                  </p>
                  {activeCatalogEntry.description === null || activeCatalogEntry.description.length === 0 ? (
                    <section className="empty-state compact" aria-live="polite">
                      <h2>{t.description}</h2>
                    </section>
                  ) : (
                    <p>{activeCatalogEntry.description}</p>
                  )}
                </div>
              </div>
              <section className="catalog-template-panel">
                <header className="catalog-template-header">
                  <div>
                    <p className="panel-kicker">{t.catalogTemplate}</p>
                    <h3>{t.catalogTemplate}</h3>
                  </div>
                </header>
                <table className="attribute-definition-table">
                  <thead>
                    <tr>
                      <th>{t.catalogFieldName}</th>
                      <th>{t.attributeDataType}</th>
                      <th>{t.attributeValue}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalogFields.map((field) => (
                      <tr key={field.id}>
                        <td>{field.name}</td>
                        <td>{t[`catalogFieldType${field.dataType}`]}</td>
                        <td>
                          <CatalogEntryFieldValueView
                            catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                            entry={activeCatalogEntry}
                            field={field}
                            onOpenReferencedCatalogEntry={onOpenReferencedCatalogEntry}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {catalogFields.length === 0 && (
                  <section className="empty-state compact" aria-live="polite">
                    <h2>{t.noCatalogFields}</h2>
                  </section>
                )}
              </section>
            </section>
          )}
        </>
      )}
    </section>
  )
}

const formatCatalogFieldValue = (field: CatalogFieldDefinition, catalogs: Catalog[]) => {
  if (field.dataType === 'number') {
    const bounds = [field.minValue ?? '', field.maxValue ?? ''].join(' - ').trim()
    return bounds || '-'
  }

  if (field.dataType === 'select') {
    return field.options.join(', ') || '-'
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    return catalogs.find((catalog) => catalog.id === field.referenceCatalogId)?.name ?? '-'
  }

  return field.isRequired ? '*' : '-'
}

type CatalogEntryFieldInputProps = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  field: CatalogFieldDefinition
  t: Record<string, string>
  value: string
  onChange: (value: string) => void
}

function CatalogEntryFieldInput({
  catalogEntriesByCatalogId,
  field,
  t,
  value,
  onChange,
}: CatalogEntryFieldInputProps) {
  if (field.dataType === 'longText') {
    return (
      <label className="project-name-field hierarchy-node-description">
        <span>{field.name}</span>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    )
  }

  if (field.dataType === 'select') {
    return (
      <label className="project-name-field">
        <span>{field.name}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.isRequired ? t.catalogFieldRequired : '-'}</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    )
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    const referenceEntries =
      field.referenceCatalogId === null ? [] : catalogEntriesByCatalogId[field.referenceCatalogId] ?? []
    const selectedIds = value
      .split(',')
      .map((entryId) => Number(entryId))
      .filter((entryId) => Number.isInteger(entryId) && entryId > 0)

    if (field.dataType === 'multipleEntryReference') {
      return (
        <label className="project-name-field">
          <span>{field.name}</span>
          <select
            multiple
            value={selectedIds.map(String)}
            onChange={(event) =>
              onChange(
                Array.from(event.target.selectedOptions)
                  .map((option) => option.value)
                  .join(','),
              )
            }
          >
            {referenceEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </label>
      )
    }

    return (
      <label className="project-name-field">
        <span>{field.name}</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{field.isRequired ? t.catalogFieldRequired : '-'}</option>
          {referenceEntries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="project-name-field">
      <span>{field.name}</span>
      <input
        type={field.dataType === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

type CatalogEntryFieldValueViewProps = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  entry: CatalogEntry
  field: CatalogFieldDefinition
  onOpenReferencedCatalogEntry: (catalogId: number, entryId: number) => void
}

function CatalogEntryFieldValueView({
  catalogEntriesByCatalogId,
  entry,
  field,
  onOpenReferencedCatalogEntry,
}: CatalogEntryFieldValueViewProps) {
  const entryValue = entry.fieldValues.find((value) => value.fieldDefinitionId === field.id)

  if (entryValue === undefined) {
    return <>-</>
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    if (field.referenceCatalogId === null || entryValue.referencedEntryIds.length === 0) {
      return <>-</>
    }

    const referenceEntries = catalogEntriesByCatalogId[field.referenceCatalogId] ?? []

    return (
      <div className="catalog-reference-values">
        {entryValue.referencedEntryIds.map((entryId) => {
          const referencedEntry = referenceEntries.find((currentEntry) => currentEntry.id === entryId)

          return (
            <button
              className="inline-link-button"
              key={entryId}
              type="button"
              onClick={() => onOpenReferencedCatalogEntry(field.referenceCatalogId as number, entryId)}
            >
              {referencedEntry?.name ?? `#${entryId}`}
            </button>
          )
        })}
      </div>
    )
  }

  return <>{entryValue.value !== null && entryValue.value.length > 0 ? entryValue.value : '-'}</>
}
