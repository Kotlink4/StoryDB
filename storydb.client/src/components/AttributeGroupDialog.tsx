import type { PreviewText } from '../stylePreviewI18n'
import { AttributeIconPicker, PreviewDialog } from './StylePreviewPrimitives'

type AttributeGroupDialogProps = {
  title: string
  groupName: string
  iconKey: string
  ui: PreviewText
  onCancel: () => void
  onIconKeyChange: (iconKey: string) => void
  onNameChange: (name: string) => void
  onSave: () => void
}

export function AttributeGroupDialog({
  title,
  groupName,
  iconKey,
  ui,
  onCancel,
  onIconKeyChange,
  onNameChange,
  onSave,
}: AttributeGroupDialogProps) {
  return (
    <PreviewDialog title={title} onClose={onCancel}>
      <div className="sp-form">
        <label className="wide">
          {ui.groupName}
          <input value={groupName} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label className="wide">
          {ui.icon}
          <AttributeIconPicker value={iconKey} onChange={onIconKeyChange} />
        </label>
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={onCancel}>
            {ui.cancel}
          </button>
          <button className="sp-button primary" type="button" onClick={onSave}>
            {ui.save}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
