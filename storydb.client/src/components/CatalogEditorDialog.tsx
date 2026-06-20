import type { Dispatch, SetStateAction } from 'react'

import { catalogTemplateLabels, type PreviewLanguage, type PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type {
  Catalog,
  CatalogFieldDataType,
  CatalogFieldDefinition,
  CatalogFieldDraft,
  CatalogHierarchyMode,
} from '../types'
import type { ValidationIssueMap } from '../validation'
import { catalogFieldDataTypeLabels, formatCatalogFieldDefinition } from './catalogFieldDefinitionDisplay'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { KebabMenu, PreviewDialog } from './StylePreviewPrimitives'

export type CatalogDialogTab = 'main' | 'template'

const catalogFieldDataTypes: CatalogFieldDataType[] = [
  'text',
  'longText',
  'number',
  'select',
  'entryReference',
  'multipleEntryReference',
]

export function CatalogEditorDialog({
  catalogDescription,
  catalogDialogFields,
  catalogDialogTab,
  catalogFieldDraft,
  catalogHierarchyMode,
  catalogName,
  catalogSupportsHierarchy,
  catalogValidationErrors,
  editingCatalogFieldId,
  editingCatalogId,
  fieldValidationErrors,
  language,
  ui,
  visibleCatalogs,
  onCancel,
  onCancelCatalogFieldEdit,
  onCatalogDescriptionChange,
  onCatalogDialogTabChange,
  onCatalogFieldDraftChange,
  onCatalogHierarchyModeChange,
  onCatalogNameChange,
  onCatalogSupportsHierarchyChange,
  onDeleteCatalogField,
  onEditCatalogField,
  onSaveCatalog,
  onSaveCatalogField,
}: {
  catalogDescription: string
  catalogDialogFields: CatalogFieldDefinition[]
  catalogDialogTab: CatalogDialogTab
  catalogFieldDraft: CatalogFieldDraft
  catalogHierarchyMode: CatalogHierarchyMode
  catalogName: string
  catalogSupportsHierarchy: boolean
  catalogValidationErrors?: ValidationIssueMap
  editingCatalogFieldId: number | null
  editingCatalogId: number | null
  fieldValidationErrors?: ValidationIssueMap
  language: PreviewLanguage
  ui: PreviewText
  visibleCatalogs: Catalog[]
  onCancel: () => void
  onCancelCatalogFieldEdit: () => void
  onCatalogDescriptionChange: (value: string) => void
  onCatalogDialogTabChange: (tab: CatalogDialogTab) => void
  onCatalogFieldDraftChange: Dispatch<SetStateAction<CatalogFieldDraft>>
  onCatalogHierarchyModeChange: (mode: CatalogHierarchyMode) => void
  onCatalogNameChange: (value: string) => void
  onCatalogSupportsHierarchyChange: (value: boolean) => void
  onDeleteCatalogField: (fieldId: number) => void
  onEditCatalogField: (field: CatalogFieldDefinition) => void
  onSaveCatalog: () => void
  onSaveCatalogField: () => void
}) {
  const catalogTemplateUi = catalogTemplateLabels[language]
  const catalogFormRef = useFirstInvalidFieldFocus(catalogValidationErrors)
  const fieldFormRef = useFirstInvalidFieldFocus(fieldValidationErrors)

  return (
    <PreviewDialog title={editingCatalogId === null ? ui.newCatalog : ui.edit} onClose={onCancel}>
      <div className="sp-catalog-editor">
        <div className="sp-object-editor-tabs">
          <button
            className={catalogDialogTab === 'main' ? 'active' : ''}
            type="button"
            onClick={() => onCatalogDialogTabChange('main')}
          >
            {ui.main}
          </button>
          <button
            className={catalogDialogTab === 'template' ? 'active' : ''}
            disabled={editingCatalogId === null}
            type="button"
            onClick={() => onCatalogDialogTabChange('template')}
          >
            {catalogTemplateUi.template}
          </button>
        </div>
        {catalogDialogTab === 'main' && (
          <div className="sp-form" ref={catalogFormRef}>
            <label>
              {ui.firstName}
              <input
                value={catalogName}
                onChange={(event) => onCatalogNameChange(event.target.value)}
                {...getFieldValidationProps('name', catalogValidationErrors, 'catalog-name-error')}
              />
              <FieldError id="catalog-name-error" message={catalogValidationErrors?.name} />
            </label>
            <label>
              {ui.hierarchy}
              <select
                value={catalogSupportsHierarchy ? 'yes' : 'no'}
                onChange={(event) => onCatalogSupportsHierarchyChange(event.target.value === 'yes')}
              >
                <option value="no">{ui.normalCatalog}</option>
                <option value="yes">{ui.hierarchical}</option>
              </select>
            </label>
            {catalogSupportsHierarchy && (
              <label>
                {ui.catalogHierarchyMode}
                <select
                  value={catalogHierarchyMode}
                  onChange={(event) => onCatalogHierarchyModeChange(event.target.value as CatalogHierarchyMode)}
                >
                  <option value="entries">{ui.catalogHierarchyEntries}</option>
                  <option value="entriesInGroup">{ui.catalogHierarchyEntriesInGroup}</option>
                  <option value="groups">{ui.catalogHierarchyGroups}</option>
                </select>
              </label>
            )}
            <label className="wide">
              {ui.description}
              <textarea
                value={catalogDescription}
                onChange={(event) => onCatalogDescriptionChange(event.target.value)}
                {...getFieldValidationProps('description', catalogValidationErrors, 'catalog-description-error')}
              />
              <FieldError id="catalog-description-error" message={catalogValidationErrors?.description} />
            </label>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={onCancel}>
                {ui.cancel}
              </button>
              <button className="sp-button primary" type="button" onClick={onSaveCatalog}>
                {editingCatalogId === null ? ui.create : ui.save}
              </button>
            </div>
          </div>
        )}
        {catalogDialogTab === 'template' && (
          <div className="sp-template-editor">
            <div className="sp-form sp-template-form" ref={fieldFormRef}>
              <label>
                {ui.firstName}
                <input
                  value={catalogFieldDraft.name}
                  onChange={(event) =>
                    onCatalogFieldDraftChange((draft) => ({ ...draft, name: event.target.value }))
                  }
                  {...getFieldValidationProps('name', fieldValidationErrors, 'catalog-field-name-error')}
                />
                <FieldError id="catalog-field-name-error" message={fieldValidationErrors?.name} />
              </label>
              <label>
                {catalogTemplateUi.dataType}
                <select
                  value={catalogFieldDraft.dataType}
                  onChange={(event) =>
                    onCatalogFieldDraftChange((draft) => ({
                      ...draft,
                      dataType: event.target.value as CatalogFieldDataType,
                    }))
                  }
                >
                  {catalogFieldDataTypes.map((dataType) => (
                    <option key={dataType} value={dataType}>
                      {catalogFieldDataTypeLabels[dataType][language]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sp-checkbox-field">
                {catalogTemplateUi.required}
                <input
                  checked={catalogFieldDraft.isRequired}
                  type="checkbox"
                  onChange={(event) =>
                    onCatalogFieldDraftChange((draft) => ({ ...draft, isRequired: event.target.checked }))
                  }
                />
              </label>
              {catalogFieldDraft.dataType === 'number' && (
                <>
                  <label>
                    {catalogTemplateUi.min}
                    <input
                      type="number"
                      value={catalogFieldDraft.minValue}
                      onChange={(event) =>
                        onCatalogFieldDraftChange((draft) => ({ ...draft, minValue: event.target.value }))
                      }
                      {...getFieldValidationProps('minValue', fieldValidationErrors, 'catalog-field-min-error')}
                    />
                    <FieldError id="catalog-field-min-error" message={fieldValidationErrors?.minValue} />
                  </label>
                  <label>
                    {catalogTemplateUi.max}
                    <input
                      type="number"
                      value={catalogFieldDraft.maxValue}
                      onChange={(event) =>
                        onCatalogFieldDraftChange((draft) => ({ ...draft, maxValue: event.target.value }))
                      }
                      {...getFieldValidationProps('maxValue', fieldValidationErrors, 'catalog-field-max-error')}
                    />
                    <FieldError id="catalog-field-max-error" message={fieldValidationErrors?.maxValue} />
                  </label>
                </>
              )}
              {catalogFieldDraft.dataType === 'select' && (
                <label className="wide">
                  {catalogTemplateUi.options}
                  <input
                    placeholder={catalogTemplateUi.optionsPlaceholder}
                    value={catalogFieldDraft.optionsText}
                    onChange={(event) =>
                      onCatalogFieldDraftChange((draft) => ({ ...draft, optionsText: event.target.value }))
                    }
                    {...getFieldValidationProps('optionsText', fieldValidationErrors, 'catalog-field-options-error')}
                  />
                  <FieldError id="catalog-field-options-error" message={fieldValidationErrors?.optionsText} />
                </label>
              )}
              {(catalogFieldDraft.dataType === 'entryReference' ||
                catalogFieldDraft.dataType === 'multipleEntryReference') && (
                <label className="wide">
                  {catalogTemplateUi.referenceCatalog}
                  <select
                    value={catalogFieldDraft.referenceCatalogId}
                    onChange={(event) =>
                      onCatalogFieldDraftChange((draft) => ({ ...draft, referenceCatalogId: event.target.value }))
                    }
                    {...getFieldValidationProps('referenceCatalogId', fieldValidationErrors, 'catalog-field-reference-error')}
                  >
                    <option value="">-</option>
                    {visibleCatalogs.map((catalog) => (
                      <option key={catalog.id} value={catalog.id}>
                        {catalog.name}
                      </option>
                    ))}
                  </select>
                  <FieldError id="catalog-field-reference-error" message={fieldValidationErrors?.referenceCatalogId} />
                </label>
              )}
              <div className="sp-dialog-actions">
                {editingCatalogFieldId !== null && (
                  <button className="sp-button" type="button" onClick={onCancelCatalogFieldEdit}>
                    {ui.cancel}
                  </button>
                )}
                <button className="sp-button primary" type="button" onClick={onSaveCatalogField}>
                  {editingCatalogFieldId === null ? catalogTemplateUi.addField : ui.save}
                </button>
              </div>
            </div>
            <section className="sp-panel">
              <h3>{catalogTemplateUi.fields}</h3>
              {catalogDialogFields.length === 0 ? (
                <p>{catalogTemplateUi.noFields}</p>
              ) : (
                catalogDialogFields.map((field) => (
                  <div className="sp-row with-menu" key={field.id}>
                    <span>
                      {field.name}
                      {field.isRequired ? ' *' : ''}
                    </span>
                    <strong>{formatCatalogFieldDefinition(field, visibleCatalogs, language)}</strong>
                    <KebabMenu
                      ui={ui}
                      onDelete={() => onDeleteCatalogField(field.id)}
                      onEdit={() => onEditCatalogField(field)}
                    />
                  </div>
                ))
              )}
            </section>
            <div className="sp-dialog-actions">
              <button className="sp-button" type="button" onClick={onCancel}>
                {ui.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </PreviewDialog>
  )
}
