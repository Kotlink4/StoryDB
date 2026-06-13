import { useEffect, useState } from 'react'

import { resolveAssetUrl } from '../api'
import { groupAttributesByDefinition } from '../attributeDisplay'
import { getObjectFullName } from '../objectDisplay'
import type { PreviewText } from '../stylePreviewI18n'
import type { ObjectDossierTab } from '../stylePreviewUiTypes'
import { applyTimelineChangesToObject, formatTimelineChangeValue } from '../timelineDisplay'
import type { AttributeDefinition, AttributeGroup, StoryObject, TimelineEvent } from '../types'
import { LinkedText, type TextLinkTarget } from './LinkedText'
import { AttributeIcon, ObjectPortrait } from './StylePreviewPrimitives'

export function ObjectDetail({
  activeTab = 'main',
  attributeDefinitions,
  attributeGroups: attributeGroupDefinitions,
  dossierTimelineEventId = '',
  galleryImageCaption = '',
  galleryImagePath = null,
  storyObject,
  textLinkTargets,
  timelineEvents = [],
  ui,
  onAddGalleryImage,
  onDelete,
  onDeleteGalleryImage,
  onEdit,
  onGalleryCaptionChange,
  onGalleryImageUpload,
  onDossierTimelineEventIdChange,
  onOpenTimelineEvent,
  onTabChange,
}: {
  activeTab?: ObjectDossierTab
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  dossierTimelineEventId?: string
  galleryImageCaption?: string
  galleryImagePath?: string | null
  storyObject: StoryObject
  textLinkTargets: TextLinkTarget[]
  timelineEvents?: TimelineEvent[]
  ui: PreviewText
  onAddGalleryImage?: () => void
  onDelete?: () => void
  onDeleteGalleryImage?: (imageId: number) => void
  onEdit?: () => void
  onGalleryCaptionChange?: (caption: string) => void
  onGalleryImageUpload?: (file: File | null) => void
  onDossierTimelineEventIdChange?: (eventId: string) => void
  onOpenTimelineEvent?: (event: TimelineEvent) => void
  onTabChange?: (tab: ObjectDossierTab) => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const dossierTimelineEvent =
    timelineEvents.find((event) => String(event.id) === dossierTimelineEventId) ?? null
  const objectTimelineChanges =
    dossierTimelineEvent?.changes.filter(
      (change) => change.targetType === 'storyObject' && change.targetId === storyObject.id,
    ) ?? []
  const displayStoryObject = applyTimelineChangesToObject(storyObject, objectTimelineChanges)
  const relatedTimelineEvents = timelineEvents.filter((event) =>
    event.participants.some(
      (participant) => participant.targetType === 'storyObject' && participant.targetId === storyObject.id,
    ),
  )
  const attributeGroups = groupAttributesByDefinition(displayStoryObject.attributes, attributeDefinitions, ui.main)
  const characterRelationships = [
    ...storyObject.outgoingCharacterRelationships,
    ...storyObject.incomingCharacterRelationships,
  ]

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('.sp-detail-menu') === null) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [])

  return (
    <div className="sp-detail-card">
      {(onDelete !== undefined || onEdit !== undefined) && (
        <div className="sp-detail-menu">
          <button type="button" onClick={() => setIsMenuOpen((value) => !value)}>
            ⋮
          </button>
          {isMenuOpen && (
            <div className="sp-card-dropdown">
              {onEdit !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onEdit()
                  }}
                >
                  {ui.edit}
                </button>
              )}
              {onDelete !== undefined && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    onDelete()
                  }}
                >
                  {ui.delete}
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <div className="sp-dossier-head">
        <ObjectPortrait storyObject={displayStoryObject} />
        <div>
          <span>{ui.dossier}</span>
          <h2>{getObjectFullName(displayStoryObject)}</h2>
          <p>
            <LinkedText targets={textLinkTargets} text={displayStoryObject.role ?? displayStoryObject.typeKey} />
          </p>
        </div>
      </div>
      <div className="sp-fields">
        <div><span>{ui.yearAge}</span><strong>{displayStoryObject.age ?? '-'}</strong></div>
        <div>
          <span>{ui.role}</span>
          <strong>
            <LinkedText emptyText="-" targets={textLinkTargets} text={displayStoryObject.role} />
          </strong>
        </div>
        <div><span>{ui.objectType}</span><strong>{displayStoryObject.typeKey}</strong></div>
      </div>
      {timelineEvents.length > 0 && (
        <section className="sp-panel sp-timeline-context-panel">
          <div>
            <span>{ui.timelineContext}</span>
            <strong>{dossierTimelineEvent?.title ?? ui.baseState}</strong>
          </div>
          <select
            value={dossierTimelineEventId}
            onChange={(event) => onDossierTimelineEventIdChange?.(event.target.value)}
          >
            <option value="">{ui.baseState}</option>
            {timelineEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </section>
      )}
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>
          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={displayStoryObject.description} />
        </p>
      </section>
      {dossierTimelineEvent !== null && objectTimelineChanges.length > 0 && (
        <section className="sp-panel sp-context-change-list">
          <h3>{ui.timelineSelectedChanges}</h3>
          {objectTimelineChanges.map((change) => (
            <div className="sp-row" key={change.id}>
              <span>{change.fieldName ?? change.fieldKey ?? change.changeType}</span>
              <strong>
                {formatTimelineChangeValue(change.oldValueJson, ui)} → {formatTimelineChangeValue(change.newValueJson, ui)}
              </strong>
            </div>
          ))}
        </section>
      )}
      <section className="sp-panel">
        <div className="sp-object-editor-tabs">
          {[
            ['main', ui.main],
            ['relations', ui.relations],
            ['timeline', ui.timeline],
            ['gallery', ui.gallery],
          ].map(([tab, label]) => (
            <button
              className={activeTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => onTabChange?.(tab as ObjectDossierTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {activeTab === 'main' && (
        <>
          <section className="sp-panel">
            <h3>{ui.attributes}</h3>
            {displayStoryObject.attributes.length === 0 ? (
              <p>{ui.noAttributeValues}</p>
            ) : (
              attributeGroups.map((group) => (
                <article className="sp-attribute-group" key={group.name}>
                  <div className="sp-attribute-group-head">
                    <strong className="sp-label-with-icon">
                      <AttributeIcon iconKey={attributeGroupDefinitions.find((item) => item.name === group.name)?.iconKey} />
                      {group.name}
                    </strong>
                    <span>{group.attributes.length}</span>
                  </div>
                  {group.attributes.map((attribute) => {
                    const definition = attributeDefinitions.find((item) => item.id === attribute.attributeDefinitionId)

                    return (
                      <div className="sp-row" key={attribute.id}>
                        <span className="sp-label-with-icon">
                          <AttributeIcon iconKey={definition?.iconKey} />
                          {attribute.name}
                        </span>
                        <strong>
                          <LinkedText emptyText="-" targets={textLinkTargets} text={attribute.value} />
                        </strong>
                      </div>
                    )
                  })}
                </article>
              ))
            )}
          </section>
          <section className="sp-panel">
            <h3>{ui.catalogs}</h3>
            {storyObject.catalogSelections.length === 0 ? (
              <p>{ui.noCatalogValues}</p>
            ) : (
              storyObject.catalogSelections.map((selection) => (
                <div className="sp-row" key={`${selection.targetType}-${selection.catalogId}-${selection.catalogEntryGroupId}-${selection.catalogEntryId}`}>
                  <span>{selection.catalogName}</span>
                  <strong>
                    <LinkedText
                      targets={textLinkTargets}
                      text={selection.catalogEntryName ?? selection.catalogEntryGroupName ?? selection.targetType}
                    />
                  </strong>
                </div>
              ))
            )}
          </section>
          <section className="sp-panel">
            <h3>{ui.hierarchyValues}</h3>
            {storyObject.hierarchySelections.length === 0 ? (
              <p>{ui.noHierarchyValues}</p>
            ) : (
              storyObject.hierarchySelections.map((selection) => (
                <div className="sp-row" key={selection.groupId}>
                  <span>{selection.groupName}</span>
                  <strong>
                    <LinkedText targets={textLinkTargets} text={selection.nodes.map((node) => node.name).join(', ')} />
                  </strong>
                </div>
              ))
            )}
          </section>
        </>
      )}
      {activeTab === 'relations' && (
        <>
          <section className="sp-panel">
            <h3>{ui.relations}</h3>
            {characterRelationships.length === 0 ? (
              <p>{ui.noRelationships}</p>
            ) : (
              characterRelationships.map((relationship) => (
                <div className="sp-row" key={`${relationship.direction}-${relationship.id}`}>
                  <span>
                    <LinkedText targets={textLinkTargets} text={relationship.character.name} />
                  </span>
                  <strong>{relationship.relationType}</strong>
                </div>
              ))
            )}
          </section>
          <section className="sp-panel">
            <h3>{ui.linkedObjects}</h3>
            {[storyObject.ownedItems, storyObject.owners, storyObject.territoryPlaces, storyObject.organizationsOnTerritory, storyObject.ownerOrganizations, storyObject.ownedTerritories]
              .flat()
              .map((reference) => (
                <div className="sp-row" key={`${reference.typeKey}-${reference.id}`}>
                  <span>{reference.typeKey}</span>
                  <strong>
                    <LinkedText targets={textLinkTargets} text={reference.name} />
                  </strong>
                </div>
              ))}
          </section>
        </>
      )}
      {activeTab === 'timeline' && (
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
      )}
      {activeTab === 'gallery' && (
        <section className="sp-panel">
          <h3>{ui.gallery}</h3>
          {onGalleryImageUpload !== undefined && (
            <div className="sp-editor-row">
              <input type="file" accept="image/*" onChange={(event) => onGalleryImageUpload(event.target.files?.[0] ?? null)} />
              <input
                placeholder={ui.caption}
                value={galleryImageCaption}
                onChange={(event) => onGalleryCaptionChange?.(event.target.value)}
              />
              <button disabled={galleryImagePath === null} type="button" onClick={onAddGalleryImage}>
                {ui.addImage}
              </button>
            </div>
          )}
          {storyObject.galleryImages.length === 0 ? (
            <p>{ui.noGalleryImages}</p>
          ) : (
            <div className="sp-gallery-grid">
              {storyObject.galleryImages.map((image) => (
                <article className="sp-gallery-card" key={image.id}>
                  <img alt="" src={resolveAssetUrl(image.imagePath) ?? undefined} />
                  <span>
                    <LinkedText emptyText="-" targets={textLinkTargets} text={image.caption} />
                  </span>
                  {onDeleteGalleryImage !== undefined && (
                    <button type="button" onClick={() => onDeleteGalleryImage(image.id)}>
                      {ui.delete}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
