import { getInitials } from '../style-preview/domain/previewDisplay'
import { buildCatalogGroupTree } from '../domain/catalogGroupTree'
import type { CSSProperties } from 'react'
import type { PreviewSection, PreviewTab } from '../style-preview/domain/stylePreviewRouting'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import {
  objectSections,
} from '../style-preview/domain/stylePreviewConfig'
import type {
  AttributeGroup,
  AuthUser,
  Catalog,
  CatalogEntryGroup,
  ObjectTypeKey,
  StoryProject,
} from '../types'
import type { GroupDisplayMode } from '../style-preview/domain/stylePreviewUiTypes'
import {
  KebabMenu,
  SectionIcon,
} from './StylePreviewPrimitives'

const getTabLabel = (tab: PreviewTab, ui: PreviewText) =>
  tab === 'database' ? ui.database : tab === 'relations' ? ui.relations : ui.timeline

export function StylePreviewTopbar({
  activeTab,
  currentUser,
  currentUserAvatarUrl,
  isSettingsOpen,
  searchQuery,
  showWorkspaceTabs,
  showSearch,
  ui,
  onCreateObject,
  onLogin,
  onLogout,
  onNavigateTab,
  onOpenProfile,
  onOpenSettings,
  onSearchQueryChange,
  onToggleSettingsMenu,
}: {
  activeTab: PreviewTab | null
  currentUser: AuthUser | null
  currentUserAvatarUrl: string | null
  isSettingsOpen: boolean
  searchQuery: string
  showWorkspaceTabs: boolean
  showSearch: boolean
  ui: PreviewText
  onCreateObject: () => void
  onLogin: () => void
  onLogout: () => void
  onNavigateTab: (tab: PreviewTab) => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  onSearchQueryChange: (query: string) => void
  onToggleSettingsMenu: () => void
}) {
  return (
    <header className="sp-topbar">
      <div className="sp-brand">
        <div className="sp-logo">S</div>
        <div>
          <h1>StoryDB</h1>
          <span>{ui.appSubtitle}</span>
        </div>
      </div>
      {showWorkspaceTabs && (
        <div className="sp-tabs sp-main-tabs">
          {(['database', 'relations', 'timeline'] as PreviewTab[]).map((tab) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => onNavigateTab(tab)}
            >
              {getTabLabel(tab, ui)}
            </button>
          ))}
        </div>
      )}
      {showSearch && (
        <label className="sp-search">
          <svg aria-hidden="true" className="sp-search-svg" fill="none" viewBox="0 0 24 24">
            <path d="m21 21-4.4-4.4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            placeholder={ui.searchPlaceholder}
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
          />
        </label>
      )}
      <div className="sp-actions">
        <button className="sp-button" type="button" onClick={onToggleSettingsMenu}>
          {ui.settings}
        </button>
        <div className="sp-profile">
          <button className="sp-avatar-button" type="button" onClick={onToggleSettingsMenu}>
            {currentUserAvatarUrl === null ? (
              getInitials(currentUser?.displayName ?? 'A')
            ) : (
              <img alt="" src={currentUserAvatarUrl} />
            )}
          </button>
          {isSettingsOpen && (
            <div className="sp-profile-menu">
              <button type="button" onClick={onOpenProfile}>
                {ui.profile}
              </button>
              <button type="button" onClick={onOpenSettings}>
                {ui.settings}
              </button>
              {currentUser !== null && (
                <button type="button" onClick={onLogout}>
                  {ui.logout}
                </button>
              )}
            </div>
          )}
        </div>
        {currentUser === null ? (
          <button className="sp-button primary" type="button" onClick={onLogin}>
            {ui.login}
          </button>
        ) : (
          <button className="sp-button primary sp-top-create" type="button" onClick={onCreateObject}>
            + {ui.newObject}
          </button>
        )}
      </div>
    </header>
  )
}

