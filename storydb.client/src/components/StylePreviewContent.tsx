import type { ComponentProps } from 'react'

import type { PreviewSection, PreviewTab } from '../style-preview/domain/stylePreviewRouting'
import type { DetailMode } from '../style-preview/domain/stylePreviewUiTypes'
import type { AuthUser, StoryProject } from '../types'
import { AttributesWorkspace } from './AttributesWorkspace'
import { CatalogsWorkspace } from './CatalogsWorkspace'
import { ObjectCardsWorkspace } from './ObjectCardsWorkspace'
import { RelationsPage } from './RelationsPage'
import { StructuresWorkspace } from './StructuresWorkspace'
import { ProfilePage } from './StylePreviewProfilePage'
import { SettingsPage } from './StylePreviewSettingsPage'
import { TimelinePage } from './TimelinePage'
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
  relationDetailPageProps: Omit<RelationDetailPageProps, 'selectedRelationEdge'>
  relationsPageProps: ComponentProps<typeof RelationsPage>
  selectedCatalogEntry: CatalogEntryDetailPageProps['selectedCatalogEntry'] | null
  selectedObject: ObjectDetailPageProps['selectedObject'] | null
  selectedProject: StoryProject | null
  selectedRelationEdge: RelationDetailPageProps['selectedRelationEdge'] | null
  selectedTimelineEvent: TimelineEventDetailPageProps['selectedTimelineEvent'] | null
  settingsPageProps: ComponentProps<typeof SettingsPage>
  structuresWorkspaceProps: Omit<ComponentProps<typeof StructuresWorkspace>, 'selectedProject'>
  timelineEventDetailPageProps: Omit<TimelineEventDetailPageProps, 'selectedTimelineEvent'>
  timelinePageProps: ComponentProps<typeof TimelinePage>
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

  if (activeTab === 'relations') {
    if (detailMode === 'page' && isRelationPageOpen && selectedRelationEdge !== null) {
      return (
        <StylePreviewRelationDetailPage
          {...relationDetailPageProps}
          selectedRelationEdge={selectedRelationEdge}
        />
      )
    }

    return <RelationsPage {...relationsPageProps} />
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

    return <TimelinePage {...timelinePageProps} />
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
