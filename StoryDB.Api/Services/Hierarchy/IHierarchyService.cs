using StoryDB.Api.Contracts.Hierarchy;

namespace StoryDB.Api.Services.Hierarchy;

public interface IHierarchyService
{
    Task<HierarchyServiceResult<IReadOnlyList<HierarchyGroupDto>>> GetGroupsAsync(int projectId);

    Task<HierarchyServiceResult<HierarchyGroupDto>> CreateGroupAsync(int projectId, HierarchyGroupRequest request);

    Task<HierarchyServiceResult<HierarchyGroupDto>> UpdateGroupAsync(int projectId, int groupId, HierarchyGroupRequest request);

    Task<HierarchyServiceResult> DeleteGroupAsync(int projectId, int groupId);

    Task<HierarchyServiceResult<IReadOnlyList<HierarchyNodeDto>>> GetNodesAsync(int projectId, int groupId);

    Task<HierarchyServiceResult<HierarchyNodeDto>> CreateNodeAsync(int projectId, int groupId, HierarchyNodeRequest request);

    Task<HierarchyServiceResult<HierarchyNodeDto>> UpdateNodeAsync(int projectId, int groupId, int nodeId, HierarchyNodeRequest request);

    Task<HierarchyServiceResult> DeleteNodeAsync(int projectId, int groupId, int nodeId);
}
