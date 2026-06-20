import { Check, Pencil, Trash2 } from 'lucide-react'
import type { KeyboardEvent } from 'react'

import { formatCatalogGroupTreeLabel } from '../../domain/catalogGroupTree'
import type {
  Catalog,
  CatalogEntryGroup,
  InlineNameEdit,
} from '../../types'

type CatalogGroupTreeItem = {
  depth: number
  group: CatalogEntryGroup
}

export function CatalogGroupEditor({
  activeCatalog,
  activeCatalogEntryGroup,
  catalogGroupTree,
  nameDraft,
  nameEdit,
  t,
  onCancelNameEdit,
  onCatalogEntryGroupParentsChange,
  onCreateCatalogEntryGroup,
  onDeleteCatalogEntryGroup,
  onNameDraftChange,
  onSaveNameEdit,
  onShowEntryForm,
  onStartNameEdit,
}: {
  activeCatalog: Catalog
  activeCatalogEntryGroup: CatalogEntryGroup | null
  catalogGroupTree: CatalogGroupTreeItem[]
  nameDraft: string
  nameEdit: InlineNameEdit
  t: Record<string, string>
  onCancelNameEdit: () => void
  onCatalogEntryGroupParentsChange: (group: CatalogEntryGroup, parentGroupIds: number[]) => void
  onCreateCatalogEntryGroup: () => void
  onDeleteCatalogEntryGroup: (group: CatalogEntryGroup) => void
  onNameDraftChange: (value: string) => void
  onSaveNameEdit: () => void
  onShowEntryForm: () => void
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

  return (
    <section className="hierarchy-group-editor">
      <label className="project-name-field">
        <span>{t.attributeGroup}</span>
        <strong>{activeCatalogEntryGroup?.name ?? t.attributeGroup}</strong>
      </label>
      {activeCatalogEntryGroup !== null &&
      nameEdit?.kind === 'catalogEntryGroup' &&
      nameEdit.id === activeCatalogEntryGroup.id ? (
        <div className="inline-title-edit compact">
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
            <Check aria-hidden="true" size={16} />
          </button>
        </div>
      ) : (
        activeCatalogEntryGroup !== null && (
          <div className="table-actions">
            <button
              aria-label={`${t.edit}: ${activeCatalogEntryGroup.name}`}
              type="button"
              onClick={() =>
                onStartNameEdit(
                  { kind: 'catalogEntryGroup', id: activeCatalogEntryGroup.id },
                  activeCatalogEntryGroup.name,
                )
              }
            >
              <Pencil aria-hidden="true" size={16} />
            </button>
            <button
              aria-label={`${t.delete}: ${activeCatalogEntryGroup.name}`}
              type="button"
              onClick={() => onDeleteCatalogEntryGroup(activeCatalogEntryGroup)}
            >
              <Trash2 aria-hidden="true" size={16} />
            </button>
          </div>
        )
      )}
      <button className="primary-action compact" type="button" onClick={onCreateCatalogEntryGroup}>
        + {t.createAttributeGroup}
      </button>
      <button className="secondary-action compact" type="button" onClick={onShowEntryForm}>
        + {t.newCatalogEntry}
      </button>
      {activeCatalog.supportsHierarchy &&
        activeCatalog.hierarchyMode === 'groups' &&
        activeCatalogEntryGroup !== null && (
          <label className="project-name-field hierarchy-node-description">
            <span>{t.hierarchyParents}</span>
            <select
              multiple
              value={activeCatalogEntryGroup.parentGroupIds.map(String)}
              onChange={(event) =>
                onCatalogEntryGroupParentsChange(
                  activeCatalogEntryGroup,
                  Array.from(event.target.selectedOptions).map((option) => Number(option.value)),
                )
              }
            >
              {catalogGroupTree
                .filter(({ group }) => group.id !== activeCatalogEntryGroup.id)
                .map(({ group, depth }) => (
                  <option key={group.id} value={group.id}>
                    {formatCatalogGroupTreeLabel(group, depth)}
                  </option>
                ))}
            </select>
          </label>
        )}
    </section>
  )
}
