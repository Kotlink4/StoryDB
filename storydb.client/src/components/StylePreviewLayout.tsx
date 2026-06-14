import type { ComponentProps, ReactNode } from 'react'

import type { PreviewLanguage, PreviewTheme } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewTab } from '../style-preview/domain/stylePreviewRouting'
import { StylePreviewDetailPanels } from './StylePreviewDetailPanels'
import {
  StylePreviewProjectbar,
  StylePreviewSidebar,
  StylePreviewTopbar,
} from './StylePreviewShell'

export function StylePreviewLayout({
  activeTab,
  children,
  content,
  detailPanelsProps,
  hasDetailPanel,
  isLoading,
  isUtilityPage,
  loadingLabel,
  previewLanguage,
  previewTheme,
  projectbarProps,
  showSidebar,
  sidebarProps,
  toastMessage,
  toastTone,
  topbarProps,
  onDismissToast,
}: {
  activeTab: PreviewTab
  children: ReactNode
  content: ReactNode
  detailPanelsProps: ComponentProps<typeof StylePreviewDetailPanels>
  hasDetailPanel: boolean
  isLoading: boolean
  isUtilityPage: boolean
  loadingLabel: string
  previewLanguage: PreviewLanguage
  previewTheme: PreviewTheme
  projectbarProps: ComponentProps<typeof StylePreviewProjectbar>
  showSidebar: boolean
  sidebarProps: ComponentProps<typeof StylePreviewSidebar>
  toastMessage: string | null
  toastTone: string
  topbarProps: ComponentProps<typeof StylePreviewTopbar>
  onDismissToast: () => void
}) {
  return (
    <main
      className={`style-preview theme-${previewTheme} tab-${activeTab}`}
      lang={previewLanguage}
    >
      <div className="sp-shell">
        <StylePreviewTopbar {...topbarProps} />

        <StylePreviewProjectbar {...projectbarProps} />

        <div
          className={`sp-workspace ${isUtilityPage ? 'utility-page' : ''} ${
            !isUtilityPage && activeTab === 'timeline' ? 'no-sidebar' : ''
          } ${hasDetailPanel ? 'with-detail' : ''}`}
        >
          {showSidebar && <StylePreviewSidebar {...sidebarProps} />}

          <section
            className={`sp-content${activeTab === 'timeline' ? ' timeline-content' : ''}${activeTab === 'relations' ? ' relations-content' : ''}`}
          >
            {isLoading ? <div className="sp-empty">{loadingLabel}</div> : content}
          </section>

          <StylePreviewDetailPanels {...detailPanelsProps} />
        </div>
      </div>

      {toastMessage !== null && (
        <button className={`sp-toast ${toastTone}`} type="button" onClick={onDismissToast}>
          {toastMessage}
        </button>
      )}

      {children}
    </main>
  )
}
