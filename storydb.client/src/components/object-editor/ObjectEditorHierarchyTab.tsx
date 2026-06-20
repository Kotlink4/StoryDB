import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  DraftHierarchySelection,
  HierarchyGroup,
  HierarchyNode,
} from '../../types'

type ObjectEditorHierarchyTabProps = {
  draftHierarchySelections: DraftHierarchySelection[]
  hierarchyGroups: HierarchyGroup[]
  hierarchyNodesByGroupId: Record<number, HierarchyNode[]>
  ui: PreviewText
  onDraftHierarchySelectionsChange: (selections: DraftHierarchySelection[]) => void
  toggleNumberSelection: (values: number[], value: number) => number[]
}

export function ObjectEditorHierarchyTab({
  draftHierarchySelections,
  hierarchyGroups,
  hierarchyNodesByGroupId,
  ui,
  onDraftHierarchySelectionsChange,
  toggleNumberSelection,
}: ObjectEditorHierarchyTabProps) {
  const addHierarchySelection = () =>
    onDraftHierarchySelectionsChange([...draftHierarchySelections, { groupId: 0, nodeIds: [] }])

  return (
    <div className="sp-editor-stack">
      <button className="sp-button" type="button" onClick={addHierarchySelection}>
        {ui.addHierarchyGroup}
      </button>
      {draftHierarchySelections.map((selection, index) => (
        <div className="sp-editor-block" key={index}>
          <select
            value={selection.groupId}
            onChange={(event) =>
              onDraftHierarchySelectionsChange(
                draftHierarchySelections.map((item, itemIndex) =>
                  itemIndex === index ? { groupId: Number(event.target.value), nodeIds: [] } : item,
                ),
              )
            }
          >
            <option value={0}>{ui.chooseGroup}</option>
            {hierarchyGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <div className="sp-checkbox-grid">
            {(hierarchyNodesByGroupId[selection.groupId] ?? []).map((node) => (
              <label key={node.id}>
                <input
                  type="checkbox"
                  checked={selection.nodeIds.includes(node.id)}
                  onChange={() =>
                    onDraftHierarchySelectionsChange(
                      draftHierarchySelections.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, nodeIds: toggleNumberSelection(item.nodeIds, node.id) }
                          : item,
                      ),
                    )
                  }
                />
                {node.name}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onDraftHierarchySelectionsChange(draftHierarchySelections.filter((_, itemIndex) => itemIndex !== index))
            }
          >
            {ui.removeGroup}
          </button>
        </div>
      ))}
    </div>
  )
}
