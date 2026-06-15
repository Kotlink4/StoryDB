import { useEffect, useState } from 'react'

import {
  createStructureRequest,
  deleteStructureRequest,
  fetchStructure,
  fetchStructures,
  updateStructureRequest,
} from '../api'
import type {
  Catalog,
  Structure,
  StructureDraft,
  StructureLayoutKind,
  StructureNodeDraft,
  StructureNodeBindingMode,
  StructureOwnerKind,
  StructureSummary,
  StoryProject,
} from '../types'
import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import { KebabMenu, SectionIcon } from './StylePreviewPrimitives'

const emptyStructureDraft = (projectId: number): StructureDraft => ({
  name: '',
  description: '',
  ownerKind: 'project',
  ownerId: projectId,
  layoutKind: 'levels',
  nodeBindingMode: 'mixed',
  linkedCatalogId: null,
  nodes: [],
  edges: [],
})

const createEmptyStructureNodeDraft = (sortOrder: number): StructureNodeDraft => ({
  clientId: `node-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

const toStructureDraft = (structure: Structure): StructureDraft => ({
  name: structure.name,
  description: structure.description ?? '',
  ownerKind: structure.ownerKind,
  ownerId: structure.ownerId,
  layoutKind: structure.layoutKind,
  nodeBindingMode: structure.nodeBindingMode,
  linkedCatalogId: structure.linkedCatalogId,
  nodes: structure.nodes.map((node) => ({
    clientId: String(node.id),
    parentClientId: node.parentNodeId === null ? null : String(node.parentNodeId),
    linkedCatalogEntryId: node.linkedCatalogEntryId,
    linkedCatalogEntryGroupId: node.linkedCatalogEntryGroupId,
    name: node.name,
    description: node.description ?? '',
    nodeType: node.nodeType ?? '',
    color: node.color ?? '',
    iconKey: node.iconKey ?? '',
    levelIndex: node.levelIndex,
    sortOrder: node.sortOrder,
  })),
  edges: structure.edges.map((edge) => ({
    sourceClientId: String(edge.sourceNodeId),
    targetClientId: String(edge.targetNodeId),
    relationType: edge.relationType,
    description: edge.description ?? '',
    sortOrder: edge.sortOrder,
  })),
})

export function StructuresWorkspace({
  catalogs,
  errorMessage,
  selectedProject,
  ui,
  onError,
  onMessage,
}: {
  catalogs: Catalog[]
  errorMessage: string
  selectedProject: StoryProject
  ui: PreviewText
  onError: (message: string) => void
  onMessage: (message: string) => void
}) {
  const [draft, setDraft] = useState<StructureDraft>(() => emptyStructureDraft(selectedProject.id))
  const [isSaving, setIsSaving] = useState(false)
  const [isDetailSaving, setIsDetailSaving] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [structures, setStructures] = useState<StructureSummary[]>([])
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<StructureDraft | null>(null)

  const loadStructures = async () => {
    setStructures(await fetchStructures(selectedProject.id))
  }

  useEffect(() => {
    setDraft(emptyStructureDraft(selectedProject.id))
    setSelectedStructureId(null)
    setSelectedDraft(null)
    void loadStructures().catch(() => onError(errorMessage))
  }, [selectedProject.id])

  const saveStructure = async () => {
    if (draft.name.trim().length === 0 || isSaving) {
      return
    }

    setIsSaving(true)
    try {
      const createdStructure = await createStructureRequest(selectedProject.id, draft)
      setDraft(emptyStructureDraft(selectedProject.id))
      await loadStructures()
      setSelectedStructureId(createdStructure.id)
      setSelectedDraft(toStructureDraft(createdStructure))
      onMessage(ui.saved)
    } catch {
      onError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteStructure = async (structure: StructureSummary) => {
    try {
      await deleteStructureRequest(selectedProject.id, structure.id)
      if (selectedStructureId === structure.id) {
        setSelectedStructureId(null)
        setSelectedDraft(null)
      }
      await loadStructures()
      onMessage(ui.deleted)
    } catch {
      onError(errorMessage)
    }
  }

  const updateDraft = (patch: Partial<StructureDraft>) => setDraft((currentDraft) => ({ ...currentDraft, ...patch }))

  const openStructure = async (structureId: number) => {
    setSelectedStructureId(structureId)
    setIsDetailLoading(true)
    try {
      const structure = await fetchStructure(selectedProject.id, structureId)
      setSelectedDraft(toStructureDraft(structure))
    } catch {
      onError(errorMessage)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const updateSelectedDraft = (patch: Partial<StructureDraft>) =>
    setSelectedDraft((currentDraft) => (currentDraft === null ? currentDraft : { ...currentDraft, ...patch }))

  const updateSelectedNode = (clientId: string, patch: Partial<StructureNodeDraft>) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            nodes: currentDraft.nodes.map((node) =>
              node.clientId === clientId ? { ...node, ...patch } : node,
            ),
          },
    )

  const addSelectedNode = () =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            nodes: [...currentDraft.nodes, createEmptyStructureNodeDraft(currentDraft.nodes.length)],
          },
    )

  const removeSelectedNode = (clientId: string) =>
    setSelectedDraft((currentDraft) =>
      currentDraft === null
        ? currentDraft
        : {
            ...currentDraft,
            nodes: currentDraft.nodes
              .filter((node) => node.clientId !== clientId)
              .map((node) => ({
                ...node,
                parentClientId: node.parentClientId === clientId ? null : node.parentClientId,
              })),
            edges: currentDraft.edges.filter(
              (edge) => edge.sourceClientId !== clientId && edge.targetClientId !== clientId,
            ),
          },
    )

  const saveSelectedStructure = async () => {
    if (selectedStructureId === null || selectedDraft === null || selectedDraft.name.trim().length === 0) {
      return
    }

    setIsDetailSaving(true)
    try {
      const updatedStructure = await updateStructureRequest(selectedProject.id, selectedStructureId, selectedDraft)
      setSelectedDraft(toStructureDraft(updatedStructure))
      await loadStructures()
      onMessage(ui.saved)
    } catch {
      onError(errorMessage)
    } finally {
      setIsDetailSaving(false)
    }
  }

  return (
    <section className="sp-database-main sp-structures-workspace">
      <div className="sp-workspace-head">
        <div>
          <h2>{ui.structures}</h2>
          <p>{ui.structuresDescription}</p>
        </div>
      </div>

      <div className="sp-structure-editor sp-panel">
        <div className="sp-form">
          <label>
            {ui.name}
            <input
              value={draft.name}
              onChange={(event) => updateDraft({ name: event.target.value })}
            />
          </label>
          <label>
            {ui.description}
            <input
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
            />
          </label>
          <label>
            {ui.structureOwnerKind}
            <select
              value={draft.ownerKind}
              onChange={(event) => {
                const ownerKind = event.target.value as StructureOwnerKind
                updateDraft({
                  ownerKind,
                  ownerId: ownerKind === 'project' ? selectedProject.id : catalogs[0]?.id ?? null,
                })
              }}
            >
              <option value="project">{ui.structureOwnerProject}</option>
              <option value="catalog">{ui.structureOwnerCatalog}</option>
            </select>
          </label>
          <label>
            {ui.structureLayoutKind}
            <select
              value={draft.layoutKind}
              onChange={(event) => updateDraft({ layoutKind: event.target.value as StructureLayoutKind })}
            >
              <option value="levels">{ui.structureLayoutLevels}</option>
              <option value="tree">{ui.structureLayoutTree}</option>
              <option value="graph">{ui.structureLayoutGraph}</option>
            </select>
          </label>
          <label>
            {ui.structureBindingMode}
            <select
              value={draft.nodeBindingMode}
              onChange={(event) => updateDraft({ nodeBindingMode: event.target.value as StructureNodeBindingMode })}
            >
              <option value="none">{ui.structureBindingNone}</option>
              <option value="catalogEntry">{ui.structureBindingCatalogEntry}</option>
              <option value="catalogEntryGroup">{ui.structureBindingCatalogEntryGroup}</option>
              <option value="mixed">{ui.structureBindingMixed}</option>
            </select>
          </label>
          <label>
            {ui.structureLinkedCatalog}
            <select
              value={draft.linkedCatalogId ?? ''}
              onChange={(event) => {
                const catalogId = event.target.value === '' ? null : Number(event.target.value)
                updateDraft({
                  linkedCatalogId: catalogId,
                  ownerId: draft.ownerKind === 'catalog' ? catalogId : draft.ownerId,
                })
              }}
            >
              <option value="">{ui.catalogNoSelection}</option>
              {catalogs.map((catalog) => (
                <option key={catalog.id} value={catalog.id}>
                  {catalog.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="sp-detail-actions">
          <button className="sp-button primary" type="button" disabled={isSaving} onClick={() => void saveStructure()}>
            {isSaving ? ui.saving : ui.create}
          </button>
        </div>
      </div>

      {structures.length === 0 ? (
        <div className="sp-empty compact">
          <strong>{ui.noStructures}</strong>
          <span>{ui.structuresDescription}</span>
        </div>
      ) : (
        <div className="sp-cards sp-structure-list">
          {structures.map((structure) => (
            <article
              className={`sp-card compact${structure.id === selectedStructureId ? ' selected' : ''}`}
              key={structure.id}
            >
              <div className="sp-card-menu">
                <KebabMenu ui={ui} onDelete={() => void deleteStructure(structure)} />
              </div>
              <button className="sp-card-main" type="button" onClick={() => void openStructure(structure.id)}>
                <div className="sp-structure-icon">
                  <SectionIcon name="structures" />
                </div>
                <div className="sp-card-body">
                  <h3>{structure.name}</h3>
                  <p>{structure.description ?? ui.noDescription}</p>
                  <div className="sp-tags">
                    <span>{structure.layoutKind}</span>
                    <span>{ui.structureNodesCount}: {structure.nodeCount}</span>
                    <span>{ui.structureUsageCount}: {structure.usageCount}</span>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}

      <div className="sp-structure-detail-editor sp-panel">
        {selectedDraft === null ? (
          <div className="sp-empty compact">
            <strong>{isDetailLoading ? ui.loading : ui.structureSelectToEdit}</strong>
            <span>{ui.structureEditorHint}</span>
          </div>
        ) : (
          <>
            <div className="sp-workspace-head compact">
              <div>
                <h3>{selectedDraft.name || ui.structure}</h3>
                <p>{ui.structureEditorHint}</p>
              </div>
              <button
                className="sp-button primary"
                type="button"
                disabled={isDetailSaving || selectedDraft.name.trim().length === 0}
                onClick={() => void saveSelectedStructure()}
              >
                {isDetailSaving ? ui.saving : ui.save}
              </button>
            </div>

            <div className="sp-form">
              <label>
                {ui.name}
                <input
                  value={selectedDraft.name}
                  onChange={(event) => updateSelectedDraft({ name: event.target.value })}
                />
              </label>
              <label>
                {ui.description}
                <input
                  value={selectedDraft.description}
                  onChange={(event) => updateSelectedDraft({ description: event.target.value })}
                />
              </label>
              <label>
                {ui.structureOwnerKind}
                <select
                  value={selectedDraft.ownerKind}
                  onChange={(event) => {
                    const ownerKind = event.target.value as StructureOwnerKind
                    updateSelectedDraft({
                      ownerKind,
                      ownerId:
                        ownerKind === 'project'
                          ? selectedProject.id
                          : ownerKind === 'catalog'
                            ? selectedDraft.linkedCatalogId ?? catalogs[0]?.id ?? null
                            : selectedDraft.ownerId,
                    })
                  }}
                >
                  <option value="project">{ui.structureOwnerProject}</option>
                  <option value="catalog">{ui.structureOwnerCatalog}</option>
                  {selectedDraft.ownerKind === 'object' && (
                    <option value="object">{ui.structureOwnerObject}</option>
                  )}
                </select>
              </label>
              <label>
                {ui.structureLayoutKind}
                <select
                  value={selectedDraft.layoutKind}
                  onChange={(event) => updateSelectedDraft({ layoutKind: event.target.value as StructureLayoutKind })}
                >
                  <option value="levels">{ui.structureLayoutLevels}</option>
                  <option value="tree">{ui.structureLayoutTree}</option>
                  <option value="graph">{ui.structureLayoutGraph}</option>
                </select>
              </label>
              <label>
                {ui.structureBindingMode}
                <select
                  value={selectedDraft.nodeBindingMode}
                  onChange={(event) =>
                    updateSelectedDraft({ nodeBindingMode: event.target.value as StructureNodeBindingMode })
                  }
                >
                  <option value="none">{ui.structureBindingNone}</option>
                  <option value="catalogEntry">{ui.structureBindingCatalogEntry}</option>
                  <option value="catalogEntryGroup">{ui.structureBindingCatalogEntryGroup}</option>
                  <option value="mixed">{ui.structureBindingMixed}</option>
                </select>
              </label>
              <label>
                {ui.structureLinkedCatalog}
                <select
                  value={selectedDraft.linkedCatalogId ?? ''}
                  onChange={(event) => {
                    const catalogId = event.target.value === '' ? null : Number(event.target.value)
                    updateSelectedDraft({
                      linkedCatalogId: catalogId,
                      ownerId: selectedDraft.ownerKind === 'catalog' ? catalogId : selectedDraft.ownerId,
                    })
                  }}
                >
                  <option value="">{ui.catalogNoSelection}</option>
                  {catalogs.map((catalog) => (
                    <option key={catalog.id} value={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="sp-structure-nodes">
              <div className="sp-structure-nodes-head">
                <div>
                  <h3>{ui.structureNodes}</h3>
                  <p>{ui.structureNodesHint}</p>
                </div>
                <button className="sp-button" type="button" onClick={addSelectedNode}>
                  {ui.structureAddNode}
                </button>
              </div>

              {selectedDraft.nodes.length === 0 ? (
                <div className="sp-empty compact">
                  <strong>{ui.noStructureNodes}</strong>
                  <span>{ui.structureNodesHint}</span>
                </div>
              ) : (
                <div className="sp-structure-node-list">
                  {selectedDraft.nodes.map((node) => (
                    <article className="sp-structure-node-row" key={node.clientId}>
                      <label>
                        {ui.name}
                        <input
                          value={node.name}
                          onChange={(event) => updateSelectedNode(node.clientId, { name: event.target.value })}
                        />
                      </label>
                      <label>
                        {ui.description}
                        <input
                          value={node.description}
                          onChange={(event) =>
                            updateSelectedNode(node.clientId, { description: event.target.value })
                          }
                        />
                      </label>
                      <label>
                        {ui.structureParentNode}
                        <select
                          value={node.parentClientId ?? ''}
                          onChange={(event) =>
                            updateSelectedNode(node.clientId, {
                              parentClientId: event.target.value === '' ? null : event.target.value,
                            })
                          }
                        >
                          <option value="">{ui.noGroup}</option>
                          {selectedDraft.nodes
                            .filter((parentNode) => parentNode.clientId !== node.clientId)
                            .map((parentNode) => (
                              <option key={parentNode.clientId} value={parentNode.clientId}>
                                {parentNode.name || ui.structureNode}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        {ui.structureNodeType}
                        <input
                          value={node.nodeType}
                          onChange={(event) => updateSelectedNode(node.clientId, { nodeType: event.target.value })}
                        />
                      </label>
                      <label>
                        {ui.structureLevelIndex}
                        <input
                          min="0"
                          type="number"
                          value={node.levelIndex}
                          onChange={(event) =>
                            updateSelectedNode(node.clientId, {
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
                            updateSelectedNode(node.clientId, {
                              sortOrder: Math.max(0, Number(event.target.value) || 0),
                            })
                          }
                        />
                      </label>
                      <div className="sp-structure-node-actions">
                        <button
                          className="sp-button danger"
                          type="button"
                          onClick={() => removeSelectedNode(node.clientId)}
                        >
                          {ui.delete}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
