import type { PreviewText } from '../stylePreviewI18n'
import { PreviewDialog } from './StylePreviewPrimitives'

type AuthDialogProps = {
  displayName: string
  email: string
  mode: 'login' | 'register'
  password: string
  ui: PreviewText
  onCancel: () => void
  onDisplayNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onModeChange: (mode: 'login' | 'register') => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
}

export function AuthDialog({
  displayName,
  email,
  mode,
  password,
  ui,
  onCancel,
  onDisplayNameChange,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
}: AuthDialogProps) {
  return (
    <PreviewDialog title={mode === 'login' ? ui.login : ui.register} onClose={onCancel}>
      <div className="sp-form">
        <label>
          Email
          <input value={email} onChange={(event) => onEmailChange(event.target.value)} />
        </label>
        <label>
          {ui.password}
          <input type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} />
        </label>
        {mode === 'register' && (
          <label>
            {ui.displayName}
            <input value={displayName} onChange={(event) => onDisplayNameChange(event.target.value)} />
          </label>
        )}
        <div className="sp-dialog-actions">
          <button className="sp-button" type="button" onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? ui.createAccount : ui.login}
          </button>
          <button className="sp-button primary" type="button" onClick={onSubmit}>
            {ui.continue}
          </button>
        </div>
      </div>
    </PreviewDialog>
  )
}
