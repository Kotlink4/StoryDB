import { useEffect, useState, type ReactNode } from 'react'

import {
  assignStructureRequest,
  createStructureRequest,
  fetchStructure,
  fetchStructures,
  fetchStructureUsages,
  makeStructureUsageIndividualRequest,
} from '../api'
import { groupAttributesByDefinition } from '../style-preview/domain/attributeDisplay'
import {
  getAutomaticCharacterOrganizations,
  getAutomaticOrganizationMembers,
  getOrganizationMemberItems,
} from '../style-preview/domain/organizationComposition'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ObjectDossierTab } from '../style-preview/domain/stylePreviewUiTypes'
import { applyTimelineChangesToObject, formatTimelineChangeValue } from '../style-preview/domain/timelineDisplay'
import { getObjectFullName } from '../style-preview/domain/objectDisplay'
import type {
  AttributeDefinition,
  AttributeGroup,
  ObjectTypeKey,
  StoryObject,
  Structure,
  StructureSummary,
  StructureUsage,
  TimelineEvent,
} from '../types'
import { LinkedText, type TextLinkTarget } from './LinkedText'
import { GalleryPanel } from './GalleryPanel'
import { AttributeIcon, DetailActionsMenu, ObjectPortrait } from './StylePreviewPrimitives'

export function ObjectDetail({
  activeTab = 'main',
  attributeDefinitions,
  attributeGroups: attributeGroupDefinitions,
  dossierTimelineEventId = '',
  galleryImageCaption = '',
  galleryImagePath = null,
  selectedProjectId = null,
  storyObject,
  objectsByType,
  textLinkTargets,
  timelineEvents = [],
  ui,
  onAddGalleryImage,
  onClose,
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
  selectedProjectId?: number | null
  storyObject: StoryObject
  objectsByType: Record<ObjectTypeKey, StoryObject[]>
  textLinkTargets: TextLinkTarget[]
  timelineEvents?: TimelineEvent[]
  ui: PreviewText
  onAddGalleryImage?: () => void
  onClose?: () => void
  onDelete?: () => void
  onDeleteGalleryImage?: (imageId: number) => void
  onEdit?: () => void
  onGalleryCaptionChange?: (caption: string) => void
  onGalleryImageUpload?: (file: File | null) => void
  onDossierTimelineEventIdChange?: (eventId: string) => void
  onOpenTimelineEvent?: (event: TimelineEvent) => void
  onTabChange?: (tab: ObjectDossierTab) => void
}) {
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
  const organizationMembers = getAutomaticOrganizationMembers(storyObject, objectsByType.characters)
  const organizationMemberItems = getOrganizationMemberItems(organizationMembers)
  const characterOrganizations = getAutomaticCharacterOrganizations(storyObject, objectsByType.organizations)
  const surnameLinkTargets = textLinkTargets.filter((target) => target.key.startsWith('organization-surname-'))
  const displaySurname = displayStoryObject.surname?.trim() ?? ''
  const isOrganization = storyObject.typeKey === 'organizations'
  const isCharacter = storyObject.typeKey === 'characters'
  const effectiveActiveTab = activeTab === 'structure' && !isOrganization ? 'main' : activeTab
  const dossierTabs: Array<[ObjectDossierTab, string]> = [
    ['main', ui.main],
    ['relations', ui.relations],
    ...(isOrganization ? ([['structure', ui.structure]] as Array<[ObjectDossierTab, string]>) : []),
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
        <div><span>{ui.objectType}</span><strong>{displayStoryObject.typeKey}</strong></div>
      </div>
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
              <CollapsibleDetailSection count={storyObject.territoryPlaces.length} title={ui.organizationTerritories}>
                {storyObject.territoryPlaces.length === 0 ? (
                  <p>{ui.noOrganizationTerritories}</p>
                ) : (
                  storyObject.territoryPlaces.map((reference) => (
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
                count={[storyObject.ownedItems, storyObject.owners, storyObject.territoryPlaces, storyObject.organizationsOnTerritory, storyObject.ownerOrganizations, storyObject.ownedTerritories].flat().length}
                title={ui.linkedObjects}
              >
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
              </CollapsibleDetailSection>
            </>
          )}
        </>
      )}
      {effectiveActiveTab === 'structure' && isOrganization && (
        <OrganizationStructureView
          selectedProjectId={selectedProjectId}
          storyObject={storyObject}
          ui={ui}
        />
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
          images={storyObject.galleryImages}
          imagePath={galleryImagePath}
          title={ui.gallery}
          ui={ui}
          renderCaption={(caption) => <LinkedText emptyText="-" targets={textLinkTargets} text={caption} />}
          onAddImage={onAddGalleryImage}
          onCaptionChange={onGalleryCaptionChange}
          onDeleteImage={onDeleteGalleryImage}
          onImageUpload={onGalleryImageUpload}
        />
      )}
    </div>
  )
}

