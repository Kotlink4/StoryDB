import type { PreviewText } from '../stylePreviewI18n'
import type { AuthUser } from '../types'
import { PreviewDialog } from './StylePreviewPrimitives'

type ProfileSummaryDialogProps = {
  currentUser: AuthUser | null
  ui: PreviewText
  onCancel: () => void
  onLogout: () => void
}

export function ProfileSummaryDialog({
  currentUser,
  ui,
  onCancel,
  onLogout,
}: ProfileSummaryDialogProps) {
  return (
    <PreviewDialog title={ui.profile} onClose={onCancel}>
      <div className="sp-note">
        <strong>{currentUser?.displayName ?? ui.guest}</strong>
        <span>{currentUser?.email ?? ui.notSignedIn}</span>
      </div>
      {currentUser !== null && (
        <button className="sp-button" type="button" onClick={onLogout}>
          {ui.logout}
        </button>
      )}
    </PreviewDialog>
  )
}
