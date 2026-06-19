import type { CatalogEntry, CatalogFieldDefinition } from '../../types'

type CatalogEntryFieldInputProps = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  field: CatalogFieldDefinition
  t: Record<string, string>
  value: string
  onChange: (value: string) => void
}

export function CatalogEntryFieldInput({
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

export function CatalogEntryFieldValueView({
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
