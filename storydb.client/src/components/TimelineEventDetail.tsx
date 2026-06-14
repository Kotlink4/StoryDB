import { useState } from 'react'

import { resolveAssetUrl } from '../api'
import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import { getInitials } from '../style-preview/domain/previewDisplay'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import {
  formatTimelineChangeValue,
  getTimelineEventColor,
  getTimelineEventTypeLabel,
  getTimelineLinkTypeLabel,
} from '../style-preview/domain/timelineDisplay'
import type { StoryObject, TimelineEvent, TimelineEventLink } from '../types'
import { GalleryPanel } from './GalleryPanel'
import { ObjectPortrait } from './StylePreviewPrimitives'

type TimelineEventDossierTab = 'main' | 'participants' | 'links' | 'changes' | 'gallery'

export function TimelineEventDetail({
  event,
  events,
  galleryImageCaption = '',
  galleryImagePath = null,
  links,
  objects,
  ui,
  onAddGalleryImage,
  onClose,
  onDelete,
  onDeleteGalleryImage,
  onEdit,
  onGalleryCaptionChange,
  onGalleryImageUpload,
  onOpenEvent,
  onOpenObject,
}: {
  event: TimelineEvent
  events: TimelineEvent[]
  galleryImageCaption?: string
  galleryImagePath?: string | null
  links: TimelineEventLink[]
  objects: StoryObject[]
  ui: PreviewText
  onAddGalleryImage?: () => void
  onClose?: () => void
  onDelete: (eventId: number) => void
  onDeleteGalleryImage?: (imageId: number) => void
  onEdit: (event: TimelineEvent) => void
  onGalleryCaptionChange?: (caption: string) => void
  onGalleryImageUpload?: (file: File | null) => void
  onOpenEvent: (eventId: number) => void
  onOpenObject: (storyObject: StoryObject) => void
}) {
  const [activeTab, setActiveTab] = useState<TimelineEventDossierTab>('main')
  const eventsById = new Map(events.map((timelineEvent) => [timelineEvent.id, timelineEvent]))
  const objectsById = new Map(objects.map((storyObject) => [storyObject.id, storyObject]))
  const parentEvent = event.parentEventId === null ? null : eventsById.get(event.parentEventId) ?? null
  const childEvents = events.filter((timelineEvent) => timelineEvent.parentEventId === event.id)
  const relatedLinks = links.filter((link) => link.sourceEventId === event.id || link.targetEventId === event.id)
  const timeLabel =
    [event.startLabel, event.endLabel].filter(Boolean).join(' - ') ||
    [event.startValue, event.endValue].filter((value) => value !== null).join(' - ') ||
    event.category ||
    ui.timelineNoTime
  const eventColor = event.color ?? getTimelineEventColor(event.eventType)
  const eventImageUrl = resolveAssetUrl(event.imagePath)

  return (
    <article className="sp-detail-card sp-timeline-detail">
      <div className="sp-timeline-detail-head">
        {eventImageUrl === null ? (
          <div className="sp-timeline-detail-cover" style={{ background: eventColor }}>
            {getInitials(event.title)}
          </div>
        ) : (
          <img className="sp-timeline-detail-cover" alt="" src={eventImageUrl} />
        )}
        <div>
          <span>{getTimelineEventTypeLabel(event.eventType, ui)}</span>
          <h2>{event.title}</h2>
          <p>{timeLabel}</p>
        </div>
        {onClose !== undefined && (
          <button className="sp-icon-button" type="button" onClick={onClose}>
            x
          </button>
        )}
      </div>

      <div className="sp-fields">
        <div><span>{ui.objectType}</span><strong>{getTimelineEventTypeLabel(event.eventType, ui)}</strong></div>
        <div><span>{ui.time}</span><strong>{timeLabel}</strong></div>
        <div><span>{ui.catalog}</span><strong>{event.category ?? '-'}</strong></div>
        <div>
          <span>{ui.timelineParentEvent}</span>
          <strong>
            {parentEvent === null ? '-' : (
              <button className="sp-link-button" type="button" onClick={() => onOpenEvent(parentEvent.id)}>
                {parentEvent.title}
              </button>
            )}
          </strong>
        </div>
      </div>

      <section className="sp-panel">
        <div className="sp-object-editor-tabs">
          {[
            ['main', ui.main],
            ['participants', ui.timelineParticipants],
            ['links', ui.relations],
            ['changes', ui.timelineChangeLog],
            ['gallery', ui.gallery],
          ].map(([tab, label]) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as TimelineEventDossierTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'main' && (
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>{event.description?.trim() || ui.unknownDescription}</p>
      </section>
      )}

      {activeTab === 'participants' && (
      <section className="sp-panel">
        <h3>{ui.timelineParticipants}</h3>
        {event.participants.length === 0 ? (
          <p>{ui.noParticipants}</p>
        ) : (
          <div className="sp-timeline-detail-list">
            {event.participants.map((participant) => {
              const participantObject =
                participant.targetType === 'storyObject' ? objectsById.get(participant.targetId) : undefined

              return participantObject === undefined ? (
                <div className="sp-row" key={participant.id}>
                  <span>{participant.targetType}</span>
                  <strong>{participant.role ?? '-'}</strong>
                </div>
              ) : (
                <button
                  className="sp-timeline-participant-card"
                  key={participant.id}
                  type="button"
                  onClick={() => onOpenObject(participantObject)}
                >
                  <ObjectPortrait storyObject={participantObject} />
                  <span>
                    <strong>{getObjectFullName(participantObject)}</strong>
                    <em>{participant.role ?? participantObject.typeKey}</em>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
      )}

      {activeTab === 'links' && (
      <section className="sp-panel">
        <h3>{ui.linkedEvents}</h3>
        {relatedLinks.length === 0 && childEvents.length === 0 ? (
          <p>{ui.noEventLinks}</p>
        ) : (
          <div className="sp-timeline-detail-list">
            {parentEvent !== null && (
              <div className="sp-row">
                <span>{ui.timelineParentEvent}</span>
                <strong>
                  <button className="sp-link-button" type="button" onClick={() => onOpenEvent(parentEvent.id)}>
                    {parentEvent.title}
                  </button>
                </strong>
              </div>
            )}
            {childEvents.map((childEvent) => (
              <div className="sp-row" key={`child-${childEvent.id}`}>
                <span>{ui.timelineInsideEvent}</span>
                <strong>
                  <button className="sp-link-button" type="button" onClick={() => onOpenEvent(childEvent.id)}>
                    {childEvent.title}
                  </button>
                </strong>
              </div>
            ))}
            {relatedLinks.map((link) => {
              const otherEventId = link.sourceEventId === event.id ? link.targetEventId : link.sourceEventId
              const otherEvent = eventsById.get(otherEventId)

              if (otherEvent === undefined) {
                return null
              }

              return (
                <div className="sp-row" key={link.id}>
                  <span>{getTimelineLinkTypeLabel(link.linkType, ui)}</span>
                  <strong>
                    <button className="sp-link-button" type="button" onClick={() => onOpenEvent(otherEvent.id)}>
                      {otherEvent.title}
                    </button>
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {activeTab === 'changes' && (
      <section className="sp-panel">
        <h3>{ui.timelineChangeLog}</h3>
        {event.changes.length === 0 ? (
          <p>{ui.noTimelineChanges}</p>
        ) : (
          <div className="sp-timeline-changes">
            {event.changes.map((change) => {
              const changedObject =
                change.targetType === 'storyObject' ? objectsById.get(change.targetId) : undefined

              return (
                <div className="sp-timeline-change-row" key={change.id}>
                  <span>
                    {changedObject === undefined ? change.targetType : getObjectFullName(changedObject)} ·{' '}
                    {change.fieldName ?? change.fieldKey ?? change.changeType}
                  </span>
                  <strong>
                    {formatTimelineChangeValue(change.oldValueJson, ui)} → {formatTimelineChangeValue(change.newValueJson, ui)}
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {activeTab === 'gallery' && (
        <GalleryPanel
          caption={galleryImageCaption}
          className="sp-timeline-gallery-upload"
          images={event.galleryImages}
          imagePath={galleryImagePath}
          title={ui.gallery}
          ui={ui}
          uploadMode="coverDropzone"
          onAddImage={onAddGalleryImage}
          onCaptionChange={onGalleryCaptionChange}
          onDeleteImage={onDeleteGalleryImage}
          onImageUpload={onGalleryImageUpload}
        />
      )}

      <div className="sp-detail-actions">
        <button className="sp-button" type="button" onClick={() => onEdit(event)}>
          {ui.edit}
        </button>
        <button className="sp-button danger" type="button" onClick={() => onDelete(event.id)}>
          {ui.delete}
        </button>
      </div>
    </article>
  )
}
