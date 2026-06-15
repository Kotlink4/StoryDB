import type { ComponentProps } from 'react'

import type { PreviewSection, PreviewTab } from '../style-preview/domain/stylePreviewRouting'
import type { DetailMode } from '../style-preview/domain/stylePreviewUiTypes'
import { CatalogEntryDetail } from './CatalogEntryDetail'
import { ObjectDetail } from './ObjectDetail'
import { RelationDetail } from './RelationDetail'
import { TimelineEventDetail } from './TimelineEventDetail'

type CatalogEntry = ComponentProps<typeof CatalogEntryDetail>['entry']
type CatalogEntryDetailBaseProps = Omit<ComponentProps<typeof CatalogEntryDetail>, 'entry' | 'onDelete' | 'onEdit'>
type ObjectDetailBaseProps = Omit<ComponentProps<typeof ObjectDetail>, 'storyObject' | 'onDelete' | 'onEdit'>
type RelationDetailBaseProps = Omit<ComponentProps<typeof RelationDetail>, 'edge' | 'onClose'>
type StoryObject = ComponentProps<typeof ObjectDetail>['storyObject']
type TimelineEvent = ComponentProps<typeof TimelineEventDetail>['event']
type TimelineEventDetailBaseProps = Omit<ComponentProps<typeof TimelineEventDetail>, 'event' | 'onClose'>

export function StylePreviewDetailPanels({
  activeSection,
  activeTab,
  catalogEntryDetailProps,
  detailMode,
  isProfilePageOpen,
  isSettingsPageOpen,
  objectDetailProps,
  relationDetailProps,
  selectedCatalogEntry,
  selectedObject,
  selectedRelationEdge,
  selectedRelationObject,
  selectedTimelineEvent,
  timelineEventDetailProps,
  onCloseRelationEdge,
  onCloseRelationObject,
  onCloseObject,
  onCloseTimelineEvent,
  onDeleteCatalogEntry,
  onDeleteRelationObject,
  onEditCatalogEntry,
  onEditObject,
}: {
  activeSection: PreviewSection
  activeTab: PreviewTab
  catalogEntryDetailProps: CatalogEntryDetailBaseProps
  detailMode: DetailMode
  isProfilePageOpen: boolean
  isSettingsPageOpen: boolean
  objectDetailProps: ObjectDetailBaseProps
  relationDetailProps: RelationDetailBaseProps
  selectedCatalogEntry: CatalogEntry | null
  selectedObject: StoryObject | null
  selectedRelationEdge: ComponentProps<typeof RelationDetail>['edge'] | null
  selectedRelationObject: StoryObject | null
  selectedTimelineEvent: TimelineEvent | null
  timelineEventDetailProps: TimelineEventDetailBaseProps
  onCloseRelationEdge: () => void
  onCloseRelationObject: () => void
  onCloseObject: () => void
  onCloseTimelineEvent: () => void
  onDeleteCatalogEntry: (entry: CatalogEntry) => void
  onDeleteRelationObject: (object: StoryObject) => void
  onEditCatalogEntry: (entry: CatalogEntry) => void
  onEditObject: (object: StoryObject) => void
}) {
  if (isSettingsPageOpen || isProfilePageOpen || detailMode !== 'panel') {
    return null
  }

  return (
    <>
      {activeTab === 'database' && selectedObject !== null && (
        <aside className="sp-detail">
          <ObjectDetail
            {...objectDetailProps}
            storyObject={selectedObject}
            onClose={onCloseObject}
            onEdit={() => onEditObject(selectedObject)}
          />
        </aside>
      )}

      {activeTab === 'relations' && selectedRelationObject !== null && (
        <aside className="sp-detail">
          <ObjectDetail
            {...objectDetailProps}
            storyObject={selectedRelationObject}
            onClose={onCloseRelationObject}
            onDelete={() => onDeleteRelationObject(selectedRelationObject)}
            onEdit={() => onEditObject(selectedRelationObject)}
          />
        </aside>
      )}

      {activeTab === 'relations' && selectedRelationEdge !== null && (
        <aside className="sp-detail">
          <RelationDetail
            {...relationDetailProps}
            edge={selectedRelationEdge}
            onClose={onCloseRelationEdge}
          />
        </aside>
      )}

      {activeTab === 'timeline' && selectedTimelineEvent !== null && (
        <aside className="sp-detail">
          <TimelineEventDetail
            {...timelineEventDetailProps}
            event={selectedTimelineEvent}
            onClose={onCloseTimelineEvent}
          />
        </aside>
      )}

      {activeTab === 'database' &&
        activeSection === 'catalogs' &&
        selectedObject === null &&
        selectedCatalogEntry !== null && (
          <aside className="sp-detail">
            <CatalogEntryDetail
              {...catalogEntryDetailProps}
              entry={selectedCatalogEntry}
              onDelete={() => onDeleteCatalogEntry(selectedCatalogEntry)}
              onEdit={() => onEditCatalogEntry(selectedCatalogEntry)}
            />
          </aside>
        )}
    </>
  )
}
