import type { ComponentProps } from 'react'

import type { PreviewDialogKind } from '../style-preview/domain/stylePreviewConfig'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { DeletePreviewDialog } from './DeletePreviewDialog'
import { RelationLinkDialog } from './RelationLinkDialog'
import { TimelineEventDialog } from './TimelineEventDialog'
import { TimelineLinkDialog } from './TimelineLinkDialog'

export function StylePreviewTimelineDialogs({
  dialog,
  pendingDeleteTimelineEventId,
  relationLinkDialogProps,
  timelineEventDialogProps,
  timelineEvents,
  timelineLinkDialogProps,
  ui,
  onClose,
  onDeletePendingTimelineEvent,
}: {
  dialog: PreviewDialogKind
  pendingDeleteTimelineEventId: number | null
  relationLinkDialogProps: ComponentProps<typeof RelationLinkDialog>
  timelineEventDialogProps: ComponentProps<typeof TimelineEventDialog>
  timelineEvents: ComponentProps<typeof TimelineLinkDialog>['events']
  timelineLinkDialogProps: ComponentProps<typeof TimelineLinkDialog>
  ui: PreviewText
  onClose: () => void
  onDeletePendingTimelineEvent: () => void
}) {
  return (
    <>
      {dialog === 'timelineLink' && <TimelineLinkDialog {...timelineLinkDialogProps} />}

      {dialog === 'relationLink' && <RelationLinkDialog {...relationLinkDialogProps} />}

      {dialog === 'timelineEvent' && <TimelineEventDialog {...timelineEventDialogProps} />}

      {dialog === 'confirmDeleteTimelineEvent' && (
        <DeletePreviewDialog
          title={ui.deleteTimelineEvent}
          itemName={timelineEvents.find((event) => event.id === pendingDeleteTimelineEventId)?.title ?? ui.timelineEvent}
          hint={ui.deleteTimelineEventHint}
          cancelLabel={ui.cancel}
          deleteLabel={ui.delete}
          onCancel={onClose}
          onConfirm={onDeletePendingTimelineEvent}
        />
      )}
    </>
  )
}