export function StylePreviewProjectbar({
  activeTab,
  currentUser,
  projects,
  selectedProjectId,
  showWorkspaceTabs,
  ui,
  onCreateObject,
  onNavigateProject,
  onNavigateTab,
}: {
  activeTab: PreviewTab
  currentUser: AuthUser | null
  projects: StoryProject[]
  selectedProjectId: number | null
  showWorkspaceTabs: boolean
  ui: PreviewText
  onCreateObject: () => void
  onNavigateProject: (projectId: number | null) => void
  onNavigateTab: (tab: PreviewTab) => void
}) {
  return (
    <div className="sp-projectbar">
      <div>
        <span>{ui.project}</span>
        <select
          value={selectedProjectId ?? ''}
          onChange={(event) => {
            const nextProjectId = event.target.value === '' ? null : Number(event.target.value)

            onNavigateProject(nextProjectId)
          }}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      {showWorkspaceTabs && (
        <div className="sp-tabs">
          {(['database', 'relations', 'timeline'] as PreviewTab[]).map((tab) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => onNavigateTab(tab)}
            >
              {getTabLabel(tab, ui)}
            </button>
          ))}
        </div>
      )}
      {currentUser !== null && (
        <button className="sp-button primary sp-project-create" type="button" onClick={onCreateObject}>
          + {ui.newObject}
        </button>
      )}
    </div>
  )
}

