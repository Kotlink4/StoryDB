import type { Dispatch, SetStateAction } from 'react'

import type { PreviewText } from '../stylePreviewI18n'
import { getTimelineLinkTypeLabel } from '../timelineDisplay'
import type { TimelineEvent, TimelineEventLinkDraft } from '../types'
import { PreviewDialog } from './StylePreviewPrimitives'

type TimelineLinkDialogProps = {
  draft: TimelineEventLinkDraft
  events: TimelineEvent[]
  ui: PreviewText
  onCancel: () => void
  onDraftChange: Dispatch<SetStateAction<TimelineEventLinkDraft>>
  onSave: () => void
}

export function TimelineLinkDialog({
  draft,
  events,
  ui,
  onCancel,
  onDraftChange,
  onSave,
}: TimelineLinkDialogProps) {
  return (
    <PreviewDialog title={ui.timelineEventLinks} onClose={onCancel}>
      <div className="sp-form">
        <label>
          {ui.timelineSourceEvent}
          <select
            value={draft.sourceEventId}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, sourceEventId: event.target.value }))}
          >
            <option value="">{ui.chooseEvent}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ui.timelineTargetEvent}
          <select
            value={draft.targetEventId}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, targetEventId: event.target.value }))}
          >
            <option value="">{ui.chooseEvent}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id} disabled={String(event.id) === draft.sourceEventId}>
                {event.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ui.linkType}
          <select
            value={draft.linkType}
            onChange={(event) =>
              onDraftChange((currentDraft) => ({
                ...currentDraft,
                linkType: event.target.value as TimelineEventLinkDraft['linkType'],
              }))
            }
          >
            <option value="precedes">{getTimelineLinkTypeLabel('precedes', ui)}</option>
            <option value="causes">{getTimelineLinkTypeLabel('causes', ui)}</option>
            <option value="simultaneous">{getTimelineLinkTypeLabel('simultaneous', ui)}</option>
            <option value="partOf">{getTimelineLinkTypeLabel('partOf', ui)}</option>
            <option value="related">{getTimelineLinkTypeLabel('related', ui)}</option>
          </select>
        </label>
        <label className="wide">
          {ui.description}
          <textarea
            value={draft.description}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
          />
        </label>
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {ui.create}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
