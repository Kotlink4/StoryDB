import type { Dispatch, SetStateAction } from 'react'

import { uploadImageRequest } from '../api'
import { buildCatalogGroupTree, formatCatalogGroupTreeLabel } from '../domain/catalogGroupTree'
import { catalogTemplateLabels, type PreviewLanguage, type PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryDraft,
  CatalogEntryGroup,
  CatalogFieldDefinition,
  StructureAssignment,
} from '../types'
import type { ValidationIssueMap } from '../validation'
import { CatalogEntryFieldInput } from './CatalogEntryDetail'
import { CatalogEntryStructureMembership } from './CatalogEntryStructureMembership'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { CoverDropzone } from './ImageInputs'
import { PreviewDialog } from './StylePreviewPrimitives'

export function CatalogGroupDialog({
  catalog,
  catalogGroupName,
  catalogGroupParentIds,
  catalogGroups,
  editingCatalogGroupId,
  validationErrors,
  ui,
  onCancel,
  onCatalogGroupNameChange,
  onCatalogGroupParentIdsChange,
  onSave,
}: {
  catalog: Catalog
  catalogGroupName: string
  catalogGroupParentIds: number[]
  catalogGroups: CatalogEntryGroup[]
  editingCatalogGroupId: number | null
  validationErrors?: ValidationIssueMap
  ui: PreviewText
  onCancel: () => void
  onCatalogGroupNameChange: (value: string) => void
  onCatalogGroupParentIdsChange: (value: number[]) => void
  onSave: () => void
}) {
  const catalogGroupTree = buildCatalogGroupTree(catalogGroups)
  const formRef = useFirstInvalidFieldFocus(validationErrors)

  return (
    <PreviewDialog title={`${editingCatalogGroupId === null ? ui.newGroup : ui.edit}: ${catalog.name}`} onClose={onCancel}>
      <div className="sp-form" ref={formRef}>
        <label className="wide">
          {ui.groupName}
          <input
            value={catalogGroupName}
            onChange={(event) => onCatalogGroupNameChange(event.target.value)}
            {...getFieldValidationProps('name', validationErrors, 'catalog-group-name-error')}
          />
          <FieldError id="catalog-group-name-error" message={validationErrors?.name} />
        </label>
        {catalog.supportsHierarchy && catalog.hierarchyMode === 'groups' && (
          <label className="wide">
            {ui.parentGroups}
            <select
              multiple
              value={catalogGroupParentIds.map(String)}
              onChange={(event) =>
                onCatalogGroupParentIdsChange(
                  Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                )
              }
            >
              {catalogGroupTree
                .filter(({ group }) => group.id !== editingCatalogGroupId)
                .map(({ group, depth }) => (
                  <option key={group.id} value={group.id}>
                    {formatCatalogGroupTreeLabel(group, depth)}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {editingCatalogGroupId === null ? ui.create : ui.save}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}

export function CatalogEntryDialog({
  catalog,
  catalogEntries,
  catalogEntriesByCatalogId,
  catalogEntryDraft,
  catalogGroups,
  catalogs,
  editingCatalogEntryId,
  fieldDefinitions,
  language,
  selectedProjectId,
  validationErrors,
  ui,
  onCatalogEntryStructureAssignmentsChange,
  onCancel,
  onCatalogEntryDraftChange,
  onSave,
}: {
  catalog: Catalog
  catalogEntries: CatalogEntry[]
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogEntryDraft: CatalogEntryDraft
  catalogGroups: CatalogEntryGroup[]
  catalogs: Catalog[]
  editingCatalogEntryId: number | null
  fieldDefinitions: CatalogFieldDefinition[]
  language: PreviewLanguage
  selectedProjectId: number | null
  validationErrors?: ValidationIssueMap
  ui: PreviewText
  onCatalogEntryStructureAssignmentsChange?: (catalogEntryId: number, assignments: StructureAssignment[]) => void
  onCancel: () => void
  onCatalogEntryDraftChange: Dispatch<SetStateAction<CatalogEntryDraft>>
  onSave: () => void
}) {
  const catalogTemplateUi = catalogTemplateLabels[language]
  const catalogGroupTree = buildCatalogGroupTree(catalogGroups)
  const formRef = useFirstInvalidFieldFocus(validationErrors)
  const catalogEntry = catalogEntries.find((entry) => entry.id === editingCatalogEntryId) ?? null

  return (
    <PreviewDialog title={`${editingCatalogEntryId === null ? ui.newCatalogEntry : ui.edit}: ${catalog.name}`} onClose={onCancel}>
      <div className="sp-form" ref={formRef}>
        <label className="catalog-entry-name-field">
          {ui.firstName}
          <input
            value={catalogEntryDraft.name}
            onChange={(event) => onCatalogEntryDraftChange((draft) => ({ ...draft, name: event.target.value }))}
            {...getFieldValidationProps('name', validationErrors, 'catalog-entry-name-error')}
          />
          <FieldError id="catalog-entry-name-error" message={validationErrors?.name} />
        </label>
        <label className="catalog-entry-group-field">
          {ui.group}
          <select
            value={catalogEntryDraft.entryGroupId}
            onChange={(event) =>
              onCatalogEntryDraftChange((draft) => ({
                ...draft,
                entryGroupId: event.target.value,
                parentEntryIds: catalog.hierarchyMode === 'entriesInGroup' ? [] : draft.parentEntryIds,
              }))
            }
          >
            <option value="">{ui.noGroup}</option>
            {catalogGroupTree.map(({ group, depth }) => (
              <option key={group.id} value={group.id}>
                {formatCatalogGroupTreeLabel(group, depth)}
              </option>
            ))}
          </select>
        </label>
        {catalog.supportsHierarchy && catalog.hierarchyMode !== 'groups' && (
          <label className="wide">
            {ui.parentEntries}
            <select
              multiple
              value={catalogEntryDraft.parentEntryIds.map(String)}
              onChange={(event) =>
                onCatalogEntryDraftChange((draft) => ({
                  ...draft,
                  parentEntryIds: Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                }))
              }
            >
              {catalogEntries
                .filter((entry) => entry.id !== editingCatalogEntryId)
                .filter(
                  (entry) =>
                    catalog.hierarchyMode !== 'entriesInGroup' ||
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
        <CoverDropzone
          className="catalog-entry-image"
          imagePath={catalogEntryDraft.imagePath}
          label={ui.image}
          validationErrorId="catalog-entry-image-error"
          validationErrors={validationErrors}
          validationField="imagePath"
          ui={ui}
          onFileSelected={(file) => {
            void uploadImageRequest(file, selectedProjectId).then((result) =>
              onCatalogEntryDraftChange((draft) => ({ ...draft, imagePath: result.path })),
            )
          }}
        />
        <label className="wide">
          {ui.description}
          <textarea
            value={catalogEntryDraft.description}
            onChange={(event) =>
              onCatalogEntryDraftChange((draft) => ({ ...draft, description: event.target.value }))
            }
            {...getFieldValidationProps('description', validationErrors, 'catalog-entry-description-error')}
          />
          <FieldError id="catalog-entry-description-error" message={validationErrors?.description} />
        </label>
        <section className="sp-form-section wide">
          <h3>{catalogTemplateUi.template}</h3>
          {fieldDefinitions.length === 0 ? (
            <p>{catalogTemplateUi.noFields}</p>
          ) : (
            <div className="sp-template-field-grid">
              {fieldDefinitions.map((field) => (
                <CatalogEntryFieldInput
                  catalogEntriesByCatalogId={catalogEntriesByCatalogId}
                  field={field}
                  key={field.id}
                  language={language}
                  value={catalogEntryDraft.fieldValues[field.id] ?? ''}
                  onChange={(value) =>
                    onCatalogEntryDraftChange((draft) => ({
                      ...draft,
                      fieldValues: {
                        ...draft.fieldValues,
                        [field.id]: value,
                      },
                    }))
                  }
                />
              ))}
            </div>
          )}
        </section>
        <CatalogEntryStructureMembership
          catalogEntry={catalogEntry}
          catalogs={catalogs}
          selectedProjectId={selectedProjectId}
          ui={ui}
          onAssignmentsChange={(assignments) => {
            if (catalogEntry !== null) {
              onCatalogEntryStructureAssignmentsChange?.(catalogEntry.id, assignments)
            }
          }}
        />
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {editingCatalogEntryId === null ? ui.create : ui.save}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
