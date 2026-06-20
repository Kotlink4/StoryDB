export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const assetBaseUrl = import.meta.env.VITE_ASSET_BASE_URL ?? ''

export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) =>
  globalThis.fetch(input, {
    ...init,
    credentials: 'include',
  })

export class ApiRequestError extends Error {
  status: number
  traceId: string | null

  constructor(message: string, status: number, traceId: string | null = null) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.traceId = traceId
  }
}

export const getApiErrorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiRequestError && error.message.trim().length > 0 ? error.message : fallback

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getTextValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const getProblemErrorsMessage = (errors: unknown) => {
  if (!isRecord(errors)) {
    return ''
  }

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const message = value.map(getTextValue).find((item) => item.length > 0)
      if (message) {
        return message
      }
    }

    const message = getTextValue(value)
    if (message.length > 0) {
      return message
    }
  }

  return ''
}

const readErrorPayload = async (response: Response) => {
  const body = await response.text()
  if (body.trim().length === 0) {
    return { message: '', traceId: null }
  }

  try {
    const payload: unknown = JSON.parse(body)
    if (typeof payload === 'string') {
      return { message: payload.trim(), traceId: null }
    }

    if (!isRecord(payload)) {
      return { message: '', traceId: null }
    }

    const errorsMessage = getProblemErrorsMessage(payload.errors)
    const detail = getTextValue(payload.detail)
    const title = getTextValue(payload.title)
    const extensions = isRecord(payload.extensions) ? payload.extensions : null
    const traceId = getTextValue(payload.traceId) || getTextValue(extensions?.traceId) || null

    return {
      message: errorsMessage || detail || title,
      traceId,
    }
  } catch {
    return { message: body.trim(), traceId: null }
  }
}

export const ensureOk = async (response: Response, message: string) => {
  if (!response.ok) {
    const error = await readErrorPayload(response)
    throw new ApiRequestError(error.message || message, response.status, error.traceId)
  }
}
