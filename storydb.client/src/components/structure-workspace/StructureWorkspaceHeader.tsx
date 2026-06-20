import { ArrowLeft } from 'lucide-react'

import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { StructureWorkspacePage } from './structureDraftUtils'
import type { StructureWorkspacePageItem } from './structureWorkspaceModel'

export type StructureWorkspaceHeaderProps = {
  activePage: StructureWorkspacePage
  isSelectedStructurePage: boolean
  selectedPages: StructureWorkspacePageItem[]
  ui: PreviewText
  onCreate: () => void
  onPageChange: (page: StructureWorkspacePage) => void
}

export function StructureWorkspaceHeader({
  activePage,
  isSelectedStructurePage,
  selectedPages,
  ui,
  onCreate,
  onPageChange,
}: StructureWorkspaceHeaderProps) {
  return (
    <>
      <div className="sp-workspace-head">
        <div>
          <h2>{ui.structures}</h2>
        </div>
        {activePage === 'overview' && (
          <button className="sp-button primary" type="button" onClick={onCreate}>
            {ui.create}
          </button>
        )}
        {activePage === 'create' && (
          <button className="sp-button" type="button" onClick={() => onPageChange('overview')}>
            {ui.back}
          </button>
        )}
        {isSelectedStructurePage && (
          <button
            className="sp-icon-button sp-page-back-button"
            type="button"
            aria-label={ui.back}
            title={ui.back}
            onClick={() => onPageChange('overview')}
          >
            <ArrowLeft aria-hidden="true" size={18} />
          </button>
        )}
      </div>

      {isSelectedStructurePage && (
        <div className="sp-tabs sp-structure-task-tabs" role="tablist" aria-label={ui.structures}>
          {selectedPages.map((page) => (
            <button
              className={activePage === page.key ? 'active' : ''}
              key={page.key}
              type="button"
              onClick={() => onPageChange(page.key)}
            >
              {page.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
