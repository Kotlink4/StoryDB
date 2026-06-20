import type { PreviewLanguage, PreviewTheme } from './stylePreviewI18n'
import type { PreviewSection, PreviewTab } from './stylePreviewRouting'
import type { DetailMode, GroupDisplayMode } from './stylePreviewUiTypes'

export type PreviewPersistedState = Partial<{
  activeSection: PreviewSection
  activeTab: PreviewTab
  detailMode: DetailMode
  groupDisplayMode: GroupDisplayMode
  isObjectPageOpen: boolean
  previewLanguage: PreviewLanguage
  previewTheme: PreviewTheme
  selectedObjectId: number | null
  selectedProjectId: number | null
}>

const previewStorageKey = 'storydb.stylePreview'

export const readPreviewState = (): PreviewPersistedState => {
  try {
    const rawValue = localStorage.getItem(previewStorageKey)

    return rawValue === null ? {} : (JSON.parse(rawValue) as PreviewPersistedState)
  } catch {
    return {}
  }
}

export const savePreviewState = (state: PreviewPersistedState) => {
  try {
    const currentState = readPreviewState()
    localStorage.setItem(previewStorageKey, JSON.stringify({ ...currentState, ...state }))
  } catch {
    // localStorage can be unavailable in private contexts; the preview still works without persistence.
  }
}
