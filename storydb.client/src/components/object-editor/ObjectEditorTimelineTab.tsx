import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { DraftTimelineParticipation } from '../../style-preview/domain/stylePreviewUiTypes'
import type { TimelineEvent } from '../../types'

type ObjectEditorTimelineTabProps = {
  draftTimelineParticipations: DraftTimelineParticipation[]
  editorTimelineEventId: string
  saveObjectAsTimelineChange: boolean
  timelineEvents: TimelineEvent[]
  ui: PreviewText
  onDraftTimelineParticipationsChange: (participations: DraftTimelineParticipation[]) => void
  onEditorTimelineEventIdChange: (eventId: string) => void
  onSaveObjectAsTimelineChange: (value: boolean) => void
}

export function ObjectEditorTimelineTab({
  draftTimelineParticipations,
  editorTimelineEventId,
  saveObjectAsTimelineChange,
  timelineEvents,
  ui,
  onDraftTimelineParticipationsChange,
  onEditorTimelineEventIdChange,
  onSaveObjectAsTimelineChange,
}: ObjectEditorTimelineTabProps) {
  const getTimelineParticipation = (eventId: number) =>
    draftTimelineParticipations.find((participation) => participation.timelineEventId === String(eventId))

  const toggleTimelineParticipation = (eventId: number, isSelected: boolean) => {
    const eventIdText = String(eventId)

    if (isSelected) {
      if (draftTimelineParticipations.some((participation) => participation.timelineEventId === eventIdText)) {
        return
      }

      onDraftTimelineParticipationsChange([
        ...draftTimelineParticipations,
        { timelineEventId: eventIdText, role: '' },
      ])
      return
    }

    onDraftTimelineParticipationsChange(
      draftTimelineParticipations.filter((participation) => participation.timelineEventId !== eventIdText),
    )
  }

  const updateTimelineParticipationRole = (eventId: number, role: string) => {
    const eventIdText = String(eventId)
    const hasParticipation = draftTimelineParticipations.some(
      (participation) => participation.timelineEventId === eventIdText,
    )

    onDraftTimelineParticipationsChange(
      hasParticipation
        ? draftTimelineParticipations.map((participation) =>
            participation.timelineEventId === eventIdText ? { ...participation, role } : participation,
          )
        : [...draftTimelineParticipations, { timelineEventId: eventIdText, role }],
    )
  }

  return (
    <div className="sp-editor-stack">
      <label className="sp-checkline">
        <input
          checked={saveObjectAsTimelineChange}
          type="checkbox"
          onChange={(event) => onSaveObjectAsTimelineChange(event.target.checked)}
        />
        {ui.saveTimelineChange}
      </label>
      <select value={editorTimelineEventId} onChange={(event) => onEditorTimelineEventIdChange(event.target.value)}>
        <option value="">{ui.chooseEvent}</option>
        {timelineEvents.map((event) => (
          <option key={event.id} value={event.id}>
            {event.title}
          </option>
        ))}
      </select>
      <section className="sp-editor-block">
        <strong>{ui.timelineParticipation}</strong>
        {timelineEvents.length === 0 ? (
          <p className="sp-editor-hint">{ui.noEvents}</p>
        ) : (
          <div className="sp-timeline-participation-list">
            {timelineEvents.map((event) => {
              const participation = getTimelineParticipation(event.id)
              const isSelected = participation !== undefined

              return (
                <div className="sp-timeline-participation-row" key={event.id}>
                  <label className="sp-checkline">
                    <input
                      checked={isSelected}
                      type="checkbox"
                      onChange={(inputEvent) => toggleTimelineParticipation(event.id, inputEvent.target.checked)}
                    />
                    <span>
                      <strong>{event.title}</strong>
                      <em>{[event.startLabel, event.endLabel].filter(Boolean).join(' - ') || event.category || ui.timelineEvent}</em>
                    </span>
                  </label>
                  <input
                    disabled={!isSelected}
                    placeholder={ui.timelineRolePlaceholder}
                    value={participation?.role ?? ''}
                    onChange={(inputEvent) => updateTimelineParticipationRole(event.id, inputEvent.target.value)}
                  />
                </div>
              )
            })}
          </div>
        )}
      </section>
      <p className="sp-editor-hint">
        {ui.timelineParticipationHint}
      </p>
    </div>
  )
}
