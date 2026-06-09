import { ChevronRight } from 'lucide-react'
import type {
  AttributeGroup,
  Catalog,
  CatalogEntryGroup,
  ModuleSubTab,
  WorkspaceSection,
} from '../types'

type CatalogSidebarSectionProps = {
  activeAttributeGroupId: number | null
  activeCatalogId: number | null
  attributeGroups: AttributeGroup[]
  catalogEntryGroupFilter: string
  catalogEntryGroups: CatalogEntryGroup[]
  catalogs: Catalog[]
  moduleSubTab: ModuleSubTab
  t: Record<string, string>
  workspaceSection: WorkspaceSection
  onCreateAttributeGroup: () => void
  onCreateCatalog: () => void
  onCreateCatalogEntryGroup: () => void
  onOpenAttributeGroup: (groupId: number | null) => void
  onOpenAttributes: () => void
  onOpenCatalog: (catalogId: number) => void
  onOpenCatalogEntryGroup: (groupId: number) => void
}

export function CatalogSidebarSection({
  activeAttributeGroupId,
  activeCatalogId,
  attributeGroups,
  catalogEntryGroupFilter,
  catalogEntryGroups,
  catalogs,
  moduleSubTab,
  t,
  workspaceSection,
  onCreateAttributeGroup,
  onCreateCatalog,
  onCreateCatalogEntryGroup,
  onOpenAttributeGroup,
  onOpenAttributes,
  onOpenCatalog,
  onOpenCatalogEntryGroup,
}: CatalogSidebarSectionProps) {
  return (
    <div className="sidebar-group is-module-start">
      <div className="sidebar-catalog-list" role="group" aria-label={t.catalogs}>
        <button
          className={workspaceSection === 'attributes' ? 'sidebar-button is-active' : 'sidebar-button'}
          type="button"
          onClick={onOpenAttributes}
        >
          <ChevronRight aria-hidden="true" className="sidebar-chevron" size={16} />
          <span>{t.attributeDictionary}</span>
        </button>
        {workspaceSection === 'attributes' && (
          <div className="sidebar-subnav sidebar-nested-subnav" role="group">
            <button
              className={moduleSubTab === 'attributes' ? 'sidebar-subbutton is-active' : 'sidebar-subbutton'}
              type="button"
              onClick={() => onOpenAttributeGroup(null)}
            >
              {t.primaryAttributeGroup}
            </button>
            {attributeGroups.map((group) => (
              <button
                className={
                  moduleSubTab === 'attributeGroup' && activeAttributeGroupId === group.id
                    ? 'sidebar-subbutton is-active'
                    : 'sidebar-subbutton'
                }
                key={group.id}
                type="button"
                onClick={() => onOpenAttributeGroup(group.id)}
              >
                {group.name}
              </button>
            ))}
            <button className="sidebar-subbutton create-subbutton" type="button" onClick={onCreateAttributeGroup}>
              + {t.createAttributeGroup}
            </button>
          </div>
        )}
        {catalogs.map((catalog) => {
          const isCatalogActive = workspaceSection === 'catalogs' && activeCatalogId === catalog.id

          return (
            <div className="sidebar-catalog-block" key={catalog.id}>
              <button
                className={isCatalogActive ? 'sidebar-button is-active' : 'sidebar-button'}
                type="button"
                onClick={() => onOpenCatalog(catalog.id)}
              >
                <ChevronRight aria-hidden="true" className="sidebar-chevron" size={16} />
                <span>{catalog.name}</span>
              </button>
              {isCatalogActive && (
                <div className="sidebar-subnav sidebar-nested-subnav" role="group">
                  {catalogEntryGroups.map((group) => (
                    <button
                      className={
                        catalogEntryGroupFilter === String(group.id)
                          ? 'sidebar-subbutton is-active'
                          : 'sidebar-subbutton'
                      }
                      key={group.id}
                      type="button"
                      onClick={() => onOpenCatalogEntryGroup(group.id)}
                    >
                      {group.name}
                    </button>
                  ))}
                  <button
                    className="sidebar-subbutton create-subbutton"
                    type="button"
                    onClick={onCreateCatalogEntryGroup}
                  >
                    + {t.createAttributeGroup}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <button className="sidebar-subbutton create-subbutton" type="button" onClick={onCreateCatalog}>
          + {t.newCatalog}
        </button>
      </div>
    </div>
  )
}