function OrganizationStructureView({
  selectedProjectId,
  storyObject,
  ui,
}: {
  selectedProjectId: number | null
  storyObject: StoryObject
  ui: PreviewText
}) {
  const [availableStructures, setAvailableStructures] = useState<StructureSummary[]>([])
  const [selectedStructureId, setSelectedStructureId] = useState('')
  const [structureDetails, setStructureDetails] = useState<Record<number, Structure>>({})
  const [structureUsages, setStructureUsages] = useState<StructureUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStructureData = async () => {
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
      setAvailableStructures(structures)
      setStructureUsages(usages)
      setStructureDetails(Object.fromEntries(detailEntries))
      setSelectedStructureId((currentId) =>
        currentId.trim().length > 0 && structures.some((structure) => String(structure.id) === currentId)
          ? currentId
          : String(structures[0]?.id ?? ''),
      )
    } catch {
      setError(ui.structureAssignFailed)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadStructureData()
  }, [selectedProjectId, storyObject.id])

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
    } catch {
      setError(ui.structureAssignFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const createIndividualStructure = async () => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      const structure = await createStructureRequest(selectedProjectId, {
        name: `${storyObject.name} - ${ui.structure}`,
        description: '',
        ownerKind: 'object',
        ownerId: storyObject.id,
        layoutKind: 'levels',
        nodeBindingMode: 'mixed',
        linkedCatalogId: null,
        nodes: [],
        edges: [],
      })
      await assignStructureRequest(selectedProjectId, structure.id, {
        targetKind: 'object',
        targetId: storyObject.id,
        displayName: '',
        notes: '',
        isPrimary: structureUsages.length === 0,
      })
      await loadStructureData()
    } catch {
      setError(ui.structureCreateFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const makeUsageIndividual = async (usage: StructureUsage) => {
    if (selectedProjectId === null || isSaving) {
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await makeStructureUsageIndividualRequest(selectedProjectId, usage.id)
      await loadStructureData()
    } catch {
      setError(ui.structureMakeIndividualFailed)
    } finally {
      setIsSaving(false)
    }
  }

  const legacyStructure = storyObject.organizationStructureLevels.length > 0

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
            disabled={availableStructures.length === 0 || isSaving}
            value={selectedStructureId}
            onChange={(event) => setSelectedStructureId(event.target.value)}
          >
            {availableStructures.length === 0 ? (
              <option value="">{ui.noStructures}</option>
            ) : (
              availableStructures.map((structure) => (
                <option key={structure.id} value={structure.id}>
                  {structure.name}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="sp-detail-actions">
          <button
            className="sp-button"
            disabled={availableStructures.length === 0 || isSaving}
            type="button"
            onClick={() => void assignExistingStructure()}
          >
            {ui.structureAssignExisting}
          </button>
          <button
            className="sp-button primary"
            disabled={isSaving}
            type="button"
            onClick={() => void createIndividualStructure()}
          >
            {ui.structureCreateIndividual}
          </button>
        </div>
      </div>

      {structureUsages.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noOrganizationStructure}</strong>
          <span>{ui.structureOptionalHint}</span>
        </div>
      ) : (
        <div className="sp-organization-structure-levels">
          {structureUsages.map((usage) => {
            const structure = structureDetails[usage.structureId]
            const levelIndexes =
              structure === undefined
                ? []
                : Array.from(new Set(structure.nodes.map((node) => node.levelIndex))).sort(
                    (left, right) => left - right,
                  )

            return (
              <article className="sp-organization-structure-slot" key={usage.id}>
                <strong>{usage.displayName ?? usage.structureName}</strong>
                <span>{usage.isPrimary ? ui.primary : ui.structureTemplate}</span>
                {usage.notes !== null && usage.notes.trim().length > 0 && <p>{usage.notes}</p>}
                {structure !== undefined && (
                  levelIndexes.length === 0 ? (
                    <p>{ui.noStructureNodes}</p>
                  ) : (
                    <div className="sp-organization-structure-node-preview">
                      {levelIndexes.map((levelIndex) => (
                        <div className="sp-organization-structure-node-level" key={levelIndex}>
                          <span>{ui.structureLevelIndex} {levelIndex + 1}</span>
                          <div>
                            {structure.nodes
                              .filter((node) => node.levelIndex === levelIndex)
                              .map((node) => (
                                <strong key={node.id}>{node.name}</strong>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
                <div className="sp-detail-actions">
                  <button
                    className="sp-button"
                    disabled={isSaving}
                    type="button"
                    onClick={() => void makeUsageIndividual(usage)}
                  >
                    {ui.structureMakeIndividual}
                  </button>
                </div>
              </article>
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
        </details>
      )}
    </section>
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
