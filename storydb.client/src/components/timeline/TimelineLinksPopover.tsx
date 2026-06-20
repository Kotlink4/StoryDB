import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import { getTimelineLinkTypeLabel } from '../../style-preview/domain/timelineDisplay'
import type { TimelineEvent, TimelineEventLink } from '../../types'

type TimelineLinksPopoverProps = {
  eventsById: Map<number, TimelineEvent>
  links: TimelineEventLink[]
  ui: PreviewText
  onClose: () => void
  onDeleteLink: (linkId: number) => void
  onSelectEvent: (eventId: number) => void
}

export function TimelineLinksPopover({
  eventsById,
  links,
  ui,
  onClose,
  onDeleteLink,
  onSelectEvent,
}: TimelineLinksPopoverProps) {
  return (
    <div className="sp-timeline-links-popover">
      <div className="sp-timeline-links-popover-head">
        <div>
          <strong>{ui.timelineEventLinks}</strong>
          <span>{links.length} {ui.linksCount}</span>
        </div>
        <button className="sp-icon-button" type="button" onClick={onClose}>
          x
        </button>
      </div>
      {links.length > 0 ? (
        <div className="sp-timeline-links-list">
          {links.map((link) => (
            <div className="sp-timeline-link-row" key={link.id}>
              <span>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onSelectEvent(link.sourceEventId)
                  }}
                >
                  {eventsById.get(link.sourceEventId)?.title ?? ui.timelineEvent}
                </button>
                {' → '}
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onSelectEvent(link.targetEventId)
                  }}
                >
                  {eventsById.get(link.targetEventId)?.title ?? ui.timelineEvent}
                </button>
              </span>
              <em>{getTimelineLinkTypeLabel(link.linkType, ui)}</em>
              <button className="sp-icon-button" type="button" onClick={() => onDeleteLink(link.id)}>
                x
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="sp-empty compact">
          {ui.noEventLinks}
        </div>
      )}
    </div>
  )
}
