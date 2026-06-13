import { PreviewDialog } from './StylePreviewPrimitives'

type DeletePreviewDialogProps = {
  title: string
  itemName: string
  hint: string
  cancelLabel: string
  deleteLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function DeletePreviewDialog({
  title,
  itemName,
  hint,
  cancelLabel,
  deleteLabel,
  onCancel,
  onConfirm,
}: DeletePreviewDialogProps) {
  return (
    <PreviewDialog title={title} onClose={onCancel}>
      <div className="sp-note">
        <strong>{itemName}</strong>
        <span>{hint}</span>
      </div>
      <div className="sp-dialog-actions">
        <button className="sp-button" type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className="sp-button danger" type="button" onClick={onConfirm}>
          {deleteLabel}
        </button>
      </div>
    </PreviewDialog>
  )
}
