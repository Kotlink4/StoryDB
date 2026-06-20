import { useEffect, useRef } from 'react'

import type { ValidationIssueMap } from '../validation'

export const getFieldValidationProps = (
  field: string,
  errors: ValidationIssueMap | undefined,
  errorId: string,
) => {
  const hasError = Boolean(errors?.[field])
  return {
    'aria-describedby': hasError ? errorId : undefined,
    'aria-invalid': hasError ? true : undefined,
    'data-validation-field': field,
  }
}

export function useFirstInvalidFieldFocus<TElement extends HTMLElement = HTMLDivElement>(
  errors: ValidationIssueMap | undefined,
) {
  const formRef = useRef<TElement>(null)
  const errorKey = Object.keys(errors ?? {}).join('|')

  useEffect(() => {
    const firstInvalidField = Object.keys(errors ?? {})[0]
    if (!firstInvalidField) {
      return
    }

    window.requestAnimationFrame(() => {
      const field = formRef.current?.querySelector<HTMLElement>(
        `[data-validation-field="${firstInvalidField}"]`,
      )
      field?.focus()
      field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }, [errorKey, errors])

  return formRef
}
