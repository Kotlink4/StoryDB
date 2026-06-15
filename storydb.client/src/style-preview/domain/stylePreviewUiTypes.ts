export type DetailMode = 'panel' | 'modal' | 'page'

export type GroupDisplayMode = 'blocks' | 'subtabs'

export type ObjectDossierTab = 'main' | 'relations' | 'structure' | 'timeline' | 'gallery'

export type ObjectEditorTab = 'main' | 'attributes' | 'catalogs' | 'hierarchy' | 'relations' | 'timeline'

export type DraftTimelineParticipation = {
  timelineEventId: string
  role: string
}
