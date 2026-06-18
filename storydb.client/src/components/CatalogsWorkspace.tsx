import type { CSSProperties } from 'react'

import { resolveAssetUrl } from '../api'
import {
  buildCatalogGroupTree,
  countCatalogEntriesInGroupTree,
  getCatalogGroupDescendantIds,
} from '../domain/catalogGroupTree'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { GroupDisplayMode } from '../style-preview/domain/stylePreviewUiTypes'
import type { Catalog, CatalogEntry, CatalogEntryGroup } from '../types'
import { KebabMenu } from './StylePreviewPrimitives'
import { LinkedText, type TextLinkTarget } from './LinkedText'

export function CatalogsWorkspace({
  catalogEntries,
  catalogGroups,
  catalogs,
  groupDisplayMode,
  selectedCatalog,
  selectedCatalogGroupId,
  textLinkTargets,
  ui,
  onDeleteEntry,
  onEditCatalog,
  onEditEntry,
  onEditGroup,
  onCreateEntry,
  onCreateGroup,
  onDeleteCatalog,
  onDeleteGroup,
  onOpenEntry,
  onSelectCatalog,
  onSelectGroup,
}: {
  catalogEntries: CatalogEntry[]
  catalogGroups: CatalogEntryGroup[]
  catalogs: Catalog[]
  groupDisplayMode: GroupDisplayMode
  selectedCatalog: Catalog | null
  selectedCatalogGroupId: number | null
  textLinkTargets: TextLinkTarget[]
  ui: PreviewText
  onDeleteEntry: (entry: CatalogEntry) => void
  onEditCatalog: (catalog: Catalog) => void
  onEditEntry: (entry: CatalogEntry) => void
  onEditGroup: (group: CatalogEntryGroup) => void
  onCreateEntry: () => void
  onCreateGroup: () => void
  onDeleteCatalog: () => void
  onDeleteGroup: (groupId: number) => void
  onOpenEntry: (entry: CatalogEntry) => void
  onSelectCatalog: (catalogId: number) => void
  onSelectGroup: (groupId: number | null) => void
}) {
  const catalogGroupTree = buildCatalogGroupTree(catalogGroups)
  const selectedCatalogGroupIds =
    selectedCatalogGroupId === null ? null : getCatalogGroupDescendantIds(catalogGroups, selectedCatalogGroupId)
  const visibleEntries =
    selectedCatalogGroupId === null
      ? catalogEntries
      : catalogEntries.filter((entry) => entry.entryGroupId !== null && selectedCatalogGroupIds?.has(entry.entryGroupId))

  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{selectedCatalog?.name ?? ui.catalogs}</h2>
          <p>
            <LinkedText
              emptyText={ui.catalogsDescription}
              targets={textLinkTargets}
              text={selectedCatalog?.description}
            />
          </p>
        </div>
        <div className="sp-filters">
          {selectedCatalog !== null && (
            <>
              <KebabMenu ui={ui} onDelete={onDeleteCatalog} onEdit={() => onEditCatalog(selectedCatalog)} />
              {groupDisplayMode === 'subtabs' && (
                <button className="sp-button" type="button" onClick={onCreateGroup}>
                  {ui.newGroup}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="sp-catalog-layout single">
        <aside className="sp-catalog-list">
          {catalogs.map((catalog) => (
            <button
              className={catalog.id === selectedCatalog?.id ? 'active' : ''}
              key={catalog.id}
              type="button"
              onClick={() => onSelectCatalog(catalog.id)}
            >
              <strong>{catalog.name}</strong>
              <span>{catalog.supportsHierarchy ? ui.hierarchical : ui.normalCatalog}</span>
            </button>
          ))}
          {catalogs.length === 0 && <p>{ui.noCatalogs}</p>}
        </aside>
        <section className="sp-catalog-main">
          {selectedCatalog === null ? (
            <div className="sp-empty">
              <strong>{ui.catalogNoSelection}</strong>
              <span>{ui.createOrChooseCatalog}</span>
            </div>
          ) : (
            <>
              {groupDisplayMode === 'blocks' && (
                <div className="sp-group-blocks">
                  <button
                    className={selectedCatalogGroupId === null ? 'active' : ''}
                    type="button"
                    onClick={() => onSelectGroup(null)}
                  >
                    <strong>{ui.all}</strong>
                    <span>{catalogEntries.length}</span>
                  </button>
                  {catalogGroupTree.map(({ group, depth }) => (
                    <div
                      className="sp-group-block"
                      key={group.id}
                      style={{ '--catalog-group-indent': `${depth * 14}px` } as CSSProperties}
                    >
                      <button
                        className={selectedCatalogGroupId === group.id ? 'active' : ''}
                        type="button"
                        onClick={() => onSelectGroup(group.id)}
                      >
                        <strong>{group.name}</strong>
                        <span>{countCatalogEntriesInGroupTree(catalogEntries, catalogGroups, group.id)}</span>
                      </button>
                      <KebabMenu ui={ui} onDelete={() => onDeleteGroup(group.id)} onEdit={() => onEditGroup(group)} />
                    </div>
                  ))}
                  <button className="create" type="button" onClick={onCreateGroup}>
                    + {ui.newGroup}
                  </button>
                </div>
              )}
              <div className={`sp-group-strip ${groupDisplayMode === 'blocks' || groupDisplayMode === 'subtabs' ? 'is-hidden' : ''}`}>
                <button
                  className={selectedCatalogGroupId === null ? 'active' : ''}
                  type="button"
                  onClick={() => onSelectGroup(null)}
                >
                  {ui.all}
                </button>
                {catalogGroupTree.map(({ group, depth }) => (
                  <span
                    className="sp-group-chip"
                    key={group.id}
                    style={{ '--catalog-group-indent': `${depth * 14}px` } as CSSProperties}
                  >
                    <button
                      className={selectedCatalogGroupId === group.id ? 'active' : ''}
                      type="button"
                      onClick={() => onSelectGroup(group.id)}
                    >
                      {group.name}
                    </button>
                    <KebabMenu ui={ui} onDelete={() => onDeleteGroup(group.id)} onEdit={() => onEditGroup(group)} />
                  </span>
                ))}
              </div>
              <div className="sp-catalog-entry-actions">
                <button className="sp-button primary" type="button" onClick={onCreateEntry}>
                  + {ui.newCatalogEntry}
                </button>
              </div>
              <div className="sp-cards">
                {visibleEntries.map((entry) => {
                  const imageUrl = resolveAssetUrl(entry.imagePath)

                  return (
                    <article className="sp-card compact" key={entry.id}>
                      <button className="sp-card-main" type="button" onClick={() => onOpenEntry(entry)}>
                        <div className="sp-portrait">
                          {imageUrl === null ? '#' : <img alt="" src={imageUrl} />}
                        </div>
                      </button>
                      <div className="sp-card-body" onClick={() => onOpenEntry(entry)}>
                        <h3>{entry.name}</h3>
                        <span>{entry.entryGroupName ?? ui.noGroup}</span>
                        <p>
                          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={entry.description} />
                        </p>
                      </div>
                      <KebabMenu ui={ui} onDelete={() => onDeleteEntry(entry)} onEdit={() => onEditEntry(entry)} />
                    </article>
                  )
                })}
                {visibleEntries.length === 0 && (
                  <div className="sp-empty">
                    <strong>{ui.noEntries}</strong>
                    <span>{ui.noEntriesHint}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
