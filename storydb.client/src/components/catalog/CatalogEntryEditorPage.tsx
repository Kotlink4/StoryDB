import type { FormEvent } from 'react'

import { formatCatalogGroupTreeLabel, type CatalogGroupTreeItem } from '../../domain/catalogGroupTree'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogFieldDefinition,
} from '../../types'
import { ImageDropzone } from '../ImageDropzone'
import { CatalogEntryFieldInput } from './CatalogEntryFields'

type CatalogEntryEditorPageProps = {
  activeCatalog: Catalog
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogEntryDraft: CatalogEntryDraft
  catalogFields: CatalogFieldDefinition[]
  catalogGroupTree: CatalogGroupTreeItem[]
  editingCatalogEntryId: number | null
  projectId: number | null
  t: Record<string, string>
  onCancelCatalogEntryEdit: () => void
  onCatalogEntryDraftChange: (draft: CatalogEntryDraft) => void
  onCreateCatalogEntry: () => void
  onImageUploadError: () => void
}

export function CatalogEntryEditorPage({
  activeCatalog,
  catalogEntriesByCatalogId,
  catalogEntryDraft,
  catalogFields,
  catalogGroupTree,
  editingCatalogEntryId,
  projectId,
  t,
  onCancelCatalogEntryEdit,
  onCatalogEntryDraftChange,
  onCreateCatalogEntry,
  onImageUploadError,
}: CatalogEntryEditorPageProps) {
  const submitCatalogEntry = (event: FormEvent) => {
    event.preventDefault()
    onCreateCatalogEntry()
  }

  return (
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
              onChange={(event) => onCatalogEntryDraftChange({ ...catalogEntryDraft, name: event.target.value })}
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
                    activeCatalog.hierarchyMode === 'entriesInGroup' ? [] : catalogEntryDraft.parentEntryIds,
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
                      parentEntryIds: Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
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
  )
}
