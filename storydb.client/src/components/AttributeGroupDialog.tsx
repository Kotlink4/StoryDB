import type { PreviewLanguage, PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { ValidationIssueMap } from '../validation'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { AttributeIconPicker, PreviewDialog } from './StylePreviewPrimitives'

type AttributeGroupDialogProps = {
  title: string
  groupName: string
  iconKey: string
  language: PreviewLanguage
  validationErrors?: ValidationIssueMap
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
  language,
  validationErrors,
  ui,
  onCancel,
  onIconKeyChange,
  onNameChange,
  onSave,
}: AttributeGroupDialogProps) {
  const formRef = useFirstInvalidFieldFocus(validationErrors)

  return (
    <PreviewDialog title={title} onClose={onCancel}>
      <div className="sp-form" ref={formRef}>
        <label className="wide">
          {ui.groupName}
          <input
            value={groupName}
            onChange={(event) => onNameChange(event.target.value)}
            {...getFieldValidationProps('name', validationErrors, 'attribute-group-dialog-name-error')}
          />
          <FieldError id="attribute-group-dialog-name-error" message={validationErrors?.name} />
        </label>
        <label className="wide">
          {ui.icon}
          <AttributeIconPicker language={language} value={iconKey} onChange={onIconKeyChange} />
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
