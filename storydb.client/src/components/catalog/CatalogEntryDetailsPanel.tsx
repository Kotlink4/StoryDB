import { resolveAssetUrl } from '../../api'
import type {
  CatalogEntry,
  CatalogFieldDefinition,
} from '../../types'
import { CatalogEntryFieldValueView } from './CatalogEntryFields'

type CatalogEntryDetailsPanelProps = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogEntry: CatalogEntry
  catalogFields: CatalogFieldDefinition[]
  t: Record<string, string>
  onOpenReferencedCatalogEntry: (catalogId: number, entryId: number) => void
}

export function CatalogEntryDetailsPanel({
  catalogEntriesByCatalogId,
  catalogEntry,
  catalogFields,
  t,
  onOpenReferencedCatalogEntry,
}: CatalogEntryDetailsPanelProps) {
  const imageUrl = resolveAssetUrl(catalogEntry.imagePath)

  return (
    <section className="catalog-entry-page">
      <div className="catalog-entry-dossier">
        {imageUrl !== null && <img src={imageUrl} alt="" />}
        <div>
          <p className="setting-label">
            {catalogEntry.entryGroupName ?? t.primaryAttributeGroup}
          </p>
          {catalogEntry.description === null || catalogEntry.description.length === 0 ? (
            <section className="empty-state compact" aria-live="polite">
              <h2>{t.description}</h2>
            </section>
          ) : (
            <p>{catalogEntry.description}</p>
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
                    entry={catalogEntry}
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
  )
}
