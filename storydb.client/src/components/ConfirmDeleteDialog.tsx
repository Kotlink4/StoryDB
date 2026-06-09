import { Trash2 } from 'lucide-react'
import type { PendingDelete } from '../types'

type ConfirmDeleteDialogProps = {
  pendingDelete: PendingDelete
  t: Record<string, string>
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeleteDialog({
  pendingDelete,
  t,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  if (pendingDelete === null) {
    return null
  }

  const titleByKind = {
    project: t.deleteProjectTitle,
    object: t.deleteObjectTitle,
    catalog: t.deleteCatalogTitle,
    catalogEntryGroup: t.deleteCatalogGroupTitle,
    catalogEntry: t.deleteCatalogEntryTitle,
  }
  const messageByKind = {
    project: t.deleteProjectConfirm,
    object: t.deleteObjectConfirm,
    catalog: t.deleteCatalogConfirm,
    catalogEntryGroup: t.deleteCatalogGroupConfirm,
    catalogEntry: t.deleteCatalogEntryConfirm,
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="modal-panel confirm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="panel-kicker">{t.delete}</p>
            <h2 id="confirm-title">{titleByKind[pendingDelete.kind]}</h2>
          </div>
        </header>
        <p className="confirm-message" id="confirm-description">
          {messageByKind[pendingDelete.kind]}
        </p>
        <div className="confirm-actions">
          <button className="secondary-action compact" type="button" onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="danger-action compact" type="button" onClick={onConfirm}>
            <Trash2 size={17} strokeWidth={2.2} />
            {t.confirmDelete}
          </button>
        </div>
      </section>
    </div>
  )
}
