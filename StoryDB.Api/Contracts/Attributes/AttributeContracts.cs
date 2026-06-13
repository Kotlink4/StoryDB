namespace StoryDB.Api.Contracts.Attributes;

public record AttributeGroupRequest(string TypeKey, string Name, string? IconKey);

public record AttributeGroupDto(int Id, string TypeKey, string Name, string? IconKey);

public record AttributeDefinitionRequest(
    string TypeKey,
    string Name,
    string DataType,
    string? GroupName,
    double? MinValue,
    double? MaxValue,
    string? Unit,
    string? IconKey,
    IReadOnlyList<string>? Options);

public record AttributeDefinitionDto(
    int Id,
    string TypeKey,
    string Name,
    string DataType,
    string? GroupName,
    double? MinValue,
    double? MaxValue,
    string? Unit,
    string? IconKey,
    IReadOnlyList<string> Options);
