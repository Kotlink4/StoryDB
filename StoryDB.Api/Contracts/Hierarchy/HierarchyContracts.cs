namespace StoryDB.Api.Contracts.Hierarchy;

public record HierarchyGroupRequest(string Name);

public record HierarchyNodeRequest(
    string Name,
    string? Description,
    IReadOnlyList<int> ParentNodeIds);

public record HierarchyGroupDto(int Id, string Name, int NodeCount);

public record HierarchyNodeDto(
    int Id,
    string Name,
    string? Description,
    IReadOnlyList<int> ParentNodeIds,
    IReadOnlyList<int> ChildNodeIds);
