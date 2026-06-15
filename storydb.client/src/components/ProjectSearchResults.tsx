import type { PreviewText } from '../style-preview/domain/stylePreviewI18n'

export type ProjectSearchResultKind =
  | 'attribute'
  | 'catalog'
  | 'catalogEntry'
  | 'object'
  | 'relation'
  | 'structure'
  | 'timelineEvent'

export type ProjectSearchResult = {
  id: string
  kind: ProjectSearchResultKind
  sectionLabel: string
  title: string
  subtitle: string
  snippet: string
  onOpen: () => void
}

export type ProjectSearchResultGroup = {
  key: string
  label: string
  results: ProjectSearchResult[]
}

export function ProjectSearchResults({
  groups,
  query,
  totalCount,
  ui,
}: {
  groups: ProjectSearchResultGroup[]
  query: string
  totalCount: number
  ui: PreviewText
}) {
  return (
    <div className="sp-search-results-page">
      <div className="sp-content-head">
        <div>
          <h2>{ui.searchResults}</h2>
          <p>
            {totalCount} {ui.searchResultsCount}: {query}
          </p>
        </div>
      </div>
      {totalCount === 0 ? (
        <div className="sp-empty">
          <strong>{ui.noSearchResults}</strong>
          <span>{ui.noSearchResultsHint}</span>
        </div>
      ) : (
        <div className="sp-search-result-groups">
          {groups.map((group) => (
            <section className="sp-search-result-group" key={group.key}>
              <div className="sp-search-result-group-head">
                <h3>{group.label}</h3>
                <span>{group.results.length}</span>
              </div>
              <div className="sp-search-result-list">
                {group.results.map((result) => (
                  <button className="sp-search-result-card" key={result.id} type="button" onClick={result.onOpen}>
                    <span>{result.sectionLabel}</span>
                    <strong>{result.title}</strong>
                    <em>{result.subtitle}</em>
                    {result.snippet.length > 0 && <p>{result.snippet}</p>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
