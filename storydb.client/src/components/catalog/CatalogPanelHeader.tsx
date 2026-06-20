import { Check, Pencil, Trash2 } from 'lucide-react'
import type { KeyboardEvent } from 'react'

import type {
  Catalog,
  CatalogPanelPage,
  InlineNameEdit,
} from '../../types'

export function CatalogPanelHeader({
  activeCatalog,
  nameDraft,
  nameEdit,
  page,
  pageKicker,
  pageTitle,
  t,
  onBackToCatalog,
  onCancelNameEdit,
  onDeleteCatalog,
  onNameDraftChange,
  onSaveNameEdit,
  onStartNameEdit,
}: {
  activeCatalog: Catalog | null
  nameDraft: string
  nameEdit: InlineNameEdit
  page: CatalogPanelPage
  pageKicker: string
  pageTitle: string
  t: Record<string, string>
  onBackToCatalog: () => void
  onCancelNameEdit: () => void
  onDeleteCatalog: (catalog: Catalog) => void
  onNameDraftChange: (value: string) => void
  onSaveNameEdit: () => void
  onStartNameEdit: (edit: Exclude<InlineNameEdit, null>, currentName: string) => void
}) {
  const saveOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      onSaveNameEdit()
    }
    if (event.key === 'Escape') {
      onCancelNameEdit()
    }
  }

  const isEditingCatalogName =
    page === 'catalog' &&
    activeCatalog !== null &&
    nameEdit?.kind === 'catalog' &&
    nameEdit.id === activeCatalog.id

  return (
    <header className="hierarchy-panel-header">
      <div>
        <p className="panel-kicker">{pageKicker}</p>
        {isEditingCatalogName ? (
          <div className="inline-title-edit">
            <input
              autoFocus
              value={nameDraft}
              onChange={(event) => onNameDraftChange(event.target.value)}
              onKeyDown={saveOnEnter}
            />
            <button
              aria-label={t.save}
              className="icon-action"
              title={t.save}
              type="button"
              onClick={onSaveNameEdit}
            >
              <Check aria-hidden="true" size={18} />
            </button>
          </div>
        ) : (
          <div className="inline-title-row">
            <h2>{pageTitle}</h2>
            {page === 'catalog' && activeCatalog !== null && (
              <div className="table-actions">
                <button
                  aria-label={`${t.edit}: ${activeCatalog.name}`}
                  type="button"
                  onClick={() => onStartNameEdit({ kind: 'catalog', id: activeCatalog.id }, activeCatalog.name)}
                >
                  <Pencil aria-hidden="true" size={16} />
                </button>
                <button
                  aria-label={`${t.delete}: ${activeCatalog.name}`}
                  type="button"
                  onClick={() => onDeleteCatalog(activeCatalog)}
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
              </div>
            )}
            {page !== 'catalog' && (
              <div className="table-actions">
                <button type="button" onClick={onBackToCatalog}>
                  {t.back}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
