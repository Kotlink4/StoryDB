import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  DraftCatalogSelection,
} from '../../types'

type ObjectEditorCatalogsTabProps = {
  catalogEntriesByCatalogId: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId: Record<number, CatalogEntryGroup[]>
  catalogs: Catalog[]
  draftCatalogSelections: DraftCatalogSelection[]
  ui: PreviewText
  onDraftCatalogSelectionsChange: (selections: DraftCatalogSelection[]) => void
}

export function ObjectEditorCatalogsTab({
  catalogEntriesByCatalogId,
  catalogGroupsByCatalogId,
  catalogs,
  draftCatalogSelections,
  ui,
  onDraftCatalogSelectionsChange,
}: ObjectEditorCatalogsTabProps) {
  const addCatalogSelection = () =>
    onDraftCatalogSelectionsChange([
      ...draftCatalogSelections,
      { targetType: 'catalog', catalogId: '', catalogEntryGroupId: '', catalogEntryId: '' },
    ])

  return (
    <div className="sp-editor-stack">
      <button className="sp-button" type="button" onClick={addCatalogSelection}>
        {ui.addCatalogEntry}
      </button>
      {draftCatalogSelections.map((selection, index) => {
        const catalogId = Number(selection.catalogId)
        return (
          <div className="sp-editor-row multi" key={index}>
            <select
              value={selection.targetType}
              onChange={(event) =>
                onDraftCatalogSelectionsChange(
                  draftCatalogSelections.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, targetType: event.target.value as DraftCatalogSelection['targetType'] }
                      : item,
                  ),
                )
              }
            >
              <option value="catalog">{ui.catalog}</option>
              <option value="group">{ui.group}</option>
              <option value="entry">{ui.entry}</option>
            </select>
            <select
              value={selection.catalogId}
              onChange={(event) =>
                onDraftCatalogSelectionsChange(
                  draftCatalogSelections.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, catalogId: event.target.value, catalogEntryGroupId: '', catalogEntryId: '' }
                      : item,
                  ),
                )
              }
            >
              <option value="">{ui.chooseCatalog}</option>
              {catalogs.map((catalog) => (
                <option key={catalog.id} value={catalog.id}>
                  {catalog.name}
                </option>
              ))}
            </select>
            {selection.targetType === 'group' && (
              <select
                value={selection.catalogEntryGroupId}
                onChange={(event) =>
                  onDraftCatalogSelectionsChange(
                    draftCatalogSelections.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, catalogEntryGroupId: event.target.value } : item,
                    ),
                  )
                }
              >
                <option value="">{ui.chooseGroup}</option>
                {(catalogGroupsByCatalogId[catalogId] ?? []).map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
            {selection.targetType === 'entry' && (
              <select
                value={selection.catalogEntryId}
                onChange={(event) =>
                  onDraftCatalogSelectionsChange(
                    draftCatalogSelections.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, catalogEntryId: event.target.value } : item,
                    ),
                  )
                }
              >
                <option value="">{ui.chooseEntry}</option>
                {(catalogEntriesByCatalogId[catalogId] ?? []).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() =>
                onDraftCatalogSelectionsChange(draftCatalogSelections.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              {ui.delete}
            </button>
          </div>
        )
      })}
    </div>
  )
}
