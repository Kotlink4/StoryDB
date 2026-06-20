import type { Dispatch, SetStateAction } from 'react'

import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import { defaultTimelineEventColorToken } from '../style-preview/domain/styleRuntimeTokens'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { StoryObject, TimelineEvent, TimelineEventDraft } from '../types'
import type { ValidationIssueMap } from '../validation'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { CoverDropzone } from './ImageInputs'
import { PreviewDialog } from './StylePreviewPrimitives'

export function TimelineEventDialog({
  draft,
  editingTimelineEventId,
  linkableObjects,
  parentOptions,
  validationErrors,
  ui,
  onCancel,
  onCoverFileSelected,
  onDraftChange,
  onEventTypeChange,
  onSave,
}: {
  draft: TimelineEventDraft
  editingTimelineEventId: number | null
  linkableObjects: StoryObject[]
  parentOptions: TimelineEvent[]
  validationErrors?: ValidationIssueMap
  ui: PreviewText
  onCancel: () => void
  onCoverFileSelected: (file: File) => void
  onDraftChange: Dispatch<SetStateAction<TimelineEventDraft>>
  onEventTypeChange: (eventType: TimelineEventDraft['eventType']) => void
  onSave: () => void
}) {
  const isRangeEvent = draft.eventType === 'duration' || draft.eventType === 'era'
  const isPointEvent = draft.eventType === 'point'
  const formRef = useFirstInvalidFieldFocus(validationErrors)

  return (
    <PreviewDialog title={editingTimelineEventId === null ? ui.newEvent : ui.timelineEventEditor} onClose={onCancel}>
      <div className="sp-form" ref={formRef}>
        <CoverDropzone
          className="event-image event-landscape"
          cropMode="landscape"
          imagePath={draft.imagePath}
          label={ui.eventCover}
          validationErrorId="timeline-event-image-error"
          validationErrors={validationErrors}
          validationField="imagePath"
          ui={ui}
          onFileSelected={onCoverFileSelected}
        />
        <label>
          {ui.timelineEventType}
          <select
            value={draft.eventType}
            onChange={(event) => onEventTypeChange(event.target.value as TimelineEventDraft['eventType'])}
            {...getFieldValidationProps('eventType', validationErrors, 'timeline-event-type-error')}
          >
            <option value="point">{ui.timelineEventTypePoint}</option>
            <option value="duration">{ui.timelineEventTypeDuration}</option>
            <option value="era">{ui.timelineEventTypeEra}</option>
            <option value="chapter">{ui.timelineEventTypeChapter}</option>
          </select>
          <FieldError id="timeline-event-type-error" message={validationErrors?.eventType} />
        </label>
        <label>
          {ui.firstName}
          <input
            value={draft.title}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
            {...getFieldValidationProps('title', validationErrors, 'timeline-title-error')}
          />
          <FieldError id="timeline-title-error" message={validationErrors?.title} />
        </label>
        <label>
          {draft.eventType === 'point'
            ? ui.timelineEventMoment
            : draft.eventType === 'chapter'
              ? ui.timelineChapterLabel
              : ui.timelineEventStart}
          <input
            value={draft.startLabel}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, startLabel: event.target.value }))}
            {...getFieldValidationProps('startLabel', validationErrors, 'timeline-start-label-error')}
          />
          <FieldError id="timeline-start-label-error" message={validationErrors?.startLabel} />
        </label>
        <label>
          {draft.eventType === 'point'
            ? ui.timelineEventPosition
            : draft.eventType === 'chapter'
              ? ui.timelineChapterPosition
              : ui.timelineEventStartPosition}
          <input
            inputMode="decimal"
            value={draft.startValue}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, startValue: event.target.value }))}
            {...getFieldValidationProps('startValue', validationErrors, 'timeline-start-value-error')}
          />
          <FieldError id="timeline-start-value-error" message={validationErrors?.startValue} />
        </label>
        {isRangeEvent && (
          <>
            <label>
              {ui.end}
              <input
                value={draft.endLabel}
                onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, endLabel: event.target.value }))}
                {...getFieldValidationProps('endLabel', validationErrors, 'timeline-end-label-error')}
              />
              <FieldError id="timeline-end-label-error" message={validationErrors?.endLabel} />
            </label>
            <label>
              {ui.endPosition}
              <input
                inputMode="decimal"
                value={draft.endValue}
                onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, endValue: event.target.value }))}
                {...getFieldValidationProps('endValue', validationErrors, 'timeline-end-value-error')}
              />
              <FieldError id="timeline-end-value-error" message={validationErrors?.endValue} />
            </label>
          </>
        )}
        {isPointEvent && (
          <label>
            {ui.timelineParentBand}
            <select value={draft.parentEventId} onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, parentEventId: event.target.value }))}>
              <option value="">{ui.timelineNoBand}</option>
              {parentOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {ui.catalog}
          <input
            value={draft.category}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, category: event.target.value }))}
            {...getFieldValidationProps('category', validationErrors, 'timeline-category-error')}
          />
          <FieldError id="timeline-category-error" message={validationErrors?.category} />
        </label>
        <label>
          {ui.color}
          <input
            type="color"
            value={draft.color || defaultTimelineEventColorToken}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, color: event.target.value }))}
            {...getFieldValidationProps('color', validationErrors, 'timeline-color-error')}
          />
          <FieldError id="timeline-color-error" message={validationErrors?.color} />
        </label>
        <label className="wide">
          {ui.description}
          <textarea
            value={draft.description}
            onChange={(event) => onDraftChange((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
            {...getFieldValidationProps('description', validationErrors, 'timeline-description-error')}
          />
          <FieldError id="timeline-description-error" message={validationErrors?.description} />
        </label>
        <section className="sp-form-section wide">
          <div className="sp-section-title-row">
            <h3>{ui.timelineParticipants}</h3>
            <button
              className="sp-button"
              type="button"
              onClick={() =>
                onDraftChange((currentDraft) => ({
                  ...currentDraft,
                  participants: [
                    ...currentDraft.participants,
                    { targetType: 'storyObject', targetId: '', role: '' },
                  ],
                }))
              }
            >
              + {ui.timelineParticipants}
            </button>
          </div>
          {draft.participants.length === 0 ? (
            <p>{ui.noParticipants}</p>
          ) : (
            <div className="sp-timeline-participant-editor">
              {draft.participants.map((participant, index) => (
                <div className="sp-form-row" key={index}>
                  <label>
                    {ui.objectType}
                    <select
                      value={participant.targetId}
                      onChange={(event) =>
                        onDraftChange((currentDraft) => ({
                          ...currentDraft,
                          participants: currentDraft.participants.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, targetType: 'storyObject', targetId: event.target.value }
                              : item,
                          ),
                        }))
                      }
                    >
                      <option value="">{ui.chooseEntry}</option>
                      {linkableObjects.map((storyObject) => (
                        <option key={storyObject.id} value={storyObject.id}>
                          {getObjectFullName(storyObject)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {ui.role}
                    <input
                      value={participant.role}
                      onChange={(event) =>
                        onDraftChange((currentDraft) => ({
                          ...currentDraft,
                          participants: currentDraft.participants.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, role: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </label>
                  <button
                    className="sp-icon-button danger"
                    type="button"
                    onClick={() =>
                      onDraftChange((currentDraft) => ({
                        ...currentDraft,
                        participants: currentDraft.participants.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {editingTimelineEventId === null ? ui.create : ui.save}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
