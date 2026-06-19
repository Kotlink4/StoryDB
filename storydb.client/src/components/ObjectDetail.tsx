import { groupAttributesByDefinition } from '../style-preview/domain/attributeDisplay'
import {
  getAutomaticCharacterOrganizations,
  getAutomaticOrganizationMembers,
  getOrganizationMemberItems,
} from '../style-preview/domain/organizationComposition'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ObjectDossierTab } from '../style-preview/domain/stylePreviewUiTypes'
import { formatTimelineChangeValue } from '../style-preview/domain/timelineDisplay'
import {
  getTimelineContextChangesForObject,
  resolveStoryObjectTemporalState,
} from '../style-preview/domain/temporalState'
import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import type {
  AttributeDefinition,
  AttributeGroup,
  Catalog,
  CatalogEntry,
  CatalogEntryGroup,
  HierarchyGroup,
  HierarchyNode,
  ObjectTypeKey,
  StoryObject,
  TimelineEvent,
} from '../types'
import { LinkedText, type TextLinkTarget } from './LinkedText'
import { GalleryPanel } from './GalleryPanel'
import { CollapsibleDetailSection } from './CollapsibleDetailSection'
import { AttributeIcon, DetailActionsMenu, ObjectPortrait } from './StylePreviewPrimitives'
import { OrganizationStructureView } from './object-detail/OrganizationStructureView'
import { StructureMembershipView } from './object-detail/StructureMembershipView'

