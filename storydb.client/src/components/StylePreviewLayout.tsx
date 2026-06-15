import type { ComponentProps, ReactNode } from 'react'

import type { PreviewLanguage, PreviewTheme } from '../style-preview/domain/stylePreviewI18n'
import type { PreviewTab } from '../style-preview/domain/stylePreviewRouting'
import { StylePreviewDetailPanels } from './StylePreviewDetailPanels'
import {
  StylePreviewProjectbar,
  StylePreviewSidebar,
  StylePreviewTopbar,
} from './StylePreviewShell'

const clientBuildRevision = 'profile-loading-guard-2026-06-15'

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
  const visualTabClass = isUtilityPage ? 'utility' : activeTab
  const contentModeClass = !isUtilityPage && activeTab === 'timeline'
    ? ' timeline-content'
    : !isUtilityPage && activeTab === 'relations'
      ? ' relations-content'
      : ''

  return (
    <main
      className={`style-preview theme-${previewTheme} tab-${visualTabClass}${isUtilityPage ? ' is-utility-page' : ''}`}
      data-build-revision={clientBuildRevision}
      lang={previewLanguage}
    >
      <div className="sp-shell">
        <StylePreviewTopbar {...topbarProps} activeTab={isUtilityPage ? null : topbarProps.activeTab} />

        <StylePreviewProjectbar {...projectbarProps} />

        <div
          className={`sp-workspace ${isUtilityPage ? 'utility-page' : ''} ${
            !isUtilityPage && activeTab === 'timeline' ? 'no-sidebar' : ''
          } ${hasDetailPanel ? 'with-detail' : ''}`}
        >
          {showSidebar && <StylePreviewSidebar {...sidebarProps} />}

          <section className={`sp-content${contentModeClass}`}>
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
