import type { ValidationIssueMap } from '../validation'

export type FieldValidationProps = {
  validationErrors?: ValidationIssueMap
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <span className="sp-field-error" id={id} role="alert">
      {message}
    </span>
  ) : null
}
