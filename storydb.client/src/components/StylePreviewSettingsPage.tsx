import type { PreviewLanguage, PreviewText, PreviewTheme } from '../style-preview/domain/stylePreviewI18n'
import type { DetailMode, GroupDisplayMode } from '../style-preview/domain/stylePreviewUiTypes'

export function SettingsPage({
  detailMode,
  groupDisplayMode,
  previewLanguage,
  previewTheme,
  ui,
  onDetailModeChange,
  onGroupDisplayModeChange,
  onLanguageChange,
  onThemeChange,
}: {
  detailMode: DetailMode
  groupDisplayMode: GroupDisplayMode
  previewLanguage: PreviewLanguage
  previewTheme: PreviewTheme
  ui: PreviewText
  onDetailModeChange: (mode: DetailMode) => void
  onGroupDisplayModeChange: (mode: GroupDisplayMode) => void
  onLanguageChange: (language: PreviewLanguage) => void
  onThemeChange: (theme: PreviewTheme) => void
}) {
  return (
    <section className="sp-settings-page">
      <div className="sp-content-head">
        <div>
          <h2>{ui.settings}</h2>
          <p>{ui.detailDisplay}</p>
        </div>
      </div>
      <div className="sp-settings-grid">
        <label className="sp-setting-card">
          <span>{ui.language}</span>
          <select value={previewLanguage} onChange={(event) => onLanguageChange(event.target.value as PreviewLanguage)}>
            <option value="ru">Русский</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="sp-setting-card">
          <span>{ui.theme}</span>
          <select value={previewTheme} onChange={(event) => onThemeChange(event.target.value as PreviewTheme)}>
            <option value="light">{ui.themeLight}</option>
            <option value="dark">{ui.themeDark}</option>
            <option value="black">{ui.themeBlack}</option>
          </select>
        </label>
        <div className="sp-setting-card wide">
          <span>{ui.detailDisplay}</span>
          <div className="sp-segments">
            {(['modal', 'page', 'panel'] as DetailMode[]).map((mode) => (
              <button
                className={detailMode === mode ? 'active' : ''}
                key={mode}
                type="button"
                onClick={() => onDetailModeChange(mode)}
              >
                {mode === 'modal' ? ui.detailModal : mode === 'page' ? ui.detailPage : ui.detailPanel}
              </button>
            ))}
          </div>
        </div>
        <div className="sp-setting-card wide">
          <span>{ui.groupDisplay}</span>
          <div className="sp-segments">
            {(['blocks', 'subtabs'] as GroupDisplayMode[]).map((mode) => (
              <button
                className={groupDisplayMode === mode ? 'active' : ''}
                key={mode}
                type="button"
                onClick={() => onGroupDisplayModeChange(mode)}
              >
                {mode === 'blocks' ? ui.groupBlocks : ui.groupSubtabs}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