export function StylePreviewSidebar({
  activeSection,
  activeTab,
  attributeGroups,
  catalogGroups,
  currentUser,
  enabledObjectTypes,
  groupDisplayMode,
  selectedAttributeGroupId,
  selectedCatalog,
  selectedCatalogGroupId,
  selectedProject,
  ui,
  visibleCatalogs,
  visibleObjectsCount,
  visibleTimelineEventsCount,
  onCreateCatalog,
  onCreateCatalogGroup,
  onCreateObject,
  onDeleteAttributeGroup,
  onDeleteCatalog,
  onDeleteCatalogGroup,
  onEditAttributeGroup,
  onEditCatalog,
  onEditCatalogGroup,
  onNavigateTab,
  onNavigateWorkspace,
  onSelectAttributeGroup,
  onSelectCatalogGroup,
}: {
  activeSection: PreviewSection
  activeTab: PreviewTab
  attributeGroups: AttributeGroup[]
  catalogGroups: CatalogEntryGroup[]
  currentUser: AuthUser | null
  enabledObjectTypes: ObjectTypeKey[]
  groupDisplayMode: GroupDisplayMode
  selectedAttributeGroupId: number | null
  selectedCatalog: Catalog | null
  selectedCatalogGroupId: number | null
  selectedProject: StoryProject | null
  ui: PreviewText
  visibleCatalogs: Catalog[]
  visibleObjectsCount: number
  visibleTimelineEventsCount: number
  onCreateCatalog: () => void
  onCreateCatalogGroup: () => void
  onCreateObject: () => void
  onDeleteAttributeGroup: (group: AttributeGroup) => void
  onDeleteCatalog: (catalog: Catalog) => void
  onDeleteCatalogGroup: (group: CatalogEntryGroup) => void
  onEditAttributeGroup: (group: AttributeGroup) => void
  onEditCatalog: (catalog: Catalog) => void
  onEditCatalogGroup: (group: CatalogEntryGroup) => void
  onNavigateTab: (tab: PreviewTab) => void
  onNavigateWorkspace: (tab: PreviewTab, section: PreviewSection, objectId?: number | null, catalogId?: number | null) => void
  onSelectAttributeGroup: (groupId: number | null) => void
  onSelectCatalogGroup: (groupId: number | null) => void
}) {
  const catalogGroupTree = buildCatalogGroupTree(catalogGroups)

  return (
    <aside className="sp-sidebar">
      <nav className="sp-sidebar-tabs" aria-label={ui.project}>
        {(['database', 'relations', 'timeline'] as PreviewTab[]).map((tab) => (
          <button
            className={activeTab === tab ? 'active' : ''}
            key={tab}
            type="button"
            onClick={() => onNavigateTab(tab)}
          >
            {getTabLabel(tab, ui)}
          </button>
        ))}
        {currentUser !== null && (
          <button className="create" type="button" onClick={onCreateObject}>
            + {ui.newObject}
          </button>
        )}
      </nav>
      <div className="sp-project-card">
        <strong>{selectedProject?.name ?? ui.projectNotSelected}</strong>
        <span>{visibleObjectsCount} {ui.objectsCount} · {visibleTimelineEventsCount} {ui.eventsCount}</span>
      </div>
      <section>
        <p>{ui.database}</p>
        {objectSections
          .filter((section) => enabledObjectTypes.includes(section.key))
          .map((section) => (
            <button
              className={activeSection === section.key && activeTab === 'database' ? 'active' : ''}
              key={section.key}
              type="button"
              onClick={() => onNavigateWorkspace('database', section.key)}
            >
              <SectionIcon name={section.icon} />
              {ui[section.labelKey]}
            </button>
          ))}
      </section>
      <section>
        <p>{ui.catalogs}</p>
        <button
          className={activeSection === 'attributes' && activeTab === 'database' ? 'active' : ''}
          type="button"
          onClick={() => onNavigateWorkspace('database', 'attributes')}
        >
          <SectionIcon name="attributes" />
          {ui.attributes}
        </button>
        <button
          className={activeSection === 'structures' && activeTab === 'database' ? 'active' : ''}
          type="button"
          onClick={() => onNavigateWorkspace('database', 'structures')}
        >
          <SectionIcon name="structures" />
          {ui.structures}
        </button>
        {groupDisplayMode === 'subtabs' && activeSection === 'attributes' && activeTab === 'database' && (
          <div className="sp-sidebar-subtabs">
            <button
              className={selectedAttributeGroupId === null ? 'active' : ''}
              type="button"
              onClick={() => onSelectAttributeGroup(null)}
            >
              {ui.all}
            </button>
            {attributeGroups.map((group) => (
              <div className="sp-sidebar-subtab-row" key={group.id}>
                <button
                  className={selectedAttributeGroupId === group.id ? 'active' : ''}
                  type="button"
                  onClick={() => onSelectAttributeGroup(group.id)}
                >
                  {group.name}
                </button>
                <KebabMenu
                  ui={ui}
                  onDelete={() => onDeleteAttributeGroup(group)}
                  onEdit={() => onEditAttributeGroup(group)}
                />
              </div>
            ))}
          </div>
        )}
        {visibleCatalogs.map((catalog) => (
          <div className="sp-sidebar-catalog" key={catalog.id}>
            <div className="sp-sidebar-catalog-row">
              <button
                className={
                  activeSection === 'catalogs' && activeTab === 'database' && selectedCatalog?.id === catalog.id
                    ? 'active'
                    : ''
                }
                type="button"
                onClick={() => {
                  onSelectCatalogGroup(null)
                  onNavigateWorkspace('database', 'catalogs', null, catalog.id)
                }}
              >
                <SectionIcon name="catalogs" />
                {catalog.name}
              </button>
              <KebabMenu
                ui={ui}
                onDelete={() => onDeleteCatalog(catalog)}
                onEdit={() => onEditCatalog(catalog)}
              />
            </div>
            {groupDisplayMode === 'subtabs' &&
              activeSection === 'catalogs' &&
              activeTab === 'database' &&
              selectedCatalog?.id === catalog.id && (
                <div className="sp-sidebar-subtabs">
                  <button
                    className={selectedCatalogGroupId === null ? 'active' : ''}
                    type="button"
                    onClick={() => onSelectCatalogGroup(null)}
                  >
                    {ui.all}
                  </button>
                  {catalogGroupTree.map(({ group, depth }) => (
                    <div className="sp-sidebar-subtab-row" key={group.id}>
                      <button
                        className={selectedCatalogGroupId === group.id ? 'active' : ''}
                        style={{ '--catalog-group-indent': `${depth * 14}px` } as CSSProperties}
                        type="button"
                        onClick={() => onSelectCatalogGroup(group.id)}
                      >
                        {group.name}
                      </button>
                      <KebabMenu
                        ui={ui}
                        onDelete={() => onDeleteCatalogGroup(group)}
                        onEdit={() => onEditCatalogGroup(group)}
                      />
                    </div>
                  ))}
                  <button className="sp-sidebar-create" type="button" onClick={onCreateCatalogGroup}>
                    + {ui.newGroup}
                  </button>
                </div>
              )}
          </div>
        ))}
        {currentUser !== null && (
          <button className="sp-sidebar-create" type="button" onClick={onCreateCatalog}>
            + {ui.newCatalog}
          </button>
        )}
      </section>
    </aside>
  )
}
