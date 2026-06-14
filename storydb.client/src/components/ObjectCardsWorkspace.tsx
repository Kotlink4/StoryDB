import { getObjectFullName } from '../objectDisplay'
import type { PreviewText } from '../stylePreviewI18n'
import type {
  AuthUser,
  StoryObject,
} from '../types'
import { ObjectPortrait } from './StylePreviewPrimitives'

export function ObjectCardsWorkspace({
  activeObjectMenuId,
  currentUser,
  layoutMode,
  sectionTitle,
  selectedObjectId,
  ui,
  viewSectionLabel,
  visibleObjects,
  onCreateObject,
  onDeleteObject,
  onEditObject,
  onLayoutModeChange,
  onObjectMenuChange,
  onOpenObject,
}: {
  activeObjectMenuId: number | null
  currentUser: AuthUser | null
  layoutMode: 'grid' | 'list'
  sectionTitle: string
  selectedObjectId: number | null
  ui: PreviewText
  viewSectionLabel: string
  visibleObjects: StoryObject[]
  onCreateObject: () => void
  onDeleteObject: (storyObject: StoryObject) => void
  onEditObject: (storyObject: StoryObject) => void
  onLayoutModeChange: (layoutMode: 'grid' | 'list') => void
  onObjectMenuChange: (objectId: number | null) => void
  onOpenObject: (storyObject: StoryObject) => void
}) {
  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{sectionTitle}</h2>
          <p>{ui.objectData}</p>
        </div>
        {currentUser !== null && (
          <button className="sp-button primary sp-content-create" type="button" onClick={onCreateObject}>
            + {ui.newObject}
          </button>
        )}
        <div className="sp-filters">
          <button className="sp-pill active" type="button">{ui.all}</button>
          <button className="sp-pill" type="button">{ui.active}</button>
          <button className="sp-pill" type="button">{ui.favorites}</button>
        </div>
      </div>
      <div className="sp-toolbar">
        <span>
          {ui.view}: {ui.database} / {viewSectionLabel}
        </span>
        <div className="sp-switch">
          <button
            className={layoutMode === 'grid' ? 'active' : ''}
            type="button"
            onClick={() => onLayoutModeChange('grid')}
            aria-label="Grid"
          >
            <span className="sp-view-icon grid" aria-hidden="true" />
          </button>
          <button
            className={layoutMode === 'list' ? 'active' : ''}
            type="button"
            onClick={() => onLayoutModeChange('list')}
            aria-label="List"
          >
            <span className="sp-view-icon list" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={`sp-cards ${layoutMode === 'list' ? 'list' : ''}`}>
        {visibleObjects.map((storyObject) => (
          <article
            className={`sp-card ${storyObject.id === selectedObjectId ? 'selected' : ''}`}
            key={storyObject.id}
          >
            <button className="sp-card-main" type="button" onClick={() => onOpenObject(storyObject)}>
              <ObjectPortrait storyObject={storyObject} />
            </button>
            <div className="sp-card-body" onClick={() => onOpenObject(storyObject)}>
              <h3>{getObjectFullName(storyObject)}</h3>
              <span>{storyObject.role ?? storyObject.typeKey}</span>
              <div className="sp-tags">
                {storyObject.attributes.slice(0, 3).map((attribute) => (
                  <span key={attribute.id}>{attribute.name}</span>
                ))}
              </div>
            </div>
            <div className="sp-card-menu">
              <button
                aria-label={`${storyObject.name}: действия`}
                type="button"
                onClick={() => onObjectMenuChange(activeObjectMenuId === storyObject.id ? null : storyObject.id)}
              >
                ⋮
              </button>
              {activeObjectMenuId === storyObject.id && (
                <div className="sp-card-dropdown">
                  <button
                    type="button"
                    onClick={() => {
                      onObjectMenuChange(null)
                      onEditObject(storyObject)
                    }}
                  >
                    {ui.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onObjectMenuChange(null)
                      onDeleteObject(storyObject)
                    }}
                  >
                    {ui.delete}
                  </button>
                </div>
              )}
            </div>
            <div className="sp-card-actions" aria-hidden="true">
              <button type="button" onClick={() => onEditObject(storyObject)}>
                {ui.edit}
              </button>
              <button type="button" onClick={() => onDeleteObject(storyObject)}>
                {ui.delete}
              </button>
            </div>
          </article>
        ))}
        {visibleObjects.length === 0 && (
          <div className="sp-empty">
            <strong>{ui.noObjects}</strong>
            <span>{ui.noObjectsHint}</span>
          </div>
        )}
      </div>
    </>
  )
}
