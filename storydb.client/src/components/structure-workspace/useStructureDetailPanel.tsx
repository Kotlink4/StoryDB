import { useEffect, type ReactNode } from 'react'

import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  StructureAssignment,
  StructureDraft,
  StructureEdgeDraft,
  StructureNodeDraft,
} from '../../types'
import type { StructureWorkspacePage } from './structureDraftUtils'
import { StructureEdgeDossier, StructureNodeDossier } from './StructureDossierPanels'

export function useStructureDetailPanel({
  activePage,
  assignmentsByNodeId,
  detailMode,
  onCloseEdge,
  onCloseNode,
  onDetailPanelChange,
  onOpenEdge,
  selectedDraft,
  selectedEdge,
  selectedNode,
  ui,
}: {
  activePage: StructureWorkspacePage
  assignmentsByNodeId: Map<number, StructureAssignment[]>
  detailMode: 'inline' | 'modal' | 'panel' | 'page'
  onCloseEdge: () => void
  onCloseNode: () => void
  onDetailPanelChange: (panel: ReactNode | null) => void
  onOpenEdge: (edge: StructureEdgeDraft) => void
  selectedDraft: StructureDraft | null
  selectedEdge: StructureEdgeDraft | null
  selectedNode: StructureNodeDraft | null
  ui: PreviewText
}) {
  useEffect(() => {
    if (detailMode !== 'panel' || activePage !== 'schema' || selectedDraft === null) {
      onDetailPanelChange(null)
      return
    }

    if (selectedNode !== null) {
      onDetailPanelChange(
        <StructureNodeDossier
          assignmentsByNodeId={assignmentsByNodeId}
          draft={selectedDraft}
          node={selectedNode}
          showCloseButton
          ui={ui}
          onOpenEdge={onOpenEdge}
          onClose={onCloseNode}
        />,
      )
      return
    }

    if (selectedEdge !== null) {
      onDetailPanelChange(
        <StructureEdgeDossier
          draft={selectedDraft}
          edge={selectedEdge}
          showCloseButton
          ui={ui}
          onClose={onCloseEdge}
        />,
      )
      return
    }

    onDetailPanelChange(null)
  }, [
    activePage,
    assignmentsByNodeId,
    detailMode,
    onCloseEdge,
    onCloseNode,
    onDetailPanelChange,
    onOpenEdge,
    selectedDraft,
    selectedEdge,
    selectedNode,
    ui,
  ])

  useEffect(() => () => onDetailPanelChange(null), [onDetailPanelChange])
}
