import type {
  Catalog,
  CatalogFieldDataType,
  CatalogFieldDefinition,
  CatalogFieldDraft,
} from '../../types'
import { formatCatalogFieldValue } from './catalogFieldFormatting'

const fieldDataTypes: CatalogFieldDataType[] = [
  'text',
  'longText',
  'number',
  'select',
  'entryReference',
  'multipleEntryReference',
]

type CatalogTemplatePanelProps = {
  catalogFieldDraft: CatalogFieldDraft
  catalogFields: CatalogFieldDefinition[]
  catalogs: Catalog[]
  editingCatalogFieldId: number | null
  t: Record<string, string>
  onCancelCatalogFieldEdit: () => void
  onCatalogFieldDraftChange: (draft: CatalogFieldDraft) => void
  onCreateCatalogField: () => void
  onDeleteCatalogField: (field: CatalogFieldDefinition) => void
  onEditCatalogField: (field: CatalogFieldDefinition) => void
}

export function CatalogTemplatePanel({
  catalogFieldDraft,
  catalogFields,
  catalogs,
  editingCatalogFieldId,
  t,
  onCancelCatalogFieldEdit,
  onCatalogFieldDraftChange,
  onCreateCatalogField,
  onDeleteCatalogField,
  onEditCatalogField,
}: CatalogTemplatePanelProps) {
  return (
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
  )
}
