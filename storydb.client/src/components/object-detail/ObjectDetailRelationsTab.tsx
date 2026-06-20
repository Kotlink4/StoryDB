import { getObjectFullName } from '../../style-preview/domain/objectDisplay'
import type { PreviewText } from '../../style-preview/domain/stylePreviewI18n'
import type { ObjectReference, StoryObject } from '../../types'
import { CollapsibleDetailSection } from '../CollapsibleDetailSection'
import { LinkedText, type TextLinkTarget } from '../LinkedText'

type OrganizationMemberItem = {
  id: number
  name: string
  ownerName: string
}

type ObjectDetailRelationsTabProps = {
  characterOrganizations: StoryObject[]
  characterRelationships: StoryObject['outgoingCharacterRelationships']
  displayStoryObject: StoryObject
  isCharacter: boolean
  isOrganization: boolean
  organizationMemberItems: OrganizationMemberItem[]
  organizationMembers: StoryObject[]
  textLinkTargets: TextLinkTarget[]
  ui: PreviewText
}

const linkedObjectGroups = (storyObject: StoryObject): ObjectReference[] => [
  storyObject.ownedItems,
  storyObject.owners,
  storyObject.territoryPlaces,
  storyObject.organizationsOnTerritory,
  storyObject.ownerOrganizations,
  storyObject.ownedTerritories,
].flat()

export function ObjectDetailRelationsTab({
  characterOrganizations,
  characterRelationships,
  displayStoryObject,
  isCharacter,
  isOrganization,
  organizationMemberItems,
  organizationMembers,
  textLinkTargets,
  ui,
}: ObjectDetailRelationsTabProps) {
  if (isOrganization) {
    return (
      <>
        <CollapsibleDetailSection count={organizationMembers.length} title={ui.organizationMembers}>
          <p className="sp-editor-hint">{ui.organizationSurnameAutoAssignHint}</p>
          {organizationMembers.length === 0 ? (
            <p>{ui.noOrganizationMembers}</p>
          ) : (
            organizationMembers.map((member) => (
              <div className="sp-row" key={member.id}>
                <span>{member.typeKey}</span>
                <strong>
                  <LinkedText targets={textLinkTargets} text={getObjectFullName(member)} />
                </strong>
              </div>
            ))
          )}
        </CollapsibleDetailSection>
        <CollapsibleDetailSection count={organizationMemberItems.length} title={ui.organizationItems}>
          {organizationMemberItems.length === 0 ? (
            <p>{ui.noOrganizationItems}</p>
          ) : (
            organizationMemberItems.map((item) => (
              <div className="sp-row" key={item.id}>
                <span>{item.ownerName}</span>
                <strong>
                  <LinkedText targets={textLinkTargets} text={item.name} />
                </strong>
              </div>
            ))
          )}
        </CollapsibleDetailSection>
        <CollapsibleDetailSection count={displayStoryObject.territoryPlaces.length} title={ui.organizationTerritories}>
          {displayStoryObject.territoryPlaces.length === 0 ? (
            <p>{ui.noOrganizationTerritories}</p>
          ) : (
            displayStoryObject.territoryPlaces.map((reference) => (
              <div className="sp-row" key={`${reference.typeKey}-${reference.id}`}>
                <span>{reference.typeKey}</span>
                <strong>
                  <LinkedText targets={textLinkTargets} text={reference.name} />
                </strong>
              </div>
            ))
          )}
        </CollapsibleDetailSection>
      </>
    )
  }

  const linkedObjects = linkedObjectGroups(displayStoryObject)

  return (
    <>
      {isCharacter && (
        <CollapsibleDetailSection count={characterOrganizations.length} title={ui.organizations}>
          <p className="sp-editor-hint">{ui.organizationSurnameAutoAssignHint}</p>
          {characterOrganizations.length === 0 ? (
            <p>{ui.noCharacterOrganizations}</p>
          ) : (
            characterOrganizations.map((organization) => (
              <div className="sp-row" key={organization.id}>
                <span>{ui.organizationMembership}</span>
                <strong>
                  <LinkedText targets={textLinkTargets} text={organization.name} />
                </strong>
              </div>
            ))
          )}
        </CollapsibleDetailSection>
      )}
      <CollapsibleDetailSection count={characterRelationships.length} title={ui.relations}>
        {characterRelationships.length === 0 ? (
          <p>{ui.noRelationships}</p>
        ) : (
          characterRelationships.map((relationship) => (
            <div className="sp-row" key={`${relationship.direction}-${relationship.id}`}>
              <span>
                <LinkedText targets={textLinkTargets} text={relationship.character.name} />
              </span>
              <strong>{relationship.relationType}</strong>
            </div>
          ))
        )}
      </CollapsibleDetailSection>
      <CollapsibleDetailSection count={linkedObjects.length} title={ui.linkedObjects}>
        {linkedObjects.map((reference) => (
          <div className="sp-row" key={`${reference.typeKey}-${reference.id}`}>
            <span>{reference.typeKey}</span>
            <strong>
              <LinkedText targets={textLinkTargets} text={reference.name} />
            </strong>
          </div>
        ))}
      </CollapsibleDetailSection>
    </>
  )
}
