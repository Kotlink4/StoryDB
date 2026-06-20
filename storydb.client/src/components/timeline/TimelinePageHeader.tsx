import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'

type TimelineEventCounts = {
  chapter: number
  duration: number
  era: number
  point: number
}

type TimelinePageHeaderProps = {
  eventCount: number
  eventCounts: TimelineEventCounts
  isGenerating: boolean
  isLinksPopoverOpen: boolean
  layoutButtonLabel: string
  layoutSourceStatus: string
  linkCount: number
  modeLabel: string
  timelineStatus: string
  ui: PreviewText
  onCreate: () => void
  onCreateLink: () => void
  onGenerate: () => void
  onToggleLinksPopover: () => void
}

export function TimelinePageHeader({
  eventCount,
  eventCounts,
  isGenerating,
  isLinksPopoverOpen,
  layoutButtonLabel,
  layoutSourceStatus,
  linkCount,
  modeLabel,
  timelineStatus,
  ui,
  onCreate,
  onCreateLink,
  onGenerate,
  onToggleLinksPopover,
}: TimelinePageHeaderProps) {
  return (
    <>
      <div className="sp-timeline-overlay-head">
        <div>
          <h2>{ui.timeline}</h2>
          <p>
            {modeLabel} · {eventCount} {ui.eventsCount} · {timelineStatus}
          </p>
          <div className="sp-timeline-type-summary">
            <span className="era">{ui.timelineEras}: {eventCounts.era}</span>
            <span className="duration">{ui.timelineDurations}: {eventCounts.duration}</span>
            <span className="point">{ui.timelinePoints}: {eventCounts.point}</span>
            <span className="chapter">{ui.timelineChapters}: {eventCounts.chapter}</span>
            <span className="layout-source">{layoutSourceStatus}</span>
          </div>
        </div>
      </div>
      <div className="sp-timeline-overlay-actions">
        <button className="sp-button" type="button" disabled={isGenerating} onClick={onGenerate}>
          {isGenerating ? ui.layoutGenerating : layoutButtonLabel}
        </button>
        <button
          className="sp-button"
          type="button"
          aria-expanded={isLinksPopoverOpen}
          onClick={onToggleLinksPopover}
        >
          {ui.timelineEventLinks}
          <span className="sp-button-count">{linkCount}</span>
        </button>
        <button className="sp-button" type="button" disabled={eventCount < 2} onClick={onCreateLink}>
          {ui.linkEvents}
        </button>
        <button className="sp-button primary" type="button" onClick={onCreate}>
          {ui.newEvent}
        </button>
      </div>
    </>
  )
}