export function ObjectDetail({
  activeTab = 'main',
  attributeDefinitions,
  attributeGroups: attributeGroupDefinitions,
  catalogEntriesByCatalogId = {},
  catalogGroupsByCatalogId = {},
  catalogs = [],
  dossierTimelineEventId = '',
  galleryImageCaption = '',
  galleryImagePath = null,
  hierarchyGroups = [],
  hierarchyNodesByGroupId = {},
  selectedProjectId = null,
  storyObject,
  objectsByType,
  textLinkTargets,
  timelineEvents = [],
  ui,
  onAddGalleryImage,
  onAddCoverToGallery,
  onClose,
  onDelete,
  onDeleteGalleryImage,
  onEdit,
  onGalleryCaptionChange,
  onGalleryImageUpload,
  onDossierTimelineEventIdChange,
  onOpenTimelineEvent,
  onTabChange,
  onTimelineEventUpdated,
}: {
  activeTab?: ObjectDossierTab
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  catalogEntriesByCatalogId?: Record<number, CatalogEntry[]>
  catalogGroupsByCatalogId?: Record<number, CatalogEntryGroup[]>
  catalogs?: Catalog[]
  dossierTimelineEventId?: string
  galleryImageCaption?: string
  galleryImagePath?: string | null
  hierarchyGroups?: HierarchyGroup[]
  hierarchyNodesByGroupId?: Record<number, HierarchyNode[]>
  selectedProjectId?: number | null
  storyObject: StoryObject
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  textLinkTargets: TextLinkTarget[]
  timelineEvents?: TimelineEvent[]
  ui: PreviewText
  onAddGalleryImage?: () => void
  onAddCoverToGallery?: () => void
  onClose?: () => void
  onDelete?: () => void
  onDeleteGalleryImage?: (imageId: number) => void
  onEdit?: () => void
  onGalleryCaptionChange?: (caption: string) => void
  onGalleryImageUpload?: (file: File | null) => void
  onDossierTimelineEventIdChange?: (eventId: string) => void
  onOpenTimelineEvent?: (event: TimelineEvent) => void
  onTabChange?: (tab: ObjectDossierTab) => void
  onTimelineEventUpdated?: (event: TimelineEvent) => void
}) {
  const dossierTimelineEvent =
    timelineEvents.find((event) => String(event.id) === dossierTimelineEventId) ?? null
  const selectedObjectTimelineChanges =
    dossierTimelineEvent?.changes.filter(
      (change) => change.targetType === 'storyObject' && change.targetId === storyObject.id,
    ) ?? []
  const objectTimelineChanges = getTimelineContextChangesForObject(
    timelineEvents,
    dossierTimelineEventId,
    storyObject.id,
  )
  const displayStoryObject = resolveStoryObjectTemporalState(storyObject, objectTimelineChanges, {
    catalogEntriesByCatalogId,
    catalogGroupsByCatalogId,
    catalogs,
    hierarchyGroups,
    hierarchyNodesByGroupId,
    objectsByType,
  })
  const relatedTimelineEvents = timelineEvents.filter((event) =>
    event.participants.some(
      (participant) => participant.targetType === 'storyObject' && participant.targetId === storyObject.id,
    ),
  )
  const attributeGroups = groupAttributesByDefinition(displayStoryObject.attributes, attributeDefinitions, ui.main)
  const characterRelationships = [
    ...displayStoryObject.outgoingCharacterRelationships,
    ...displayStoryObject.incomingCharacterRelationships,
  ]
  const organizationMembers = getAutomaticOrganizationMembers(displayStoryObject, objectsByType.characters)
  const organizationMemberItems = getOrganizationMemberItems(organizationMembers)
  const characterOrganizations = getAutomaticCharacterOrganizations(displayStoryObject, objectsByType.organizations)
  const surnameLinkTargets = textLinkTargets.filter((target) => target.key.startsWith('organization-surname-'))
  const displaySurname = displayStoryObject.surname?.trim() ?? ''
  const isOrganization = displayStoryObject.typeKey === 'organizations'
  const isCharacter = displayStoryObject.typeKey === 'characters'
  const effectiveActiveTab = activeTab
  const dossierTabs: Array<[ObjectDossierTab, string]> = [
    ['main', ui.main],
    ['relations', ui.relations],
    ['structure', ui.structure],
    ['timeline', ui.timeline],
    ['gallery', ui.gallery],
  ]

  return (
    <div className="sp-detail-card">
      {onClose !== undefined && (
        <button className="sp-icon-button sp-detail-close" type="button" onClick={onClose}>
          x
        </button>
      )}
      <DetailActionsMenu ui={ui} onDelete={onDelete} onEdit={onEdit} />
      {timelineEvents.length > 0 && (
        <section className="sp-timeline-context-panel">
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
      <div className="sp-dossier-head">
        <ObjectPortrait storyObject={displayStoryObject} />
        <div>
          <span>{ui.dossier}</span>
          <h2>
            {displayStoryObject.name}
            {displaySurname.length > 0 && (
              <>
                {' '}
                <LinkedText targets={surnameLinkTargets} text={displaySurname} />
              </>
            )}
          </h2>
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
        <div>
          <span>{ui.currentStatus}</span>
          <strong>
            <LinkedText emptyText="-" targets={textLinkTargets} text={displayStoryObject.currentStatus} />
          </strong>
        </div>
        <div><span>{ui.objectType}</span><strong>{displayStoryObject.typeKey}</strong></div>
      </div>
      <section className="sp-panel">
        <h3>{ui.description}</h3>
        <p>
          <LinkedText emptyText={ui.unknownDescription} targets={textLinkTargets} text={displayStoryObject.description} />
        </p>
      </section>
      {dossierTimelineEvent !== null && selectedObjectTimelineChanges.length > 0 && (
        <section className="sp-panel sp-context-change-list">
          <h3>{ui.timelineSelectedChanges}</h3>
          {selectedObjectTimelineChanges.map((change) => (
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
            ...dossierTabs,
          ].map(([tab, label]) => (
            <button
              className={effectiveActiveTab === tab ? 'active' : ''}
              key={tab}
              type="button"
              onClick={() => onTabChange?.(tab)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
      {effectiveActiveTab === 'main' && (
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
            {displayStoryObject.catalogSelections.length === 0 ? (
              <p>{ui.noCatalogValues}</p>
            ) : (
              displayStoryObject.catalogSelections.map((selection) => (
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
            {displayStoryObject.hierarchySelections.length === 0 ? (
              <p>{ui.noHierarchyValues}</p>
            ) : (
              displayStoryObject.hierarchySelections.map((selection) => (
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
      {effectiveActiveTab === 'relations' && (
        <>
          {isOrganization ? (
            <>
              <CollapsibleDetailSection count={organizationMembers.length} title={ui.organizationMembers}>
                <p className="sp-editor-hint">{ui.organizationSurnameAutoAssignHint}</p>
                {organizationMembers.length === 0 ? (
                  <p>{ui.noOrganizationMembers}</p>
                ) : (
                  organizationMembers.map((member) => (
                    <div className="sp-row" key={member.id}>
                      <span>{member.typeKey}</span>
                      <strong>
                        <LinkedText targets={textLinkTargets} text={getObjectFullName(member)} />
                      </strong>
                    </div>
                  ))
                )}
              </CollapsibleDetailSection>
              <CollapsibleDetailSection count={organizationMemberItems.length} title={ui.organizationItems}>
                {organizationMemberItems.length === 0 ? (
                  <p>{ui.noOrganizationItems}</p>
                ) : (
                  organizationMemberItems.map((item) => (
                    <div className="sp-row" key={item.id}>
                      <span>{item.ownerName}</span>
                      <strong>
                        <LinkedText targets={textLinkTargets} text={item.name} />
                      </strong>
                    </div>
                  ))
                )}
              </CollapsibleDetailSection>
              <CollapsibleDetailSection count={displayStoryObject.territoryPlaces.length} title={ui.organizationTerritories}>
                {displayStoryObject.territoryPlaces.length === 0 ? (
                  <p>{ui.noOrganizationTerritories}</p>
                ) : (
                  displayStoryObject.territoryPlaces.map((reference) => (
                    <div className="sp-row" key={`${reference.typeKey}-${reference.id}`}>
                      <span>{reference.typeKey}</span>
                      <strong>
                        <LinkedText targets={textLinkTargets} text={reference.name} />
                      </strong>
                    </div>
                  ))
                )}
              </CollapsibleDetailSection>
            </>
          ) : (
            <>
              {isCharacter && (
                <CollapsibleDetailSection count={characterOrganizations.length} title={ui.organizations}>
                  <p className="sp-editor-hint">{ui.organizationSurnameAutoAssignHint}</p>
                  {characterOrganizations.length === 0 ? (
                    <p>{ui.noCharacterOrganizations}</p>
                  ) : (
                    characterOrganizations.map((organization) => (
                      <div className="sp-row" key={organization.id}>
                        <span>{ui.organizationMembership}</span>
                        <strong>
                          <LinkedText targets={textLinkTargets} text={organization.name} />
                        </strong>
                      </div>
                    ))
                  )}
                </CollapsibleDetailSection>
              )}
              <CollapsibleDetailSection count={characterRelationships.length} title={ui.relations}>
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
              </CollapsibleDetailSection>
              <CollapsibleDetailSection
                count={[displayStoryObject.ownedItems, displayStoryObject.owners, displayStoryObject.territoryPlaces, displayStoryObject.organizationsOnTerritory, displayStoryObject.ownerOrganizations, displayStoryObject.ownedTerritories].flat().length}
                title={ui.linkedObjects}
              >
                {[displayStoryObject.ownedItems, displayStoryObject.owners, displayStoryObject.territoryPlaces, displayStoryObject.organizationsOnTerritory, displayStoryObject.ownerOrganizations, displayStoryObject.ownedTerritories]
                  .flat()
                  .map((reference) => (
                    <div className="sp-row" key={`${reference.typeKey}-${reference.id}`}>
                      <span>{reference.typeKey}</span>
                      <strong>
                        <LinkedText targets={textLinkTargets} text={reference.name} />
                      </strong>
                    </div>
                  ))}
              </CollapsibleDetailSection>
            </>
          )}
        </>
      )}
      {effectiveActiveTab === 'structure' && (
        <>
          <StructureMembershipView
            catalogs={catalogs}
            dossierTimelineEventId={dossierTimelineEventId}
            mode="readonly"
            objectsByType={objectsByType}
            selectedProjectId={selectedProjectId}
            storyObject={displayStoryObject}
            timelineEvents={timelineEvents}
            ui={ui}
            onTimelineEventUpdated={onTimelineEventUpdated}
          />
          {isOrganization && (
            <OrganizationStructureView
              objectsByType={objectsByType}
              selectedProjectId={selectedProjectId}
              storyObject={storyObject}
              ui={ui}
            />
          )}
        </>
      )}
      {effectiveActiveTab === 'timeline' && (
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
      {effectiveActiveTab === 'gallery' && (
        <GalleryPanel
          caption={galleryImageCaption}
          images={displayStoryObject.galleryImages}
          imagePath={galleryImagePath}
          isCoverInGallery={
            displayStoryObject.imagePath !== null &&
            displayStoryObject.galleryImages.some((image) => image.imagePath === displayStoryObject.imagePath)
          }
          title={ui.gallery}
          ui={ui}
          renderCaption={(caption) => <LinkedText emptyText="-" targets={textLinkTargets} text={caption} />}
          onAddImage={onAddGalleryImage}
          onAddCoverImage={displayStoryObject.imagePath === null ? undefined : onAddCoverToGallery}
          onCaptionChange={onGalleryCaptionChange}
          onDeleteImage={onDeleteGalleryImage}
          onImageUpload={onGalleryImageUpload}
        />
      )}
    </div>
  )
}

