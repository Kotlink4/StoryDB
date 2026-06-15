import { lazy, Suspense, type ComponentProps } from 'react'

import type { PreviewSection, PreviewTab } from '../style-preview/domain/stylePreviewRouting'
import type { DetailMode } from '../style-preview/domain/stylePreviewUiTypes'
import type { AuthUser, StoryProject } from '../types'
import { AttributesWorkspace } from './AttributesWorkspace'
import { CatalogsWorkspace } from './CatalogsWorkspace'
import { ObjectCardsWorkspace } from './ObjectCardsWorkspace'
import type { RelationsPageProps } from './RelationsPage'
import { StructuresWorkspace } from './StructuresWorkspace'
import { ProfilePage } from './StylePreviewProfilePage'
import { ProjectSearchResults, type ProjectSearchResultGroup } from './ProjectSearchResults'
import { SettingsPage } from './StylePreviewSettingsPage'
import type { TimelinePageProps } from './TimelinePage'
import {
  StylePreviewCatalogEntryDetailPage,
  StylePreviewObjectDetailPage,
  StylePreviewRelationDetailPage,
  StylePreviewTimelineEventDetailPage,
} from './StylePreviewDetailPages'

type CatalogEntryDetailPageProps = ComponentProps<typeof StylePreviewCatalogEntryDetailPage>
type ObjectDetailPageProps = ComponentProps<typeof StylePreviewObjectDetailPage>
type RelationDetailPageProps = ComponentProps<typeof StylePreviewRelationDetailPage>
type TimelineEventDetailPageProps = ComponentProps<typeof StylePreviewTimelineEventDetailPage>

const LazyRelationsPage = lazy(() => import('./RelationsPage').then((module) => ({ default: module.RelationsPage })))
const LazyTimelinePage = lazy(() => import('./TimelinePage').then((module) => ({ default: module.TimelinePage })))

export function StylePreviewContent({
  activeSection,
  activeTab,
  attributesWorkspaceProps,
  catalogEntryDetailPageProps,
  catalogsWorkspaceProps,
  currentUser,
  detailMode,
  isObjectPageOpen,
  isProfilePageOpen,
  isRelationPageOpen,
  isSettingsPageOpen,
  isTimelineEventPageOpen,
  objectCardsWorkspaceProps,
  objectDetailPageProps,
  profilePageProps,
  projectSearchGroups,
  projectSearchQuery,
  relationDetailPageProps,
  relationsPageProps,
  selectedCatalogEntry,
  selectedObject,
  selectedProject,
  selectedRelationEdge,
  selectedTimelineEvent,
  settingsPageProps,
  structuresWorkspaceProps,
  timelineEventDetailPageProps,
  timelinePageProps,
  ui,
}: {
  activeSection: PreviewSection
  activeTab: PreviewTab
  attributesWorkspaceProps: ComponentProps<typeof AttributesWorkspace>
  catalogEntryDetailPageProps: Omit<CatalogEntryDetailPageProps, 'selectedCatalogEntry'>
  catalogsWorkspaceProps: ComponentProps<typeof CatalogsWorkspace>
  currentUser: AuthUser | null
  detailMode: DetailMode
  isObjectPageOpen: boolean
  isProfilePageOpen: boolean
  isRelationPageOpen: boolean
  isSettingsPageOpen: boolean
  isTimelineEventPageOpen: boolean
  objectCardsWorkspaceProps: ComponentProps<typeof ObjectCardsWorkspace>
  objectDetailPageProps: Omit<ObjectDetailPageProps, 'selectedObject'>
  profilePageProps: ComponentProps<typeof ProfilePage>
  projectSearchGroups: ProjectSearchResultGroup[]
  projectSearchQuery: string
  relationDetailPageProps: Omit<RelationDetailPageProps, 'selectedRelationEdge'>
  relationsPageProps: RelationsPageProps
  selectedCatalogEntry: CatalogEntryDetailPageProps['selectedCatalogEntry'] | null
  selectedObject: ObjectDetailPageProps['selectedObject'] | null
  selectedProject: StoryProject | null
  selectedRelationEdge: RelationDetailPageProps['selectedRelationEdge'] | null
  selectedTimelineEvent: TimelineEventDetailPageProps['selectedTimelineEvent'] | null
  settingsPageProps: ComponentProps<typeof SettingsPage>
  structuresWorkspaceProps: Omit<ComponentProps<typeof StructuresWorkspace>, 'selectedProject'>
  timelineEventDetailPageProps: Omit<TimelineEventDetailPageProps, 'selectedTimelineEvent'>
  timelinePageProps: TimelinePageProps
  ui: ComponentProps<typeof ProfilePage>['ui']
}) {
  if (isProfilePageOpen) {
    return <ProfilePage {...profilePageProps} />
  }

  if (isSettingsPageOpen) {
    return <SettingsPage {...settingsPageProps} />
  }

  if (selectedProject === null) {
    return (
      <div className="sp-empty">
        <strong>{currentUser === null ? ui.signInRequired : ui.projectNoProjects}</strong>
        <span>
          {currentUser === null
            ? ui.signInRequiredHint
            : ui.projectCreateUnavailableHint}
        </span>
      </div>
    )
  }

  const normalizedSearchQuery = projectSearchQuery.trim()

  if (normalizedSearchQuery.length > 0) {
    return (
      <ProjectSearchResults
        groups={projectSearchGroups}
        query={normalizedSearchQuery}
        totalCount={projectSearchGroups.reduce((count, group) => count + group.results.length, 0)}
        ui={ui}
      />
    )
  }

  if (activeTab === 'relations') {
    if (detailMode === 'page' && isRelationPageOpen && selectedRelationEdge !== null) {
      return (
        <StylePreviewRelationDetailPage
          {...relationDetailPageProps}
          selectedRelationEdge={selectedRelationEdge}
        />
      )
    }

    return (
      <Suspense fallback={<div className="sp-empty">{ui.loading}</div>}>
        <LazyRelationsPage {...relationsPageProps} />
      </Suspense>
    )
  }

  if (activeTab === 'timeline') {
    if (detailMode === 'page' && isTimelineEventPageOpen && selectedTimelineEvent !== null) {
      return (
        <StylePreviewTimelineEventDetailPage
          {...timelineEventDetailPageProps}
          selectedTimelineEvent={selectedTimelineEvent}
        />
      )
    }

    return (
      <Suspense fallback={<div className="sp-empty">{ui.loading}</div>}>
        <LazyTimelinePage {...timelinePageProps} />
      </Suspense>
    )
  }

  if (detailMode === 'page' && isObjectPageOpen && selectedObject !== null) {
    return (
      <StylePreviewObjectDetailPage
        {...objectDetailPageProps}
        selectedObject={selectedObject}
      />
    )
  }

  if (activeSection === 'catalogs' && detailMode === 'page' && selectedCatalogEntry !== null) {
    return (
      <StylePreviewCatalogEntryDetailPage
        {...catalogEntryDetailPageProps}
        selectedCatalogEntry={selectedCatalogEntry}
      />
    )
  }

  if (activeSection === 'catalogs') {
    return <CatalogsWorkspace {...catalogsWorkspaceProps} />
  }

  if (activeSection === 'attributes') {
    return <AttributesWorkspace {...attributesWorkspaceProps} />
  }

  if (activeSection === 'structures') {
    return <StructuresWorkspace {...structuresWorkspaceProps} selectedProject={selectedProject} />
  }

  return <ObjectCardsWorkspace {...objectCardsWorkspaceProps} />
}
