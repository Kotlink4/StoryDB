import type { PreviewText } from '../stylePreviewI18n'
import { CoverDropzone } from './ImageInputs'
import { ReadySolutionsPanel } from './ReadySolutionsPanel'
import { PreviewDialog } from './StylePreviewPrimitives'

export type ProjectDialogTab = 'details' | 'presets'

export function ProjectDialog({
  editingProjectId,
  projectCoverImagePath,
  projectDialogTab,
  projectName,
  projectPresetKeys,
  ui,
  onCancel,
  onCoverFileSelected,
  onProjectDialogTabChange,
  onProjectNameChange,
  onProjectPresetKeysChange,
  onSave,
}: {
  editingProjectId: number | null
  projectCoverImagePath: string | null
  projectDialogTab: ProjectDialogTab
  projectName: string
  projectPresetKeys: string[]
  ui: PreviewText
  onCancel: () => void
  onCoverFileSelected: (file: File) => void
  onProjectDialogTabChange: (tab: ProjectDialogTab) => void
  onProjectNameChange: (value: string) => void
  onProjectPresetKeysChange: (selectedKeys: string[]) => void
  onSave: () => void
}) {
  return (
    <PreviewDialog title={editingProjectId === null ? ui.newProject : ui.edit} onClose={onCancel}>
      <div className="sp-catalog-editor">
        <div className="sp-object-editor-tabs">
          <button
            className={projectDialogTab === 'details' ? 'active' : ''}
            type="button"
            onClick={() => onProjectDialogTabChange('details')}
          >
            {ui.projectDetails}
          </button>
          <button
            className={projectDialogTab === 'presets' ? 'active' : ''}
            type="button"
            onClick={() => onProjectDialogTabChange('presets')}
          >
            {ui.readySolutions}
          </button>
        </div>

        {projectDialogTab === 'details' && (
          <div className="sp-form">
            <label className="wide">
              {ui.projectName}
              <input
                value={projectName}
                placeholder={ui.projectNamePlaceholder}
                onChange={(event) => onProjectNameChange(event.target.value)}
              />
            </label>
            <CoverDropzone
              className="wide"
              imagePath={projectCoverImagePath}
              label={ui.image}
              ui={ui}
              onFileSelected={onCoverFileSelected}
            />
          </div>
        )}

        {projectDialogTab === 'presets' && (
          <ReadySolutionsPanel selectedKeys={projectPresetKeys} t={ui} onChange={onProjectPresetKeysChange} />
        )}

        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {editingProjectId === null ? ui.create : ui.save}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
