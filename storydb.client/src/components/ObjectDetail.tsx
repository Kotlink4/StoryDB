import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

import {
  applyStructureCatalogAssignmentSync,
  assignObjectToStructureRequest,
  assignStructureRequest,
  createStructureRequest,
  deleteStructureAssignmentRequest,
  deleteStructureUsageRequest,
  fetchStructure,
  fetchStructureAssignments,
  fetchStructureCatalogAssignmentSyncPreview,
  fetchStructures,
  fetchStructureUsages,
  getApiErrorMessage,
  makeStructureUsageIndividualRequest,
  updateTimelineEventRequest,
  updateStructureAssignmentRequest,
  updateOrganizationStructureRequest,
  updateStructureUsageRequest,
} from '../api'
import { groupAttributesByDefinition } from '../style-preview/domain/attributeDisplay'
import {
  getAutomaticCharacterOrganizations,
  getAutomaticOrganizationMembers,
  getOrganizationMemberItems,
} from '../style-preview/domain/organizationComposition'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ObjectDossierTab } from '../style-preview/domain/stylePreviewUiTypes'
import { formatTimelineChangeValue } from '../style-preview/domain/timelineDisplay'
import { toTimelineEventDraft } from '../style-preview/domain/stylePreviewTimelineDrafts'
import {
  getTimelineContextChangesForObject,
  resolveStructureAssignmentsTemporalState,
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
  Structure,
  StructureAssignment,
  StructureCatalogAssignmentSyncPreview,
  StructureNodeDraft,
  StructureSummary,
  StructureUsage,
  TimelineChangeDraft,
  TimelineEvent,
} from '../types'
import { LinkedText, type TextLinkTarget } from './LinkedText'
import { GalleryPanel } from './GalleryPanel'
import { AttributeIcon, DetailActionsMenu, ObjectPortrait } from './StylePreviewPrimitives'

const emptyStructureNodes: Structure['nodes'] = []

