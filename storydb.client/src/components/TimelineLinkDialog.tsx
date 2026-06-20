import type { Dispatch, SetStateAction } from 'react'

import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { getTimelineLinkTypeLabel } from '../style-preview/domain/timelineDisplay'
import type { TimelineEvent, TimelineEventLinkDraft } from '../types'
import type { ValidationIssueMap } from '../validation'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { PreviewDialog } from './StylePreviewPrimitives'

type TimelineLinkDialogProps = {
  draft: TimelineEventLinkDraft
  events: TimelineEvent[]
  validationErrors?: ValidationIssueMap
  ui: PreviewText
  onCancel: () => void
  onDraftChange: Dispatch<SetStateAction<TimelineEventLinkDraft>>
  onSave: () => void
}

export function TimelineLinkDialog({
  draft,
  events,
  validationErrors,
  ui,
  onCancel,
  onDraftChange,
  onSave,
}: TimelineLinkDialogProps) {
  const formRef = useFirstInvalidFieldFocus(validationErrors)

  return (
    <PreviewDialog title={ui.timelineEventLinks} onClose={onCancel}>
      <div className="sp-form" ref={formRef}>
        <label>
          {ui.timelineSourceEvent}
          <select
            value={draft.sourceEventId}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, sourceEventId: event.target.value }))}
            {...getFieldValidationProps('sourceEventId', validationErrors, 'timeline-link-source-error')}
          >
            <option value="">{ui.chooseEvent}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
          <FieldError id="timeline-link-source-error" message={validationErrors?.sourceEventId} />
        </label>
        <label>
          {ui.timelineTargetEvent}
          <select
            value={draft.targetEventId}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, targetEventId: event.target.value }))}
            {...getFieldValidationProps('targetEventId', validationErrors, 'timeline-link-target-error')}
          >
            <option value="">{ui.chooseEvent}</option>
            {events.map((event) => (
              <option key={event.id} value={event.id} disabled={String(event.id) === draft.sourceEventId}>
                {event.title}
              </option>
            ))}
          </select>
          <FieldError id="timeline-link-target-error" message={validationErrors?.targetEventId} />
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
