import { resolveAssetUrl } from '../api'
import { catalogTemplateLabels, type PreviewLanguage, type PreviewText } from '../stylePreviewI18n'
import type { Catalog, CatalogEntry, CatalogFieldDataType, CatalogFieldDefinition } from '../types'
import { LinkedText, type TextLinkTarget } from './LinkedText'
import { KebabMenu } from './StylePreviewPrimitives'

export type CatalogEntryLinkTarget = {
  catalogId: number
  entry: CatalogEntry
}

export const catalogFieldDataTypeLabels: Record<CatalogFieldDataType, { ru: string; en: string }> = {
  text: { ru: 'Текст', en: 'Text' },
  longText: { ru: 'Длинный текст', en: 'Long text' },
  number: { ru: 'Число', en: 'Number' },
  select: { ru: 'Список', en: 'List' },
  entryReference: { ru: 'Ссылка на запись', en: 'Entry link' },
  multipleEntryReference: { ru: 'Несколько ссылок', en: 'Multiple links' },
}

const getInitials = (name: string) => name.trim().slice(0, 1).toUpperCase() || '?'

export const formatCatalogFieldDefinition = (
  field: CatalogFieldDefinition,
  catalogs: Catalog[],
  language: PreviewLanguage,
) => {
  const parts = [catalogFieldDataTypeLabels[field.dataType][language]]

  if (field.dataType === 'number') {
    const bounds = [field.minValue ?? '', field.maxValue ?? ''].join(' - ').trim()
    if (bounds.length > 0) {
      parts.push(bounds)
    }
  }

  if (field.dataType === 'select' && field.options.length > 0) {
    parts.push(field.options.join(', '))
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    parts.push(catalogs.find((catalog) => catalog.id === field.referenceCatalogId)?.name ?? '-')
  }

  return parts.join(' · ')
}

export function CatalogEntryFieldInput({
  catalogEntriesByCatalogId,
  field,
  language,
  value,
  onChange,
}: {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  field: CatalogFieldDefinition
  language: PreviewLanguage
  value: string
  onChange: (value: string) => void
}) {
  const requiredLabel = catalogTemplateLabels[language].required

  if (field.dataType === 'longText') {
    return (
      <label className="wide">
        {field.name}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    )
  }

  if (field.dataType === 'select') {
    return (
      <label>
        {field.name}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.isRequired ? requiredLabel : '-'}</option>
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
        <label className="wide">
          {field.name}
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
      <label>
        {field.name}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{field.isRequired ? requiredLabel : '-'}</option>
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
    <label>
      {field.name}
      <input
        max={field.dataType === 'number' && field.maxValue !== null ? field.maxValue : undefined}
        min={field.dataType === 'number' && field.minValue !== null ? field.minValue : undefined}
        required={field.isRequired}
        type={field.dataType === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function CatalogEntryFieldValue({
  catalogEntryLinksById,
  entry,
  field,
  textLinkTargets,
}: {
  catalogEntryLinksById: Map<number, CatalogEntryLinkTarget>
  entry: CatalogEntry
  field: CatalogFieldDefinition
  textLinkTargets: TextLinkTarget[]
}) {
  const entryValue = entry.fieldValues.find((fieldValue) => fieldValue.fieldDefinitionId === field.id)

  if (entryValue === undefined) {
    return <>-</>
  }

  if (field.dataType === 'entryReference' || field.dataType === 'multipleEntryReference') {
    if (entryValue.referencedEntryIds.length === 0) {
      return <>-</>
    }

    return (
      <>
        {entryValue.referencedEntryIds.map((entryId, index) => {
          const target = catalogEntryLinksById.get(entryId)

          return (
            <span key={entryId}>
              {index > 0 && ', '}
              <LinkedText targets={textLinkTargets} text={target?.entry.name ?? `#${entryId}`} />
            </span>
          )
        })}
      </>
    )
  }

  return <LinkedText emptyText="-" targets={textLinkTargets} text={entryValue.value} />
}

export function CatalogEntryDetail({
  catalog,
  catalogEntryLinksById,
  fieldDefinitions,
  entry,
  textLinkTargets,
  ui,
  onDelete,
  onEdit,
}: {
  catalog: Catalog | null
  catalogEntryLinksById: Map<number, CatalogEntryLinkTarget>
  fieldDefinitions: CatalogFieldDefinition[]
  entry: CatalogEntry
  textLinkTargets: TextLinkTarget[]
  ui: PreviewText
  onDelete: () => void
  onEdit: () => void
}) {
  const imageUrl = resolveAssetUrl(entry.imagePath)

  return (
    <article className="sp-detail-card">
      <div className="sp-detail-menu">
        <KebabMenu ui={ui} onDelete={onDelete} onEdit={onEdit} />
      </div>
      <div className="sp-dossier-head">
        <div className="sp-portrait">
          {imageUrl === null ? getInitials(entry.name) : <img alt="" src={imageUrl} />}
        </div>
        <div>
          <span>{catalog?.name ?? ui.catalog}</span>
          <h2>{entry.name}</h2>
          <p>{entry.entryGroupName ?? ui.noGroup}</p>
        </div>
      </div>
      <div className="sp-fields">
        <div><span>{ui.catalog}</span><strong>{catalog?.name ?? '-'}</strong></div>
        <div><span>{ui.group}</span><strong>{entry.entryGroupName ?? '-'}</strong></div>
        <div><span>{ui.entry}</span><strong>{entry.id}</strong></div>
      </div>
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>
          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={entry.description} />
        </p>
      </section>
      <section className="sp-panel">
        <h3>{ui.fields}</h3>
        {fieldDefinitions.length === 0 ? (
          <p>{ui.noExtraFields}</p>
        ) : (
          fieldDefinitions.map((field) => (
            <div className="sp-row" key={field.id}>
              <span>{field.name}</span>
              <strong>
                <CatalogEntryFieldValue
                  catalogEntryLinksById={catalogEntryLinksById}
                  entry={entry}
                  field={field}
                  textLinkTargets={textLinkTargets}
                />
              </strong>
            </div>
          ))
        )}
      </section>
    </article>
  )
}