const createEmptyOrganizationStructureNodeDraft = (sortOrder: number): StructureNodeDraft => ({
  clientId: `organization-node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  parentClientId: null,
  linkedCatalogEntryId: null,
  linkedCatalogEntryGroupId: null,
  name: '',
  description: '',
  nodeType: '',
  color: '',
  iconKey: '',
  levelIndex: 0,
  sortOrder,
})

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
            objectsByType={objectsByType}
            selectedProjectId={selectedProjectId}
            storyObject={displayStoryObject}
            timelineEvents={timelineEvents}
            ui={ui}
            onTimelineEventUpdated={onTimelineEventUpdated}
          />
          {isOrganization && (
            <OrganizationStructureView
              catalogs={catalogs}
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

function StructureMembershipView({
  catalogs,
  dossierTimelineEventId,
  objectsByType,
  selectedProjectId,
  storyObject,
  timelineEvents,
  ui,
  onTimelineEventUpdated,
}: {
  catalogs: Catalog[]
  dossierTimelineEventId: string
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  selectedProjectId: number | null
  storyObject: StoryObject
  timelineEvents: TimelineEvent[]
  ui: PreviewText
  onTimelineEventUpdated?: (event: TimelineEvent) => void
}) {
  const [assignments, setAssignments] = useState<StructureAssignment[]>([])
  const [structureDetails, setStructureDetails] = useState<Record<number, Structure>>({})
  const [structureUsages, setStructureUsages] = useState<StructureUsage[]>([])
  const [selectedUsageId, setSelectedUsageId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [roleLabel, setRoleLabel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedUsage = structureUsages.find((usage) => String(usage.id) === selectedUsageId) ?? null
  const selectedStructure = selectedUsage === null ? null : structureDetails[selectedUsage.structureId] ?? null
  const selectedStructureNodes = selectedStructure?.nodes ?? emptyStructureNodes
  const objectsById = useMemo(
    () => new Map(Object.values(objectsByType).flat().map((object) => [object.id, object])),
    [objectsByType],
  )
  const catalogsById = useMemo(
    () => new Map(catalogs.map((catalog) => [catalog.id, catalog])),
    [catalogs],
  )
  const temporalAssignments = useMemo(
    () =>
      resolveStructureAssignmentsTemporalState(assignments, timelineEvents, dossierTimelineEventId, {
        objectsByType,
        storyObjectId: storyObject.id,
        structuresById: structureDetails,
      }),
    [assignments, dossierTimelineEventId, objectsByType, storyObject.id, structureDetails, timelineEvents],
  )
  const selectedTimelineEvent =
    timelineEvents.find((event) => String(event.id) === dossierTimelineEventId) ?? null
  const isTimelineContextActive = selectedTimelineEvent !== null

  const toStructureAssignmentSnapshot = useCallback(
    (assignment: StructureAssignment): StructureAssignment => ({
      id: assignment.id,
      projectId: assignment.projectId,
      structureUsageId: assignment.structureUsageId,
      structureId: assignment.structureId,
      structureName: assignment.structureName,
      structureNodeId: assignment.structureNodeId,
      structureNodeName: assignment.structureNodeName,
      storyObjectId: assignment.storyObjectId,
      storyObjectName: assignment.storyObjectName,
      storyObjectTypeKey: assignment.storyObjectTypeKey,
      roleLabel: assignment.roleLabel,
      notes: assignment.notes,
      sortOrder: assignment.sortOrder,
    }),
    [],
  )

  const saveStructureAssignmentsSnapshot = useCallback(
    async (nextAssignments: StructureAssignment[]) => {
      if (selectedProjectId === null || selectedTimelineEvent === null) {
        return false
      }

      const oldSnapshot = temporalAssignments.map(toStructureAssignmentSnapshot)
      const nextSnapshot = nextAssignments.map(toStructureAssignmentSnapshot)
      const oldValue = JSON.stringify(oldSnapshot)
      const newValue = JSON.stringify(nextSnapshot)

      if (oldValue === newValue) {
        return true
      }

      const eventDraft = toTimelineEventDraft(selectedTimelineEvent)
      const retainedChanges = eventDraft.changes.filter(
        (change) =>
          !(
            change.changeType === 'structureAssignment' &&
            change.targetType === 'storyObject' &&
            Number(change.targetId) === storyObject.id &&
            change.fieldName === 'structureAssignments'
          ),
      )
      const participants = eventDraft.participants.some(
        (participant) => participant.targetType === 'storyObject' && Number(participant.targetId) === storyObject.id,
      )
        ? eventDraft.participants
        : [...eventDraft.participants, { targetType: 'storyObject', targetId: String(storyObject.id), role: '' }]
      const snapshotChange: TimelineChangeDraft = {
        changeType: 'structureAssignment',
        targetType: 'storyObject',
        targetId: String(storyObject.id),
        fieldName: 'structureAssignments',
        oldValue,
        newValue,
        notes: '',
      }
      const savedEvent = await updateTimelineEventRequest(selectedProjectId, selectedTimelineEvent.id, {
        ...eventDraft,
        participants,
        changes: [...retainedChanges, snapshotChange],
      })

      onTimelineEventUpdated?.(savedEvent)
      return true
    },
    [
      onTimelineEventUpdated,
      selectedProjectId,
      selectedTimelineEvent,
      storyObject.id,
      temporalAssignments,
      toStructureAssignmentSnapshot,
    ],
  )
  const getUsageLabel = useCallback(
    (usage: StructureUsage) => {
      const targetLabel =
        usage.targetKind === 'project'
          ? ui.structureOwnerProject
          : usage.targetKind === 'catalog'
            ? catalogsById.get(usage.targetId)?.name ?? ui.structureOwnerCatalog
            : objectsById.get(usage.targetId)?.name ?? ui.structureOwnerObject

      return `${usage.displayName ?? usage.structureName} · ${targetLabel}`
    },
    [
      catalogsById,
      objectsById,
      ui.structureOwnerCatalog,
      ui.structureOwnerObject,
      ui.structureOwnerProject,
    ],
  )

  const loadMembershipData = useCallback(async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [loadedAssignments, loadedUsages] = await Promise.all([
        fetchStructureAssignments(selectedProjectId, { storyObjectId: storyObject.id }),
        fetchStructureUsages(selectedProjectId),
      ])
      const uniqueStructureIds = Array.from(new Set(loadedUsages.map((usage) => usage.structureId)))
      const detailEntries = await Promise.all(
        uniqueStructureIds.map(async (structureId) => {
          const structure = await fetchStructure(selectedProjectId, structureId)
          return [structureId, structure] as const
        }),
      )
      const details = Object.fromEntries(detailEntries)
      const usableUsages = loadedUsages.filter((usage) => (details[usage.structureId]?.nodes.length ?? 0) > 0)

      setAssignments(loadedAssignments)
      setStructureUsages(usableUsages)
      setStructureDetails(details)
      setSelectedUsageId((currentUsageId) =>
        usableUsages.some((usage) => String(usage.id) === currentUsageId)
          ? currentUsageId
          : String(usableUsages[0]?.id ?? ''),
      )
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentLoadFailed))
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId, storyObject.id, ui.structureAssignmentLoadFailed])

  useEffect(() => {
    void loadMembershipData()
  }, [loadMembershipData])

  useEffect(() => {
    setSelectedNodeId((currentNodeId) =>
      selectedStructureNodes.some((node) => String(node.id) === currentNodeId)
        ? currentNodeId
        : String(selectedStructureNodes[0]?.id ?? ''),
    )
  }, [selectedStructureNodes])

  const createAssignment = async () => {
    if (
      selectedProjectId === null ||
      selectedUsage === null ||
      selectedNodeId.trim().length === 0 ||
      isSaving
    ) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (isTimelineContextActive) {
        const selectedNode = selectedStructureNodes.find((node) => String(node.id) === selectedNodeId)

        if (selectedNode === undefined || selectedStructure === null) {
          return
        }

        const nextAssignment: StructureAssignment = {
          id: -Date.now(),
          projectId: selectedProjectId,
          structureUsageId: selectedUsage.id,
          structureId: selectedUsage.structureId,
          structureName: selectedStructure.name,
          structureNodeId: selectedNode.id,
          structureNodeName: selectedNode.name,
          storyObjectId: storyObject.id,
          storyObjectName: storyObject.name,
          storyObjectTypeKey: storyObject.typeKey as ObjectTypeKey,
          roleLabel: roleLabel.trim().length === 0 ? null : roleLabel.trim(),
          notes: null,
          sortOrder: temporalAssignments.length,
        }

        await saveStructureAssignmentsSnapshot([...temporalAssignments, nextAssignment])
        setRoleLabel('')
        return
      }

      await assignObjectToStructureRequest(selectedProjectId, selectedUsage.id, {
        structureNodeId: Number(selectedNodeId),
        storyObjectId: storyObject.id,
        roleLabel,
        notes: '',
        sortOrder: assignments.length,
      })
      setRoleLabel('')
      await loadMembershipData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAssignment = async (assignment: StructureAssignment) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (isTimelineContextActive) {
        await saveStructureAssignmentsSnapshot(temporalAssignments.filter((item) => item.id !== assignment.id))
        return
      }

      await deleteStructureAssignmentRequest(selectedProjectId, assignment.id)
      await loadMembershipData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentDeleteFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateAssignmentRole = async (assignment: StructureAssignment, nextRoleLabel: string) => {
    if (selectedProjectId === null || isSaving || nextRoleLabel.trim() === (assignment.roleLabel ?? '')) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      if (isTimelineContextActive) {
        await saveStructureAssignmentsSnapshot(
          temporalAssignments.map((item) =>
            item.id === assignment.id
              ? { ...item, roleLabel: nextRoleLabel.trim().length === 0 ? null : nextRoleLabel.trim() }
              : item,
          ),
        )
        return
      }

      await updateStructureAssignmentRequest(selectedProjectId, assignment.id, {
        structureNodeId: assignment.structureNodeId,
        storyObjectId: assignment.storyObjectId,
        roleLabel: nextRoleLabel,
        notes: assignment.notes ?? '',
        sortOrder: assignment.sortOrder,
      })
      await loadMembershipData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  if (selectedProjectId === null) {
    return null
  }

  return (
    <CollapsibleDetailSection count={temporalAssignments.length} title={ui.structureMembership}>
      <div className="sp-structure-membership">
        <p className="sp-editor-hint">{ui.structureMembershipHint}</p>
        {error !== null && <p className="sp-editor-error">{error}</p>}
        {isLoading && <p className="sp-editor-hint">{ui.loading}</p>}

        {temporalAssignments.length === 0 ? (
          <p>{ui.noStructureAssignments}</p>
        ) : (
          <div className="sp-structure-assignment-list">
            {temporalAssignments.map((assignment) => (
              <div className="sp-row" key={assignment.id}>
                <span>{assignment.structureName}</span>
                <strong>
                  {assignment.structureNodeName}
                  <input
                    aria-label={ui.role}
                    defaultValue={assignment.roleLabel ?? ''}
                    disabled={isSaving || (!isTimelineContextActive && assignment.id < 0)}
                    placeholder={ui.role}
                    onBlur={(event) => void updateAssignmentRole(assignment, event.currentTarget.value)}
                  />
                </strong>
                <button
                  className="sp-icon-button"
                  disabled={isSaving || (!isTimelineContextActive && assignment.id < 0)}
                  type="button"
                  onClick={() => void deleteAssignment(assignment)}
                  title={ui.delete}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="sp-structure-membership-controls">
          <label>
            {ui.structure}
            <select
              disabled={structureUsages.length === 0 || isSaving}
              value={selectedUsageId}
              onChange={(event) => setSelectedUsageId(event.target.value)}
            >
              {structureUsages.length === 0 ? (
                <option value="">{ui.noStructures}</option>
              ) : (
                structureUsages.map((usage) => (
                  <option key={usage.id} value={usage.id}>
                    {getUsageLabel(usage)}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            {ui.structureNode}
            <select
              disabled={selectedStructureNodes.length === 0 || isSaving}
              value={selectedNodeId}
              onChange={(event) => setSelectedNodeId(event.target.value)}
            >
              {selectedStructureNodes.length === 0 ? (
                <option value="">{ui.noStructureNodes}</option>
              ) : (
                selectedStructureNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            {ui.role}
            <input value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} />
          </label>
          <button
            className="sp-button primary"
            disabled={selectedUsage === null || selectedNodeId.trim().length === 0 || isSaving}
            type="button"
            onClick={() => void createAssignment()}
          >
            {isSaving ? ui.saving : ui.structureAssignObject}
          </button>
        </div>
      </div>
    </CollapsibleDetailSection>
  )
}

function OrganizationStructureView({
  catalogs,
  objectsByType,
  selectedProjectId,
  storyObject,
  ui,
}: {
  catalogs: Catalog[]
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  selectedProjectId: number | null
  storyObject: StoryObject
  ui: PreviewText
}) {
  const [availableStructures, setAvailableStructures] = useState<StructureSummary[]>([])
  const [assignmentObjectId, setAssignmentObjectId] = useState('')
  const [assignmentRoleLabel, setAssignmentRoleLabel] = useState('')
  const [assignmentStructureNodeId, setAssignmentStructureNodeId] = useState('')
  const [assignmentUsageId, setAssignmentUsageId] = useState('')
  const [individualStructureNodes, setIndividualStructureNodes] = useState<StructureNodeDraft[]>(() =>
    createStarterOrganizationNodes(ui),
  )
  const [selectedStructureId, setSelectedStructureId] = useState('')
  const [structureAssignments, setStructureAssignments] = useState<Record<number, StructureAssignment[]>>({})
  const [structureAssignmentSyncPreviews, setStructureAssignmentSyncPreviews] = useState<
    Record<number, StructureCatalogAssignmentSyncPreview>
  >({})
  const [structureDetails, setStructureDetails] = useState<Record<number, Structure>>({})
  const [structureUsages, setStructureUsages] = useState<StructureUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMigratedLegacyStructure, setHasMigratedLegacyStructure] = useState(false)
  const unassignedStructures = availableStructures.filter(
    (structure) => !structureUsages.some((usage) => usage.structureId === structure.id),
  )
  const assignableObjects = useMemo(
    () =>
      Object.values(objectsByType)
        .flat()
        .filter((object) => object.id !== storyObject.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [objectsByType, storyObject.id],
  )
  const assignmentUsage = structureUsages.find((usage) => String(usage.id) === assignmentUsageId) ?? null
  const assignmentStructure = assignmentUsage === null ? null : structureDetails[assignmentUsage.structureId] ?? null
  const assignmentNodes = assignmentStructure?.nodes ?? emptyStructureNodes
  const canCreateIndividualStructure =
    !isSaving && individualStructureNodes.some((node) => node.name.trim().length > 0)

  const loadStructureData = useCallback(async () => {
    if (selectedProjectId === null) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [structures, usages] = await Promise.all([
        fetchStructures(selectedProjectId),
        fetchStructureUsages(selectedProjectId, {
          targetKind: 'object',
          targetId: storyObject.id,
        }),
      ])
      const detailEntries = await Promise.all(
        usages.map(async (usage) => {
          const structure = await fetchStructure(selectedProjectId, usage.structureId)
          return [usage.structureId, structure] as const
        }),
      )
      const assignmentEntries = await Promise.all(
        usages.map(async (usage) => {
          const assignments = await fetchStructureAssignments(selectedProjectId, {
            structureUsageId: usage.id,
          })
          return [usage.id, assignments] as const
        }),
      )
      const details = Object.fromEntries(detailEntries)
      const previewEntries = await Promise.all(
        usages
          .filter((usage) => details[usage.structureId]?.linkedCatalogId !== null)
          .map(async (usage) => {
            try {
              const preview = await fetchStructureCatalogAssignmentSyncPreview(selectedProjectId, usage.id)
              return [usage.id, preview] as const
            } catch {
              return null
            }
          }),
      )
      setAvailableStructures(structures)
      setStructureUsages(usages)
      setStructureDetails(details)
      setStructureAssignments(Object.fromEntries(assignmentEntries))
      setStructureAssignmentSyncPreviews(Object.fromEntries(previewEntries.filter((entry) => entry !== null)))
      setSelectedStructureId((currentId) =>
        currentId.trim().length > 0 &&
        structures.some((structure) => String(structure.id) === currentId) &&
        !usages.some((usage) => String(usage.structureId) === currentId)
          ? currentId
          : String(structures.find((structure) => !usages.some((usage) => usage.structureId === structure.id))?.id ?? ''),
      )
      setAssignmentUsageId((currentUsageId) =>
        usages.some((usage) => String(usage.id) === currentUsageId)
          ? currentUsageId
          : String(usages[0]?.id ?? ''),
      )
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignFailed))
    } finally {
      setIsLoading(false)
    }
  }, [selectedProjectId, storyObject.id, ui.structureAssignFailed])

  useEffect(() => {
    void loadStructureData()
  }, [loadStructureData])

  useEffect(() => {
    setIndividualStructureNodes(createStarterOrganizationNodes(ui))
  }, [storyObject.id, ui])

  useEffect(() => {
    setHasMigratedLegacyStructure(false)
  }, [storyObject.id, storyObject.organizationStructureLevels.length])

  useEffect(() => {
    setAssignmentObjectId((currentObjectId) =>
      assignableObjects.some((object) => String(object.id) === currentObjectId)
        ? currentObjectId
        : String(assignableObjects[0]?.id ?? ''),
    )
  }, [assignableObjects])

  useEffect(() => {
    setAssignmentStructureNodeId((currentNodeId) =>
      assignmentNodes.some((node) => String(node.id) === currentNodeId)
        ? currentNodeId
        : String(assignmentNodes[0]?.id ?? ''),
    )
  }, [assignmentNodes])

  const assignExistingStructure = async () => {
    if (selectedProjectId === null || selectedStructureId.trim().length === 0 || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await assignStructureRequest(selectedProjectId, Number(selectedStructureId), {
        targetKind: 'object',
        targetId: storyObject.id,
        displayName: '',
        notes: '',
        isPrimary: structureUsages.length === 0,
      })
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const createIndividualStructure = async () => {
    if (selectedProjectId === null || !canCreateIndividualStructure) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const validClientIds = new Set(
        individualStructureNodes
          .filter((node) => node.name.trim().length > 0)
          .map((node) => node.clientId),
      )
      const nodes = individualStructureNodes
        .filter((node) => node.name.trim().length > 0)
        .map((node, index) => ({
          ...node,
          parentClientId:
            node.parentClientId !== null && validClientIds.has(node.parentClientId)
              ? node.parentClientId
              : null,
          sortOrder: node.sortOrder >= 0 ? node.sortOrder : index,
        }))
      const structure = await createStructureRequest(selectedProjectId, {
        name: `${storyObject.name} - ${ui.structure}`,
        description: '',
        ownerKind: 'object',
        ownerId: storyObject.id,
        layoutKind: 'levels',
        nodeBindingMode: 'mixed',
        catalogSyncMode: 'manual',
        linkedCatalogId: null,
        nodes,
        edges: [],
      })
      await assignStructureRequest(selectedProjectId, structure.id, {
        targetKind: 'object',
        targetId: storyObject.id,
        displayName: '',
        notes: '',
        isPrimary: structureUsages.length === 0,
      })
      setIndividualStructureNodes(createStarterOrganizationNodes(ui))
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureCreateFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateIndividualStructureNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setIndividualStructureNodes((currentNodes) =>
      currentNodes.map((node) => (node.clientId === clientId ? { ...node, ...patch } : node)),
    )

  const addIndividualStructureNode = () =>
    setIndividualStructureNodes((currentNodes) => [
      ...currentNodes,
      createEmptyOrganizationStructureNodeDraft(currentNodes.length),
    ])

  const removeIndividualStructureNode = (clientId: string) =>
    setIndividualStructureNodes((currentNodes) =>
      currentNodes
        .filter((node) => node.clientId !== clientId)
        .map((node) => ({
          ...node,
          parentClientId: node.parentClientId === clientId ? null : node.parentClientId,
        })),
    )

  const resetIndividualStructureNodes = () => setIndividualStructureNodes(createStarterOrganizationNodes(ui))

  const makeUsageIndividual = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await makeStructureUsageIndividualRequest(selectedProjectId, usage.id)
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureMakeIndividualFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateUsagePrimaryState = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving || usage.isPrimary) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updateStructureUsageRequest(selectedProjectId, usage.id, {
        targetKind: usage.targetKind,
        targetId: usage.targetId,
        displayName: usage.displayName ?? '',
        notes: usage.notes ?? '',
        isPrimary: true,
      })
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureUsageUpdateFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const disconnectUsage = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await deleteStructureUsageRequest(selectedProjectId, usage.id)
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureDisconnectFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const migrateLegacyStructure = async () => {
    if (selectedProjectId === null || isSaving || storyObject.organizationStructureLevels.length === 0) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const nodes = storyObject.organizationStructureLevels.flatMap((level, levelIndex) => {
        const slots = [...level.slots].sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id)
        if (slots.length === 0) {
          return [
            {
              ...createEmptyOrganizationStructureNodeDraft(levelIndex),
              clientId: `legacy-level-${level.id}`,
              name: level.name,
              description: level.description ?? '',
              nodeType: ui.structureLevelIndex,
              levelIndex,
              sortOrder: level.sortOrder,
            },
          ]
        }

        return slots.map((slot) => ({
          ...createEmptyOrganizationStructureNodeDraft(slot.sortOrder),
          clientId: `legacy-slot-${slot.id}`,
          name: slot.name,
          description: slot.description ?? level.description ?? '',
          nodeType: slot.slotType ?? level.name,
          color: slot.color ?? '',
          iconKey: slot.iconKey ?? '',
          levelIndex,
          sortOrder: slot.sortOrder,
        }))
      })

      const structure = await createStructureRequest(selectedProjectId, {
        name: `${storyObject.name} - ${ui.structure}`,
        description: ui.legacyOrganizationStructureHint,
        ownerKind: 'object',
        ownerId: storyObject.id,
        layoutKind: 'levels',
        nodeBindingMode: 'none',
        catalogSyncMode: 'manual',
        linkedCatalogId: null,
        nodes,
        edges: [],
      })
      await assignStructureRequest(selectedProjectId, structure.id, {
        targetKind: 'object',
        targetId: storyObject.id,
        displayName: '',
        notes: ui.structureMigratedFromLegacy,
        isPrimary: structureUsages.length === 0,
      })
      await updateOrganizationStructureRequest(selectedProjectId, storyObject.id, [])
      setHasMigratedLegacyStructure(true)
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureLegacyMigrationFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const createAssignment = async () => {
    if (
      selectedProjectId === null ||
      assignmentUsage === null ||
      assignmentObjectId.trim().length === 0 ||
      assignmentStructureNodeId.trim().length === 0 ||
      isSaving
    ) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const assignments = structureAssignments[assignmentUsage.id] ?? []
      await assignObjectToStructureRequest(selectedProjectId, assignmentUsage.id, {
        structureNodeId: Number(assignmentStructureNodeId),
        storyObjectId: Number(assignmentObjectId),
        roleLabel: assignmentRoleLabel,
        notes: '',
        sortOrder: assignments.length,
      })
      setAssignmentRoleLabel('')
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAssignment = async (assignment: StructureAssignment) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await deleteStructureAssignmentRequest(selectedProjectId, assignment.id)
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentDeleteFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const updateAssignmentRole = async (assignment: StructureAssignment, nextRoleLabel: string) => {
    if (selectedProjectId === null || isSaving || nextRoleLabel.trim() === (assignment.roleLabel ?? '')) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await updateStructureAssignmentRequest(selectedProjectId, assignment.id, {
        structureNodeId: assignment.structureNodeId,
        storyObjectId: assignment.storyObjectId,
        roleLabel: nextRoleLabel,
        notes: assignment.notes ?? '',
        sortOrder: assignment.sortOrder,
      })
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureAssignmentSaveFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const syncCatalogAssignments = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const result = await applyStructureCatalogAssignmentSync(selectedProjectId, usage.id)
      setStructureAssignments((currentAssignments) => ({
        ...currentAssignments,
        [usage.id]: result.assignments,
      }))
      await loadStructureData()
    } catch (error) {
      setError(getApiErrorMessage(error, ui.structureCatalogAssignmentSyncFailed))
    } finally {
      setIsSaving(false)
    }
  }

  const legacyStructure = storyObject.organizationStructureLevels.length > 0 && !hasMigratedLegacyStructure

  if (selectedProjectId === null) {
    return (
      <section className="sp-panel sp-organization-structure-empty">
        <h3>{ui.structure}</h3>
        <p>{ui.projectNotSelected}</p>
      </section>
    )
  }

  return (
    <section className="sp-panel sp-organization-structure">
      <h3>{ui.structure}</h3>
      <p>{ui.organizationStructureUsageHint}</p>

      {error !== null && <p className="sp-editor-error">{error}</p>}
      {isLoading && <p className="sp-editor-hint">{ui.loading}</p>}

      <div className="sp-structure-connect-panel">
        <label>
          {ui.structureTemplate}
          <select
            disabled={unassignedStructures.length === 0 || isSaving}
            value={selectedStructureId}
            onChange={(event) => setSelectedStructureId(event.target.value)}
          >
            {unassignedStructures.length === 0 ? (
              <option value="">{ui.noStructures}</option>
            ) : (
              unassignedStructures.map((structure) => (
                <option key={structure.id} value={structure.id}>
                  {structure.name}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="sp-organization-structure-builder">
          <div className="sp-structure-nodes-head">
            <div>
              <h3>{ui.structureQuickBuilder}</h3>
              <p>{ui.structureQuickBuilderHint}</p>
            </div>
            <div className="sp-detail-actions">
              <button className="sp-button" disabled={isSaving} type="button" onClick={addIndividualStructureNode}>
                {ui.structureAddNode}
              </button>
              <button className="sp-button" disabled={isSaving} type="button" onClick={resetIndividualStructureNodes}>
                {ui.structureResetStarterNodes}
              </button>
            </div>
          </div>
          <OrganizationStructureNodeDraftList
            nodes={individualStructureNodes}
            ui={ui}
            onNodeChange={updateIndividualStructureNode}
            onNodeRemove={removeIndividualStructureNode}
          />
        </div>
        <div className="sp-detail-actions">
          <button
            className="sp-button"
            disabled={unassignedStructures.length === 0 || isSaving}
            type="button"
            onClick={() => void assignExistingStructure()}
          >
            {ui.structureAssignExisting}
          </button>
          <button
            className="sp-button primary"
            disabled={!canCreateIndividualStructure}
            type="button"
            onClick={() => void createIndividualStructure()}
          >
            {ui.structureCreateIndividual}
          </button>
        </div>
      </div>

      {structureUsages.length > 0 && (
        <div className="sp-structure-assignment-editor">
          <div>
            <strong>{ui.structureAssignmentEditor}</strong>
            <p className="sp-editor-hint">{ui.structureAssignmentEditorHint}</p>
          </div>
          <div className="sp-structure-membership-controls">
            <label>
              {ui.structure}
              <select
                disabled={structureUsages.length === 0 || isSaving}
                value={assignmentUsageId}
                onChange={(event) => setAssignmentUsageId(event.target.value)}
              >
                {structureUsages.map((usage) => (
                  <option key={usage.id} value={usage.id}>
                    {usage.displayName ?? usage.structureName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {ui.structureNode}
              <select
                disabled={assignmentNodes.length === 0 || isSaving}
                value={assignmentStructureNodeId}
                onChange={(event) => setAssignmentStructureNodeId(event.target.value)}
              >
                {assignmentNodes.length === 0 ? (
                  <option value="">{ui.noStructureNodes}</option>
                ) : (
                  assignmentNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              {ui.structureAssignmentTarget}
              <select
                disabled={assignableObjects.length === 0 || isSaving}
                value={assignmentObjectId}
                onChange={(event) => setAssignmentObjectId(event.target.value)}
              >
                {assignableObjects.length === 0 ? (
                  <option value="">{ui.noAvailableObjects}</option>
                ) : (
                  assignableObjects.map((object) => (
                    <option key={object.id} value={object.id}>
                      {object.name} · {object.typeKey}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              {ui.role}
              <input value={assignmentRoleLabel} onChange={(event) => setAssignmentRoleLabel(event.target.value)} />
            </label>
            <button
              className="sp-button primary"
              disabled={
                assignmentUsage === null ||
                assignmentStructureNodeId.trim().length === 0 ||
                assignmentObjectId.trim().length === 0 ||
                isSaving
              }
              type="button"
              onClick={() => void createAssignment()}
            >
              {isSaving ? ui.saving : ui.structureAssignObject}
            </button>
          </div>
        </div>
      )}

      {structureUsages.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noOrganizationStructure}</strong>
          <span>{ui.structureOptionalHint}</span>
        </div>
      ) : (
        <div className="sp-organization-structure-levels">
          {structureUsages.map((usage) => {
            const structure = structureDetails[usage.structureId]
            const linkedCatalog =
              structure?.linkedCatalogId === null || structure?.linkedCatalogId === undefined
                ? null
                : catalogs.find((catalog) => catalog.id === structure.linkedCatalogId) ?? null
            const assignments = structureAssignments[usage.id] ?? []
            const assignmentSyncPreview = structureAssignmentSyncPreviews[usage.id] ?? null
            const levelIndexes =
              structure === undefined
                ? []
                : Array.from(new Set(structure.nodes.map((node) => node.levelIndex))).sort(
                    (left, right) => left - right,
                  )

            return (
              <details className="sp-collapsible-section sp-organization-structure-usage" key={usage.id} open>
                <summary>
                  <span>{usage.displayName ?? usage.structureName}</span>
                  <strong>{usage.isPrimary ? ui.primary : ui.structureTemplate}</strong>
                </summary>
                {(structure?.ownerKind === 'object' || linkedCatalog !== null) && (
                  <div className="sp-tags sp-structure-usage-meta">
                    {structure?.ownerKind === 'object' && <span>{ui.structureIndividual}</span>}
                    {linkedCatalog !== null && (
                      <>
                        <span>{ui.structureLinkedCatalog}: {linkedCatalog.name}</span>
                        <span>{ui.structureSharedCatalog}</span>
                        {assignmentSyncPreview !== null && (
                          <span>
                            {ui.structureCatalogAssignmentSyncMissing}: {assignmentSyncPreview.missingAssignmentCount}
                          </span>
                        )}
                        {assignmentSyncPreview !== null && (
                          <span>
                            {ui.structureCatalogAssignmentSyncExisting}: {assignmentSyncPreview.existingAssignmentCount}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
                {usage.notes !== null && usage.notes.trim().length > 0 && <p>{usage.notes}</p>}
                {structure !== undefined && (
                  levelIndexes.length === 0 ? (
                    <p>{ui.noStructureNodes}</p>
                  ) : (
                    <div className="sp-organization-structure-node-preview">
                      {levelIndexes.map((levelIndex) => (
                        <details className="sp-collapsible-section sp-organization-structure-node-level" key={levelIndex} open>
                          <summary>
                            <span>{ui.structureLevelIndex} {levelIndex + 1}</span>
                            <strong>
                              {structure.nodes.filter((node) => node.levelIndex === levelIndex).length}
                            </strong>
                          </summary>
                          <div>
                            {structure.nodes
                              .filter((node) => node.levelIndex === levelIndex)
                              .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
                              .map((node) => (
                                <article className="sp-structure-node-member-card" key={node.id}>
                                  <strong>{node.name}</strong>
                                  {assignments.filter((assignment) => assignment.structureNodeId === node.id).length === 0 ? (
                                    <span>{ui.noStructureNodeMembers}</span>
                                  ) : (
                                    <div>
                                      {assignments
                                        .filter((assignment) => assignment.structureNodeId === node.id)
                                        .map((assignment) => (
                                          <span className="sp-structure-node-member" key={assignment.id}>
                                            <span>
                                              {assignment.storyObjectName}
                                            </span>
                                            <input
                                              aria-label={ui.role}
                                              defaultValue={assignment.roleLabel ?? ''}
                                              disabled={isSaving}
                                              placeholder={ui.role}
                                              onBlur={(event) =>
                                                void updateAssignmentRole(assignment, event.currentTarget.value)
                                              }
                                            />
                                            <button
                                              className="sp-icon-button"
                                              disabled={isSaving}
                                              type="button"
                                              onClick={() => void deleteAssignment(assignment)}
                                              title={ui.delete}
                                            >
                                              <X aria-hidden="true" size={14} />
                                            </button>
                                          </span>
                                        ))}
                                    </div>
                                  )}
                                </article>
                              ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  )
                )}
                <div className="sp-detail-actions">
                  {linkedCatalog !== null && (
                    <button
                      className="sp-button"
                      disabled={
                        isSaving ||
                        assignmentSyncPreview === null ||
                        assignmentSyncPreview.missingAssignmentCount === 0
                      }
                      type="button"
                      onClick={() => void syncCatalogAssignments(usage)}
                    >
                      {ui.structureCatalogAssignmentSync}
                    </button>
                  )}
                  {!usage.isPrimary && (
                    <button
                      className="sp-button"
                      disabled={isSaving}
                      type="button"
                      onClick={() => void updateUsagePrimaryState(usage)}
                    >
                      {ui.structureMakePrimary}
                    </button>
                  )}
                  {structure?.ownerKind !== 'object' && (
                    <button
                      className="sp-button"
                      disabled={isSaving}
                      type="button"
                      onClick={() => void makeUsageIndividual(usage)}
                    >
                      {ui.structureMakeIndividual}
                    </button>
                  )}
                  <button
                    className="sp-button danger"
                    disabled={isSaving || assignments.length > 0}
                    type="button"
                    title={assignments.length > 0 ? ui.structureDisconnectWithAssignmentsHint : ui.structureDisconnect}
                    onClick={() => void disconnectUsage(usage)}
                  >
                    {ui.structureDisconnect}
                  </button>
                </div>
              </details>
            )
          })}
        </div>
      )}

      {legacyStructure && (
        <details className="sp-collapsible-section sp-organization-structure-level">
          <summary>
            <span>{ui.legacyOrganizationStructure}</span>
            <strong>{storyObject.organizationStructureLevels.length}</strong>
          </summary>
          <p className="sp-editor-hint">{ui.legacyOrganizationStructureHint}</p>
          <div className="sp-detail-actions">
            <button
              className="sp-button primary"
              disabled={isSaving}
              type="button"
              onClick={() => void migrateLegacyStructure()}
            >
              {isSaving ? ui.saving : ui.structureMigrateLegacy}
            </button>
          </div>
        </details>
      )}
    </section>
  )
}

function createStarterOrganizationNodes(ui: PreviewText): StructureNodeDraft[] {
  return [
    {
      clientId: 'starter-leadership',
      parentClientId: null,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: null,
      name: ui.structureStarterLeadership,
      description: '',
      nodeType: ui.structureStarterStatus,
      color: '',
      iconKey: '',
      levelIndex: 0,
      sortOrder: 0,
    },
    {
      clientId: 'starter-core',
      parentClientId: null,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: null,
      name: ui.structureStarterCore,
      description: '',
      nodeType: ui.structureStarterStatus,
      color: '',
      iconKey: '',
      levelIndex: 1,
      sortOrder: 0,
    },
    {
      clientId: 'starter-outer',
      parentClientId: null,
      linkedCatalogEntryId: null,
      linkedCatalogEntryGroupId: null,
      name: ui.structureStarterOuter,
      description: '',
      nodeType: ui.structureStarterStatus,
      color: '',
      iconKey: '',
      levelIndex: 2,
      sortOrder: 0,
    },
  ]
}

function OrganizationStructureNodeDraftList({
  nodes,
  ui,
  onNodeChange,
  onNodeRemove,
}: {
  nodes: StructureNodeDraft[]
  ui: PreviewText
  onNodeChange: (clientId: string, patch: Partial<StructureNodeDraft>) => void
  onNodeRemove: (clientId: string) => void
}) {
  return (
    <div className="sp-structure-node-list compact">
      {nodes.map((node) => (
        <article className="sp-structure-node-row compact" key={node.clientId}>
          <label>
            {ui.name}
            <input
              value={node.name}
              onChange={(event) => onNodeChange(node.clientId, { name: event.target.value })}
            />
          </label>
          <label>
            {ui.structureParentNode}
            <select
              value={node.parentClientId ?? ''}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  parentClientId: event.target.value === '' ? null : event.target.value,
                })
              }
            >
              <option value="">{ui.noGroup}</option>
              {nodes
                .filter((parentNode) => parentNode.clientId !== node.clientId && parentNode.name.trim().length > 0)
                .map((parentNode) => (
                  <option key={parentNode.clientId} value={parentNode.clientId}>
                    {parentNode.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            {ui.structureLevelIndex}
            <input
              min="0"
              type="number"
              value={node.levelIndex}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  levelIndex: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </label>
          <label>
            {ui.structureSortOrder}
            <input
              min="0"
              type="number"
              value={node.sortOrder}
              onChange={(event) =>
                onNodeChange(node.clientId, {
                  sortOrder: Math.max(0, Number(event.target.value) || 0),
                })
              }
            />
          </label>
          <div className="sp-structure-node-actions">
            <button
              className="sp-button danger"
              type="button"
              onClick={() => onNodeRemove(node.clientId)}
            >
              {ui.delete}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function CollapsibleDetailSection({
  children,
  count,
  title,
}: {
  children: ReactNode
  count: number
  title: string
}) {
  return (
    <details className="sp-panel sp-collapsible-section" open>
      <summary>
        <span>{title}</span>
        <strong>{count}</strong>
      </summary>
      {children}
    </details>
  )
}
