import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { TimelineEvent } from '../../types'

type ObjectDetailTimelineTabProps = {
  relatedTimelineEvents: TimelineEvent[]
  ui: PreviewText
  onOpenTimelineEvent?: (event: TimelineEvent) => void
}

export function ObjectDetailTimelineTab({
  relatedTimelineEvents,
  ui,
  onOpenTimelineEvent,
}: ObjectDetailTimelineTabProps) {
  return (
    <section className="sp-panel">
      <h3>{ui.timeline}</h3>
      {relatedTimelineEvents.length === 0 ? (
        <p>{ui.noTimelineParticipation}</p>
      ) : (
        relatedTimelineEvents.map((event) => (
          <div className="sp-row" key={event.id}>
            <span>{event.startLabel ?? event.category ?? ui.timelineEvent}</span>
            <strong>
              {onOpenTimelineEvent === undefined ? (
                event.title
              ) : (
                <button className="sp-link-button" type="button" onClick={() => onOpenTimelineEvent(event)}>
                  {event.title}
                </button>
              )}
            </strong>
          </div>
        ))
      )}
    </section>
  )
}
