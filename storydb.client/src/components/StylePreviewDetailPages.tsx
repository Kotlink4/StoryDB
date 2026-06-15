import type { ComponentProps } from 'react'
import { ArrowLeft } from 'lucide-react'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { getRelationLabel } from '../style-preview/domain/relationDisplay'
import { CatalogEntryDetail } from './CatalogEntryDetail'
import { ObjectDetail } from './ObjectDetail'
import { RelationDetail } from './RelationDetail'
import { TimelineEventDetail } from './TimelineEventDetail'

type CatalogEntry = ComponentProps<typeof CatalogEntryDetail>['entry']
type CatalogEntryDetailBaseProps = Omit<ComponentProps<typeof CatalogEntryDetail>, 'entry' | 'onDelete' | 'onEdit'>
type ObjectDetailBaseProps = Omit<ComponentProps<typeof ObjectDetail>, 'storyObject' | 'onEdit'>
type RelationDetailBaseProps = Omit<ComponentProps<typeof RelationDetail>, 'edge' | 'onClose'>
type StoryObject = ComponentProps<typeof ObjectDetail>['storyObject']
type TimelineEvent = ComponentProps<typeof TimelineEventDetail>['event']
type TimelineEventDetailBaseProps = Omit<ComponentProps<typeof TimelineEventDetail>, 'event' | 'onClose'>

export function StylePreviewRelationDetailPage({
  relationDetailProps,
  selectedRelationEdge,
  ui,
  onBack,
}: {
  relationDetailProps: RelationDetailBaseProps
  selectedRelationEdge: ComponentProps<typeof RelationDetail>['edge']
  ui: PreviewText
  onBack: () => void
}) {
  return (
    <div className="sp-object-page">
      <div className="sp-content-head">
        <div>
          <h2>{getRelationLabel(selectedRelationEdge.relationType, ui)}</h2>
          <p>{ui.relationStandalonePage}</p>
        </div>
        <button className="sp-icon-button sp-page-back-button" type="button" aria-label={ui.returnToGraph} title={ui.returnToGraph} onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
      </div>
      <RelationDetail
        {...relationDetailProps}
        edge={selectedRelationEdge}
        onClose={onBack}
      />
    </div>
  )
}

export function StylePreviewTimelineEventDetailPage({
  selectedTimelineEvent,
  timelineEventDetailProps,
  ui,
  onBack,
}: {
  selectedTimelineEvent: TimelineEvent
  timelineEventDetailProps: TimelineEventDetailBaseProps
  ui: PreviewText
  onBack: () => void
}) {
  return (
    <div className="sp-object-page">
      <div className="sp-content-head">
        <div>
          <h2>{selectedTimelineEvent.title}</h2>
          <p>{ui.timelineEventStandalonePage}</p>
        </div>
        <button className="sp-icon-button sp-page-back-button" type="button" aria-label={ui.returnToTimeline} title={ui.returnToTimeline} onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
      </div>
      <TimelineEventDetail
        {...timelineEventDetailProps}
        event={selectedTimelineEvent}
        onClose={onBack}
      />
    </div>
  )
}

export function StylePreviewObjectDetailPage({
  objectDetailProps,
  selectedObject,
  ui,
  onBack,
  onEdit,
}: {
  objectDetailProps: ObjectDetailBaseProps
  selectedObject: StoryObject
  ui: PreviewText
  onBack: () => void
  onEdit: (storyObject: StoryObject) => void
}) {
  return (
    <div className="sp-object-page">
      <div className="sp-content-head">
        <div>
          <h2>{selectedObject.name}</h2>
          <p>{ui.objectStandalonePage}</p>
        </div>
        <button className="sp-icon-button sp-page-back-button" type="button" aria-label={ui.returnToPanel} title={ui.returnToPanel} onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
      </div>
      <ObjectDetail
        {...objectDetailProps}
        storyObject={selectedObject}
        onEdit={() => onEdit(selectedObject)}
      />
    </div>
  )
}

export function StylePreviewCatalogEntryDetailPage({
  catalogEntryDetailProps,
  selectedCatalogEntry,
  ui,
  onBack,
  onDelete,
  onEdit,
}: {
  catalogEntryDetailProps: CatalogEntryDetailBaseProps
  selectedCatalogEntry: CatalogEntry
  ui: PreviewText
  onBack: () => void
  onDelete: (entry: CatalogEntry) => void
  onEdit: (entry: CatalogEntry) => void
}) {
  return (
    <div className="sp-object-page">
      <div className="sp-content-head">
        <div>
          <h2>{selectedCatalogEntry.name}</h2>
          <p>{catalogEntryDetailProps.catalog?.name ?? ui.catalog}</p>
        </div>
        <button className="sp-icon-button sp-page-back-button" type="button" aria-label={ui.back} title={ui.back} onClick={onBack}>
          <ArrowLeft aria-hidden="true" size={18} />
        </button>
      </div>
      <CatalogEntryDetail
        {...catalogEntryDetailProps}
        entry={selectedCatalogEntry}
        onDelete={() => onDelete(selectedCatalogEntry)}
        onEdit={() => onEdit(selectedCatalogEntry)}
      />
    </div>
  )
}
