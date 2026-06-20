import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  AttributeDefinition,
  AttributeGroup,
  DraftAttribute,
} from '../../types'
import {
  getDraftAttributeGroupName,
  groupDraftAttributes,
} from './objectEditorModel'

type ObjectEditorAttributesTabProps = {
  attributeDefinitions: AttributeDefinition[]
  attributeGroups: AttributeGroup[]
  draftAttributes: DraftAttribute[]
  ui: PreviewText
  onDraftAttributesChange: (attributes: DraftAttribute[]) => void
}

export function ObjectEditorAttributesTab({
  attributeDefinitions,
  attributeGroups,
  draftAttributes,
  ui,
  onDraftAttributesChange,
}: ObjectEditorAttributesTabProps) {
  const addAttribute = () => onDraftAttributesChange([...draftAttributes, { name: '', value: '' }])
  const addExistingAttribute = (definitionId: string) => {
    const definition = attributeDefinitions.find((item) => item.id === Number(definitionId))
    if (definition === undefined || draftAttributes.some((attribute) => attribute.name === definition.name)) {
      return
    }

    onDraftAttributesChange([...draftAttributes, { name: definition.name, value: '' }])
  }
  const addAttributeGroup = (groupName: string) => {
    const groupDefinitions = attributeDefinitions.filter((definition) =>
      groupName === '__main__' ? definition.groupName === null : definition.groupName === groupName,
    )
    const existingNames = new Set(draftAttributes.map((attribute) => attribute.name))
    const nextAttributes = [
      ...draftAttributes,
      ...groupDefinitions
        .filter((definition) => !existingNames.has(definition.name))
        .map((definition) => ({ name: definition.name, value: '' })),
    ]
    onDraftAttributesChange(nextAttributes)
  }
  const groupedDraftAttributes = groupDraftAttributes(draftAttributes, attributeDefinitions, ui.main)
  const removeDraftAttributeGroup = (groupName: string) => {
    onDraftAttributesChange(
      draftAttributes.filter(
        (attribute) => getDraftAttributeGroupName(attribute, attributeDefinitions, ui.main) !== groupName,
      ),
    )
  }

  return (
    <div className="sp-editor-stack">
      <button className="sp-button" type="button" onClick={addAttribute}>
        {ui.addAttribute}
      </button>
      <div className="sp-editor-row">
        <select defaultValue="" onChange={(event) => addExistingAttribute(event.target.value)}>
          <option value="">{ui.addExistingAttribute}</option>
          {attributeDefinitions.map((definition) => (
            <option key={definition.id} value={definition.id}>
              {definition.name}
            </option>
          ))}
        </select>
        <select defaultValue="" onChange={(event) => addAttributeGroup(event.target.value)}>
          <option value="">{ui.addAttributeGroup}</option>
          <option value="__main__">{ui.main}</option>
          {attributeGroups.map((group) => (
            <option key={group.id} value={group.name}>
              {group.name}
            </option>
          ))}
        </select>
        <span className="sp-editor-hint">{ui.valuesForObjectHint}</span>
      </div>
      {groupedDraftAttributes.map((group) => (
        <section className="sp-editor-attribute-group" key={group.name}>
          <div className="sp-attribute-group-head">
            <strong>{group.name}</strong>
            <button type="button" onClick={() => removeDraftAttributeGroup(group.name)}>
              {ui.delete}
            </button>
          </div>
          {group.items.map(({ attribute, index }) => (
            <div className="sp-editor-row" key={index}>
              <input
                list="sp-attribute-definitions"
                placeholder={ui.firstName}
                value={attribute.name}
                onChange={(event) =>
                  onDraftAttributesChange(
                    draftAttributes.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, name: event.target.value } : item,
                    ),
                  )
                }
              />
              <input
                placeholder={ui.attributeValuePlaceholder}
                value={attribute.value}
                onChange={(event) =>
                  onDraftAttributesChange(
                    draftAttributes.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, value: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
          ))}
        </section>
      ))}
      <datalist id="sp-attribute-definitions">
        {attributeDefinitions.map((definition) => (
          <option key={definition.id} value={definition.name} />
        ))}
      </datalist>
    </div>
  )
}
