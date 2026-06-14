import { useCallback, useEffect, useState } from 'react'

import type { PreviewMessageTone } from '../domain/stylePreviewI18n'

export function usePreviewToast() {
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<PreviewMessageTone>('info')

  const showMessage = useCallback((text: string, tone: PreviewMessageTone = 'info') => {
    setMessage(text)
    setMessageTone(tone)
  }, [])

  const showErrorMessage = useCallback((text: string) => showMessage(text, 'error'), [showMessage])
  const dismissMessage = useCallback(() => setMessage(null), [])

  useEffect(() => {
    if (message === null) {
      return undefined
    }

    const timeout = window.setTimeout(() => setMessage(null), messageTone === 'error' ? 3600 : 1200)

    return () => window.clearTimeout(timeout)
  }, [message, messageTone])

  return {
    message,
    messageTone,
    dismissMessage,
    showErrorMessage,
    showMessage,
  }
}
