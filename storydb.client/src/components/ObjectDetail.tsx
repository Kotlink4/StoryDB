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
import { DetailActionsMenu, ObjectPortrait } from './StylePreviewPrimitives'
import { ObjectDetailMainTab } from './object-detail/ObjectDetailMainTab'
import { ObjectDetailRelationsTab } from './object-detail/ObjectDetailRelationsTab'
import { ObjectDetailTimelineTab } from './object-detail/ObjectDetailTimelineTab'
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
        <ObjectDetailMainTab
          attributeDefinitions={attributeDefinitions}
          attributeGroupDefinitions={attributeGroupDefinitions}
          attributeGroups={attributeGroups}
          displayStoryObject={displayStoryObject}
          textLinkTargets={textLinkTargets}
          ui={ui}
        />
      )}
      {effectiveActiveTab === 'relations' && (
        <ObjectDetailRelationsTab
          characterOrganizations={characterOrganizations}
          characterRelationships={characterRelationships}
          displayStoryObject={displayStoryObject}
          isCharacter={isCharacter}
          isOrganization={isOrganization}
          organizationMemberItems={organizationMemberItems}
          organizationMembers={organizationMembers}
          textLinkTargets={textLinkTargets}
          ui={ui}
        />
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
        <ObjectDetailTimelineTab
          relatedTimelineEvents={relatedTimelineEvents}
          ui={ui}
          onOpenTimelineEvent={onOpenTimelineEvent}
        />
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

