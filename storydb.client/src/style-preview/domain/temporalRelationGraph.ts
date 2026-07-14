import type {
  ObjectTypeKey,
  RelationGraph,
  RelationGraphEdge,
  StoryObject,
  StructureAssignment,
  StructureUsage,
  TimelineEvent,
} from '../../types'
import {
  getSnapshotArray,
  getTimelineContextChangesForTarget,
  isStructureAssignmentSnapshot,
  normalizeStructureAssignmentSnapshot,
  resolveStructureAssignmentsTemporalState,
  type TemporalResolverContext,
} from './temporalState'
import { getOrganizationSurname } from './objectDisplay'

const getObjectEdgeKey = (edge: Pick<RelationGraphEdge, 'category' | 'sourceId' | 'targetId' | 'relationType'>) =>
  `${edge.category}:${edge.sourceId}:${edge.targetId}:${edge.relationType}`

export function resolveRelationGraphTemporalState(
  graph: RelationGraph,
  objectsByType: Record<ObjectTypeKey, StoryObject[]>,
  structureAssignments: StructureAssignment[] = [],
  structureUsages: StructureUsage[] = [],
  timelineEvents: TimelineEvent[] = [],
  contextEventId = '',
  context: TemporalResolverContext = {},
): RelationGraph {
  const resolvedObjects = Object.values(objectsByType).flat()
  const objectById = new Map(resolvedObjects.map((storyObject) => [storyObject.id, storyObject]))
  const nodes = resolvedObjects.map((storyObject) => ({
    id: storyObject.id,
    imagePath: storyObject.imagePath,
    name: storyObject.name,
    surname: storyObject.surname,
    surnameForm: storyObject.surnameForm,
    typeKey: storyObject.typeKey as ObjectTypeKey,
  }))
  const edges: RelationGraphEdge[] = []
  const pushEdge = (edge: RelationGraphEdge) => {
    if (!objectById.has(edge.sourceId) || !objectById.has(edge.targetId)) {
      return
    }

    if (edges.some((currentEdge) => getObjectEdgeKey(currentEdge) === getObjectEdgeKey(edge))) {
      return
    }

    edges.push(edge)
  }

  graph.edges.forEach(pushEdge)

  const organizations = objectsByType.organizations
  objectsByType.characters.forEach((character) => {
    const surname = character.surname?.trim()

    if (!surname) {
      return
    }

    organizations
      .filter((organization) => getOrganizationSurname(organization).toLocaleLowerCase() === surname.toLocaleLowerCase())
      .forEach((organization) => {
        pushEdge({
          id: `temporal-membership:${character.id}:${organization.id}`,
          sourceId: character.id,
          targetId: organization.id,
          relationType: 'organizationMembership',
          category: 'membership',
          strength: null,
          tension: null,
          isBidirectional: false,
          description: null,
        })
      })

    character.outgoingCharacterRelationships.forEach((relationship) => {
      pushEdge({
        id: `temporal-character:${character.id}:${relationship.character.id}:${relationship.relationType}`,
        sourceId: character.id,
        targetId: relationship.character.id,
        relationType: relationship.relationType,
        category: 'character',
        strength: relationship.strength,
        tension: relationship.tension,
        isBidirectional: relationship.isBidirectional,
        description: relationship.description,
      })
    })

    character.incomingCharacterRelationships.forEach((relationship) => {
      pushEdge({
        id: `temporal-character:${relationship.character.id}:${character.id}:${relationship.relationType}`,
        sourceId: relationship.character.id,
        targetId: character.id,
        relationType: relationship.relationType,
        category: 'character',
        strength: relationship.strength,
        tension: relationship.tension,
        isBidirectional: relationship.isBidirectional,
        description: relationship.description,
      })
    })

    character.ownedItems.forEach((item) => {
      pushEdge({
        id: `temporal-ownership:${character.id}:${item.id}`,
        sourceId: character.id,
        targetId: item.id,
        relationType: 'владеет',
        category: 'ownership',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })
  })

  objectsByType.items.forEach((item) => {
    item.owners.forEach((owner) => {
      pushEdge({
        id: `temporal-ownership:${owner.id}:${item.id}`,
        sourceId: owner.id,
        targetId: item.id,
        relationType: 'владеет',
        category: 'ownership',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })
  })

  resolvedObjects.forEach((storyObject) => {
    storyObject.territoryPlaces.forEach((place) => {
      pushEdge({
        id: `temporal-object:locatedOnTerritory:${storyObject.id}:${place.id}`,
        sourceId: storyObject.id,
        targetId: place.id,
        relationType: 'locatedOnTerritory',
        category: 'object',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })

    storyObject.ownerOrganizations.forEach((organization) => {
      pushEdge({
        id: `temporal-object:territoryOwner:${storyObject.id}:${organization.id}`,
        sourceId: storyObject.id,
        targetId: organization.id,
        relationType: 'territoryOwner',
        category: 'object',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })

    storyObject.hierarchyParents.forEach((parent) => {
      pushEdge({
        id: `temporal-object:hierarchyParent:${storyObject.id}:${parent.id}`,
        sourceId: storyObject.id,
        targetId: parent.id,
        relationType: 'hierarchyParent',
        category: 'object',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: null,
      })
    })
  })

  if (structureAssignments.length > 0) {
    const structureUsageById = new Map(structureUsages.map((usage) => [usage.id, usage]))
    const temporalStructureAssignments = resolveStructureAssignmentsTemporalState(
      structureAssignments,
      timelineEvents,
      contextEventId,
      {
        ...context,
        objectsByType,
      },
    )
    const snapshotAssignmentsByObjectId = new Map<number, StructureAssignment[]>()

    resolvedObjects.forEach((storyObject) => {
      const storyObjectChanges = getTimelineContextChangesForTarget(
        timelineEvents,
        contextEventId,
        'storyObject',
        storyObject.id,
      )
      const snapshotAssignments = getSnapshotArray(
        storyObjectChanges,
        'structureAssignment',
        'structureAssignments',
        isStructureAssignmentSnapshot,
      )

      if (snapshotAssignments === null) {
        return
      }

      snapshotAssignmentsByObjectId.set(
        storyObject.id,
        resolveStructureAssignmentsTemporalState(
          snapshotAssignments.map(normalizeStructureAssignmentSnapshot),
          timelineEvents,
          contextEventId,
          {
            ...context,
            objectsByType,
            storyObjectId: storyObject.id,
          },
        ),
      )
    })
    const effectiveStructureAssignments = [
      ...temporalStructureAssignments.filter(
        (assignment) =>
          assignment.targetKind === 'storyObject' &&
          assignment.storyObjectId !== null &&
          !snapshotAssignmentsByObjectId.has(assignment.storyObjectId),
      ),
      ...Array.from(snapshotAssignmentsByObjectId.values()).flat(),
    ]

    effectiveStructureAssignments.forEach((assignment) => {
      const usage = structureUsageById.get(assignment.structureUsageId)

      if (usage?.targetKind !== 'object' || assignment.targetKind !== 'storyObject' || assignment.storyObjectId === null) {
        return
      }

      pushEdge({
        id: `temporal-structure:${assignment.id}:${assignment.storyObjectId}:${usage.targetId}`,
        sourceId: assignment.storyObjectId,
        targetId: usage.targetId,
        relationType: assignment.roleLabel?.trim() || assignment.structureNodeName,
        category: 'structure',
        strength: null,
        tension: null,
        isBidirectional: false,
        description: assignment.notes,
      })
    })
  } else {
    graph.edges
      .filter((edge) => edge.category === 'structure')
      .forEach((edge) => {
        const source = objectById.get(edge.sourceId)
        const target = objectById.get(edge.targetId)

        if (source !== undefined && target !== undefined) {
          pushEdge(edge)
        }
      })
  }

  return {
    nodes,
    edges,
  }
}
