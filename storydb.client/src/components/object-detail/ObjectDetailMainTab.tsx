import { AttributeIcon } from '../StylePreviewPrimitives'
import { LinkedText, type TextLinkTarget } from '../LinkedText'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type {
  AttributeDefinition,
  AttributeGroup,
  StoryObject,
} from '../../types'

type AttributeDisplayGroup = {
  name: string
  attributes: StoryObject['attributes']
}

type ObjectDetailMainTabProps = {
  attributeDefinitions: AttributeDefinition[]
  attributeGroupDefinitions: AttributeGroup[]
  attributeGroups: AttributeDisplayGroup[]
  displayStoryObject: StoryObject
  textLinkTargets: TextLinkTarget[]
  ui: PreviewText
}

export function ObjectDetailMainTab({
  attributeDefinitions,
  attributeGroupDefinitions,
  attributeGroups,
  displayStoryObject,
  textLinkTargets,
  ui,
}: ObjectDetailMainTabProps) {
  return (
    <>
      <section className="sp-panel">
        <h3>{ui.attributes}</h3>
        {displayStoryObject.attributes.length === 0 ? (
          <p>{ui.noAttributeValues}</p>
        ) : (
          attributeGroups.map((group) => (
            <article className="sp-attribute-group" key={group.name}>
              <div className="sp-attribute-group-head">
                <strong className="sp-label-with-icon">
                  <AttributeIcon iconKey={attributeGroupDefinitions.find((item) => item.name === group.name)?.iconKey} />
                  {group.name}
                </strong>
                <span>{group.attributes.length}</span>
              </div>
              {group.attributes.map((attribute) => {
                const definition = attributeDefinitions.find((item) => item.id === attribute.attributeDefinitionId)

                return (
                  <div className="sp-row" key={attribute.id}>
                    <span className="sp-label-with-icon">
                      <AttributeIcon iconKey={definition?.iconKey} />
                      {attribute.name}
                    </span>
                    <strong>
                      <LinkedText emptyText="-" targets={textLinkTargets} text={attribute.value} />
                    </strong>
                  </div>
                )
              })}
            </article>
          ))
        )}
      </section>
      <section className="sp-panel">
        <h3>{ui.catalogs}</h3>
        {displayStoryObject.catalogSelections.length === 0 ? (
          <p>{ui.noCatalogValues}</p>
        ) : (
          displayStoryObject.catalogSelections.map((selection) => (
            <div
              className="sp-row"
              key={`${selection.targetType}-${selection.catalogId}-${selection.catalogEntryGroupId}-${selection.catalogEntryId}`}
            >
              <span>{selection.catalogName}</span>
              <strong>
                <LinkedText
                  targets={textLinkTargets}
                  text={selection.catalogEntryName ?? selection.catalogEntryGroupName ?? selection.targetType}
                />
              </strong>
            </div>
          ))
        )}
      </section>
      <section className="sp-panel">
        <h3>{ui.hierarchyValues}</h3>
        {displayStoryObject.hierarchySelections.length === 0 ? (
          <p>{ui.noHierarchyValues}</p>
        ) : (
          displayStoryObject.hierarchySelections.map((selection) => (
            <div className="sp-row" key={selection.groupId}>
              <span>{selection.groupName}</span>
              <strong>
                <LinkedText targets={textLinkTargets} text={selection.nodes.map((node) => node.name).join(', ')} />
              </strong>
            </div>
          ))
        )}
      </section>
    </>
  )
}
