using StoryDB.Api.Contracts.Attributes;

namespace StoryDB.Api.Services.Attributes;

public interface IAttributeDefinitionService
{
    Task<AttributeDefinitionServiceResult<IReadOnlyList<AttributeGroupDto>>> GetGroupsAsync(int projectId, string typeKey);

    Task<AttributeDefinitionServiceResult<AttributeGroupDto>> CreateGroupAsync(int projectId, AttributeGroupRequest request);

    Task<AttributeDefinitionServiceResult<AttributeGroupDto>> UpdateGroupAsync(int projectId, int groupId, AttributeGroupRequest request);

    Task<AttributeDefinitionServiceResult> DeleteGroupAsync(int projectId, int groupId);

    Task<AttributeDefinitionServiceResult<IReadOnlyList<AttributeDefinitionDto>>> GetDefinitionsAsync(int projectId, string typeKey);

    Task<AttributeDefinitionServiceResult<AttributeDefinitionDto>> CreateDefinitionAsync(int projectId, AttributeDefinitionRequest request);

    Task<AttributeDefinitionServiceResult<AttributeDefinitionDto>> UpdateDefinitionAsync(int projectId, int definitionId, AttributeDefinitionRequest request);

    Task<AttributeDefinitionServiceResult> DeleteDefinitionAsync(int projectId, int definitionId);
}
