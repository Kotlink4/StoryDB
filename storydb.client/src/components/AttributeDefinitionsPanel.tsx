import { useState } from 'react'
import type {
  AttributeDataType,
  AttributeDefinition,
  AttributeDefinitionDraft,
  AttributeGroup,
  ObjectTypeKey,
} from '../types'

const dataTypes: AttributeDataType[] = ['text', 'number', 'select']

type AttributeDefinitionsPanelProps = {
  activeGroup: AttributeGroup | null
  activeScope: ObjectTypeKey
  attributeScopes: ObjectTypeKey[]
  definitions: AttributeDefinition[]
  draft: AttributeDefinitionDraft
  editingDefinitionId: number | null
  t: Record<string, string>
  onCancelEdit: () => void
  onDelete: (definition: AttributeDefinition) => void
  onDeleteGroup: (group: AttributeGroup) => void
  onDraftChange: (draft: AttributeDefinitionDraft) => void
  onEdit: (definition: AttributeDefinition) => void
  onGroupNameChange: (group: AttributeGroup, name: string) => void
  onScopeChange: (scope: ObjectTypeKey) => void
  onSubmit: () => void
}

export function AttributeDefinitionsPanel({
  activeGroup,
  activeScope,
  attributeScopes,
  definitions,
  draft,
  editingDefinitionId,
  t,
  onCancelEdit,
  onDelete,
  onDeleteGroup,
  onDraftChange,
  onEdit,
  onGroupNameChange,
  onScopeChange,
  onSubmit,
}: AttributeDefinitionsPanelProps) {
  const isMainGroup = activeGroup === null
  const [groupFilter, setGroupFilter] = useState('__all__')
  const groupNames = Array.from(
    new Set(
      definitions
        .map((definition) => definition.groupName)
        .filter((groupName): groupName is string => groupName !== null),
    ),
  ).sort((left, right) => left.localeCompare(right))
  const allGroupLabel = t.allGroup || t.statusAll
  const visibleDefinitions = isMainGroup
    ? definitions.filter((definition) => {
        if (groupFilter === '__all__') {
          return true
        }

        if (groupFilter === '__ungrouped__') {
          return definition.groupName === null
        }

        return definition.groupName === groupFilter
      })
    : definitions.filter((definition) => definition.groupName === activeGroup.name)

  return (
    <section className="attribute-definitions-panel">
      <div className="attribute-scope-filter" role="group" aria-label={t.attributeDictionary}>
        {attributeScopes.map((scope) => (
          <button
            className={activeScope === scope ? 'scope-filter-button is-active' : 'scope-filter-button'}
            key={scope}
            type="button"
            onClick={() => onScopeChange(scope)}
          >
            {t[scope]}
          </button>
        ))}
      </div>

      <section className="attribute-group-page">
        {isMainGroup ? (
          <div className="attribute-group-title">
            <span>{t.attributeGroup}</span>
            <strong>{allGroupLabel}</strong>
          </div>
        ) : (
          <>
            <label className="project-name-field">
              <span>{t.attributeGroup}</span>
              <input
                type="text"
                key={activeGroup.id}
                defaultValue={activeGroup.name}
                onBlur={(event) => onGroupNameChange(activeGroup, event.target.value)}
                placeholder={t.attributeGroup}
              />
            </label>
            <button
              className="secondary-action compact danger-action"
              type="button"
              onClick={() => onDeleteGroup(activeGroup)}
            >
              {t.delete}
            </button>
          </>
        )}
      </section>

      {isMainGroup && (
        <label className="project-name-field attribute-filter-field">
          <span>{t.attributeGroup}</span>
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="__all__">{allGroupLabel}</option>
            <option value="__ungrouped__">{t.primaryAttributeGroup}</option>
            {groupNames.map((groupName) => (
              <option key={groupName} value={groupName}>
                {groupName}
              </option>
            ))}
          </select>
        </label>
      )}

      <AttributeDefinitionForm
        draft={draft}
        editingDefinitionId={editingDefinitionId}
        t={t}
        onCancelEdit={onCancelEdit}
        onDraftChange={onDraftChange}
        onSubmit={onSubmit}
      />

      <table className="attribute-definition-table">
        <thead>
          <tr>
            <th>{t.attributeName}</th>
            <th>{t.attributeDataType}</th>
            <th>{t.attributeValue}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {visibleDefinitions.map((definition) => (
            <tr key={definition.id}>
              <td>{definition.name}</td>
              <td>{t[`attributeType${definition.dataType}`]}</td>
              <td>{formatDefinitionValue(definition)}</td>
              <td>
                <div className="table-actions">
                  <button type="button" onClick={() => onEdit(definition)}>
                    {t.edit}
                  </button>
                  <button type="button" onClick={() => onDelete(definition)}>
                    {t.delete}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {visibleDefinitions.length === 0 && (
        <section className="empty-state compact" aria-live="polite">
          <h2>{t.noAttributes}</h2>
        </section>
      )}
    </section>
  )
}

type AttributeDefinitionFormProps = {
  draft: AttributeDefinitionDraft
  editingDefinitionId: number | null
  t: Record<string, string>
  onCancelEdit: () => void
  onDraftChange: (draft: AttributeDefinitionDraft) => void
  onSubmit: () => void
}

function AttributeDefinitionForm({
  draft,
  editingDefinitionId,
  t,
  onCancelEdit,
  onDraftChange,
  onSubmit,
}: AttributeDefinitionFormProps) {
  return (
    <form
      className="attribute-definition-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className="project-name-field">
        <span>{t.attributeName}</span>
        <input
          type="text"
          value={draft.name}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          placeholder={t.attributeName}
        />
      </label>

      <label className="project-name-field">
        <span>{t.attributeDataType}</span>
        <select
          value={draft.dataType}
          onChange={(event) =>
            onDraftChange({ ...draft, dataType: event.target.value as AttributeDataType })
          }
        >
          {dataTypes.map((dataType) => (
            <option key={dataType} value={dataType}>
              {t[`attributeType${dataType}`]}
            </option>
          ))}
        </select>
      </label>

      {draft.dataType === 'number' && (
        <>
          <label className="project-name-field">
            <span>{t.attributeMin}</span>
            <input
              type="number"
              value={draft.minValue}
              onChange={(event) => onDraftChange({ ...draft, minValue: event.target.value })}
            />
          </label>
          <label className="project-name-field">
            <span>{t.attributeMax}</span>
            <input
              type="number"
              value={draft.maxValue}
              onChange={(event) => onDraftChange({ ...draft, maxValue: event.target.value })}
            />
          </label>
          <label className="project-name-field">
            <span>{t.attributeUnit}</span>
            <input
              type="text"
              value={draft.unit}
              onChange={(event) => onDraftChange({ ...draft, unit: event.target.value })}
              placeholder={t.attributeUnit}
            />
          </label>
        </>
      )}

      {draft.dataType === 'select' && (
        <label className="project-name-field attribute-definition-wide">
          <span>{t.attributeOptions}</span>
          <input
            type="text"
            value={draft.optionsText}
            onChange={(event) => onDraftChange({ ...draft, optionsText: event.target.value })}
            placeholder={t.attributeOptionsPlaceholder}
          />
        </label>
      )}

      <div className="attribute-definition-actions">
        {editingDefinitionId !== null && (
          <button className="secondary-action compact" type="button" onClick={onCancelEdit}>
            {t.cancel}
          </button>
        )}
        <button className="primary-action compact" type="submit">
          {editingDefinitionId === null ? t.addAttribute : t.save}
        </button>
      </div>
    </form>
  )
}

const formatDefinitionValue = (definition: AttributeDefinition) => {
  if (definition.dataType === 'number') {
    const bounds = [definition.minValue ?? '', definition.maxValue ?? ''].join(' - ').trim()
    return `${bounds}${definition.unit === null ? '' : ` ${definition.unit}`}`.trim() || '-'
  }

  if (definition.dataType === 'select') {
    return definition.options.join(', ')
  }

  return '-'
}
