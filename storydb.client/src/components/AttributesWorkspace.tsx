import { attributeDataTypeLabels, groupAttributesByDefinition } from '../style-preview/domain/attributeDisplay'
import { catalogTemplateLabels, type PreviewLanguage, type PreviewText } from '../style-preview/domain/stylePreviewI18n'
import type { GroupDisplayMode } from '../style-preview/domain/stylePreviewUiTypes'
import type { AttributeDataType, AttributeDefinition, AttributeDefinitionDraft, AttributeGroup } from '../types'
import type { ValidationIssueMap } from '../validation'
import { FieldError } from './FormValidation'
import { getFieldValidationProps, useFirstInvalidFieldFocus } from './formValidationUtils'
import { AttributeIcon, AttributeIconPicker, KebabMenu } from './StylePreviewPrimitives'

export function AttributesWorkspace({
  attributeDefinitionDraft,
  attributeDefinitions,
  attributeGroupIconKey,
  attributeGroupName,
  attributeGroupValidationErrors,
  attributeGroups,
  canEdit = true,
  definitionValidationErrors,
  groupDisplayMode,
  editingAttributeDefinitionId,
  language,
  selectedAttributeGroupId,
  ui,
  onCancelAttributeEdit,
  onAttributeDefinitionDraftChange,
  onAttributeGroupIconChange,
  onAttributeGroupNameChange,
  onCreateAttribute,
  onCreateGroup,
  onDeleteAttribute,
  onDeleteGroup,
  onEditAttribute,
  onEditGroup,
  onSelectGroup,
}: {
  attributeDefinitionDraft: AttributeDefinitionDraft
  attributeDefinitions: AttributeDefinition[]
  attributeGroupIconKey: string
  attributeGroupName: string
  attributeGroupValidationErrors?: ValidationIssueMap
  attributeGroups: AttributeGroup[]
  canEdit?: boolean
  definitionValidationErrors?: ValidationIssueMap
  groupDisplayMode: GroupDisplayMode
  editingAttributeDefinitionId: number | null
  language: PreviewLanguage
  selectedAttributeGroupId: number | null
  ui: PreviewText
  onCancelAttributeEdit: () => void
  onAttributeDefinitionDraftChange: (draft: AttributeDefinitionDraft) => void
  onAttributeGroupIconChange: (iconKey: string) => void
  onAttributeGroupNameChange: (name: string) => void
  onCreateAttribute: () => void
  onCreateGroup: () => void
  onDeleteAttribute: (definition: AttributeDefinition) => void
  onDeleteGroup: (group: AttributeGroup) => void
  onEditAttribute: (definition: AttributeDefinition) => void
  onEditGroup: (group: AttributeGroup) => void
  onSelectGroup: (groupId: number | null) => void
}) {
  const selectedGroup = attributeGroups.find((group) => group.id === selectedAttributeGroupId) ?? null
  const visibleDefinitions =
    selectedGroup === null
      ? attributeDefinitions
      : attributeDefinitions.filter((definition) => definition.groupName === selectedGroup.name)
  const definitionsByGroup = groupAttributesByDefinition(
    visibleDefinitions.map((definition) => ({
      id: definition.id,
      attributeDefinitionId: definition.id,
      name: definition.name,
      value: definition.dataType,
    })),
    visibleDefinitions,
    ui.main,
  )
  const updateDraft = (patch: Partial<AttributeDefinitionDraft>) =>
    onAttributeDefinitionDraftChange({ ...attributeDefinitionDraft, ...patch })
  const groupNameForDraft = selectedGroup?.name ?? attributeDefinitionDraft.groupName
  const definitionFormRef = useFirstInvalidFieldFocus<HTMLDivElement>(definitionValidationErrors)

  return (
    <>
      <div className="sp-content-head">
        <div>
          <h2>{ui.attributes}</h2>
        </div>
      </div>
      <div className={`sp-attribute-catalog ${groupDisplayMode === 'subtabs' ? 'single' : ''}`}>
        {groupDisplayMode === 'blocks' && (
        <aside className="sp-catalog-list">
          <button className={selectedAttributeGroupId === null ? 'active' : ''} type="button" onClick={() => onSelectGroup(null)}>
            <strong>{ui.all}</strong>
            <span>{attributeDefinitions.length}</span>
          </button>
          {attributeGroups.map((group) => (
            <div className="sp-list-menu-row" key={group.id}>
            <button
              className={selectedAttributeGroupId === group.id ? 'active' : ''}
              type="button"
              onClick={() => onSelectGroup(group.id)}
            >
              <strong className="sp-label-with-icon">
                <AttributeIcon iconKey={group.iconKey} />
                {group.name}
              </strong>
              <span>{attributeDefinitions.filter((definition) => definition.groupName === group.name).length}</span>
            </button>
            {canEdit && <KebabMenu ui={ui} onDelete={() => onDeleteGroup(group)} onEdit={() => onEditGroup(group)} />}
            </div>
          ))}
          {canEdit && (
            <div className="sp-inline-create">
              <input
                placeholder={ui.newGroup}
                value={attributeGroupName}
                onChange={(event) => onAttributeGroupNameChange(event.target.value)}
                {...getFieldValidationProps('name', attributeGroupValidationErrors, 'attribute-group-inline-error')}
              />
              <button className="sp-button primary" type="button" onClick={onCreateGroup}>
                +
              </button>
              <AttributeIconPicker language={language} value={attributeGroupIconKey} onChange={onAttributeGroupIconChange} />
              <FieldError id="attribute-group-inline-error" message={attributeGroupValidationErrors?.name} />
            </div>
          )}
        </aside>
        )}
        <section className="sp-catalog-main">
          {canEdit && groupDisplayMode === 'subtabs' && (
            <div className="sp-inline-create sp-inline-create-wide">
              <input
                placeholder={ui.newGroup}
                value={attributeGroupName}
                onChange={(event) => onAttributeGroupNameChange(event.target.value)}
                {...getFieldValidationProps('name', attributeGroupValidationErrors, 'attribute-group-subtabs-error')}
              />
              <button className="sp-button primary" type="button" onClick={onCreateGroup}>
                +
              </button>
              <AttributeIconPicker language={language} value={attributeGroupIconKey} onChange={onAttributeGroupIconChange} />
              <FieldError id="attribute-group-subtabs-error" message={attributeGroupValidationErrors?.name} />
            </div>
          )}
          {canEdit && (
            <div className="sp-attribute-definition-form" ref={definitionFormRef}>
              <div className="sp-form-row">
              <label>
                {ui.firstName}
                <input
                  list="sp-existing-attribute-definitions"
                  value={attributeDefinitionDraft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  {...getFieldValidationProps('name', definitionValidationErrors, 'attribute-definition-name-error')}
                />
                <FieldError id="attribute-definition-name-error" message={definitionValidationErrors?.name} />
              </label>
              <datalist id="sp-existing-attribute-definitions">
                {attributeDefinitions.map((definition) => (
                  <option key={definition.id} value={definition.name} />
                ))}
              </datalist>
              <label>
                {ui.dataType}
                <select
                  value={attributeDefinitionDraft.dataType}
                  onChange={(event) => updateDraft({ dataType: event.target.value as AttributeDataType })}
                >
                  {(['text', 'number', 'select'] as AttributeDataType[]).map((dataType) => (
                    <option key={dataType} value={dataType}>
                      {attributeDataTypeLabels[dataType][language]}
                    </option>
                  ))}
                </select>
              </label>
              {selectedGroup === null && (
                <label>
                  {ui.group}
                  <select value={groupNameForDraft} onChange={(event) => updateDraft({ groupName: event.target.value })}>
                    <option value="">{ui.noGroup}</option>
                    {attributeGroups.map((group) => (
                      <option key={group.id} value={group.name}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <label className="sp-wide-label">
              {ui.icon}
              <AttributeIconPicker
                language={language}
                value={attributeDefinitionDraft.iconKey}
                onChange={(iconKey) => updateDraft({ iconKey })}
              />
            </label>
            {attributeDefinitionDraft.dataType === 'number' && (
              <div className="sp-form-row">
                <label>
                  {ui.minShort}
                  <input
                    value={attributeDefinitionDraft.minValue}
                    onChange={(event) => updateDraft({ minValue: event.target.value })}
                    {...getFieldValidationProps('minValue', definitionValidationErrors, 'attribute-definition-min-error')}
                  />
                  <FieldError id="attribute-definition-min-error" message={definitionValidationErrors?.minValue} />
                </label>
                <label>
                  {ui.maxShort}
                  <input
                    value={attributeDefinitionDraft.maxValue}
                    onChange={(event) => updateDraft({ maxValue: event.target.value })}
                    {...getFieldValidationProps('maxValue', definitionValidationErrors, 'attribute-definition-max-error')}
                  />
                  <FieldError id="attribute-definition-max-error" message={definitionValidationErrors?.maxValue} />
                </label>
                <label>
                  {ui.unitShort}
                  <input
                    value={attributeDefinitionDraft.unit}
                    onChange={(event) => updateDraft({ unit: event.target.value })}
                    {...getFieldValidationProps('unit', definitionValidationErrors, 'attribute-definition-unit-error')}
                  />
                  <FieldError id="attribute-definition-unit-error" message={definitionValidationErrors?.unit} />
                </label>
              </div>
            )}
            {attributeDefinitionDraft.dataType === 'select' && (
              <label className="sp-wide-label">
                {catalogTemplateLabels[language].options}
                <input
                  value={attributeDefinitionDraft.optionsText}
                  onChange={(event) => updateDraft({ optionsText: event.target.value })}
                  {...getFieldValidationProps('optionsText', definitionValidationErrors, 'attribute-definition-options-error')}
                />
                <FieldError id="attribute-definition-options-error" message={definitionValidationErrors?.optionsText} />
              </label>
            )}
            {selectedGroup !== null && <span className="sp-muted-line">{ui.group}: {selectedGroup.name}</span>}
            <div className="sp-inline-actions">
              {editingAttributeDefinitionId !== null && (
                <button className="sp-button" type="button" onClick={onCancelAttributeEdit}>
                  {ui.cancel}
                </button>
              )}
              <button className="sp-button primary" type="button" onClick={onCreateAttribute}>
                {editingAttributeDefinitionId === null ? ui.addAttribute : ui.save}
              </button>
              </div>
            </div>
          )}

          {visibleDefinitions.length === 0 ? (
            <div className="sp-empty">
              <strong>{ui.noObjects}</strong>
              <span>{ui.attributes}</span>
            </div>
          ) : (
            definitionsByGroup.map((group) => (
              <article className="sp-attribute-group" key={group.name}>
                <div className="sp-attribute-group-head">
                  <strong className="sp-label-with-icon">
                    <AttributeIcon iconKey={attributeGroups.find((item) => item.name === group.name)?.iconKey} />
                    {group.name}
                  </strong>
                  <span>{group.attributes.length}</span>
                </div>
                {group.attributes.map((attribute) => {
                  const definition = attributeDefinitions.find((item) => item.id === attribute.attributeDefinitionId)

                  return (
                    <div className="sp-row with-menu" key={attribute.id}>
                      <span className="sp-label-with-icon">
                        <AttributeIcon iconKey={definition?.iconKey} />
                        {attribute.name}
                      </span>
                      <strong>{attribute.value ?? '-'}</strong>
                      {canEdit && definition !== undefined && (
                        <KebabMenu
                          ui={ui}
                          onDelete={() => onDeleteAttribute(definition)}
                          onEdit={() => onEditAttribute(definition)}
                        />
                      )}
                    </div>
                  )
                })}
              </article>
            ))
          )}
        </section>
      </div>
    </>
  )
}
