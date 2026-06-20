export type PreviewTheme = 'light' | 'dark' | 'black'
export type PreviewLanguage = 'ru' | 'en'

export { catalogTemplateLabels } from './i18n/catalogTemplateLabels'
export { attributeIconLabels } from './i18n/attributeIconLabels'
export { previewText } from './i18n/previewText'
export { previewMessages } from './i18n/previewMessages'

import type { previewText } from './i18n/previewText'

export type PreviewText = (typeof previewText)[PreviewLanguage]
export type PreviewMessageTone = 'info' | 'error'
