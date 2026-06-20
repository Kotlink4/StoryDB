import type { Catalog, CatalogHierarchyMode } from '../../types'

export function CatalogPageControls({
  activeCatalog,
  t,
  onCatalogHierarchySettingsChange,
  onCreateCatalogEntryGroup,
  onShowEntryForm,
  onShowTemplate,
}: {
  activeCatalog: Catalog
  t: Record<string, string>
  onCatalogHierarchySettingsChange: (
    catalog: Catalog,
    supportsHierarchy: boolean,
    hierarchyMode: CatalogHierarchyMode,
  ) => void
  onCreateCatalogEntryGroup: () => void
  onShowEntryForm: () => void
  onShowTemplate: () => void
}) {
  return (
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
  )
}
