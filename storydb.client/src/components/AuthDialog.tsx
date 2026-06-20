import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ValidationIssueMap } from '../validation'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { PreviewDialog } from './StylePreviewPrimitives'

type AuthDialogProps = {
  displayName: string
  email: string
  mode: 'login' | 'register'
  password: string
  validationErrors?: ValidationIssueMap
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
  validationErrors,
  ui,
  onCancel,
  onDisplayNameChange,
  onEmailChange,
  onModeChange,
  onPasswordChange,
  onSubmit,
}: AuthDialogProps) {
  const formRef = useFirstInvalidFieldFocus(validationErrors)

  return (
    <PreviewDialog title={mode === 'login' ? ui.login : ui.register} onClose={onCancel}>
      <div className="sp-form" ref={formRef}>
        <label>
          Email
          <input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            {...getFieldValidationProps('email', validationErrors, 'auth-email-error')}
          />
          <FieldError id="auth-email-error" message={validationErrors?.email} />
        </label>
        <label>
          {ui.password}
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            {...getFieldValidationProps('password', validationErrors, 'auth-password-error')}
          />
          <FieldError id="auth-password-error" message={validationErrors?.password} />
        </label>
        {mode === 'register' && (
          <label>
            {ui.displayName}
            <input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              {...getFieldValidationProps('displayName', validationErrors, 'auth-display-name-error')}
            />
            <FieldError id="auth-display-name-error" message={validationErrors?.displayName} />
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
