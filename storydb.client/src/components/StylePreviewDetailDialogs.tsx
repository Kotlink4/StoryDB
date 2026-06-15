import type { ComponentProps } from 'react'

import { getRelationLabel } from '../style-preview/domain/relationDisplay'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { RelationGraphEdge, TimelineEvent } from '../types'
import { RelationDetail } from './RelationDetail'
import { TimelineEventDetail } from './TimelineEventDetail'
import { PreviewDialog } from './StylePreviewPrimitives'

type RelationDetailProps = Omit<ComponentProps<typeof RelationDetail>, 'edge'>
type TimelineEventDetailProps = Omit<ComponentProps<typeof TimelineEventDetail>, 'event'>

export function StylePreviewDetailDialogs({
  dialog,
  relationDetailProps,
  selectedRelationEdge,
  selectedTimelineEvent,
  timelineEventDetailProps,
  ui,
  onCloseRelationDetail,
  onCloseTimelineEventDetail,
}: {
  dialog: PreviewDialogKind
  relationDetailProps: RelationDetailProps
  selectedRelationEdge: RelationGraphEdge | null
  selectedTimelineEvent: TimelineEvent | null
  timelineEventDetailProps: TimelineEventDetailProps
  ui: PreviewText
  onCloseRelationDetail: () => void
  onCloseTimelineEventDetail: () => void
}) {
  const dialogRelationDetailProps = { ...relationDetailProps }
  const dialogTimelineEventDetailProps = { ...timelineEventDetailProps }

  delete dialogRelationDetailProps.onClose
  delete dialogTimelineEventDetailProps.onClose

  return (
    <>
      {dialog === 'relationDetail' && selectedRelationEdge !== null && (
        <PreviewDialog
          title={`${ui.relations}: ${getRelationLabel(selectedRelationEdge.relationType, ui)}`}
          onClose={onCloseRelationDetail}
        >
          <RelationDetail {...dialogRelationDetailProps} edge={selectedRelationEdge} />
        </PreviewDialog>
      )}

      {dialog === 'timelineEventDetail' && selectedTimelineEvent !== null && (
        <PreviewDialog
          title={`${ui.timelineEvent}: ${selectedTimelineEvent.title}`}
          onClose={onCloseTimelineEventDetail}
        >
          <TimelineEventDetail
            {...dialogTimelineEventDetailProps}
            event={selectedTimelineEvent}
          />
        </PreviewDialog>
      )}
    </>
  )
}
