namespace StoryDB.Api.Services.Hierarchy;

public enum HierarchyServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record HierarchyServiceResult(HierarchyServiceStatus Status, string? Error = null)
{
    public static HierarchyServiceResult Success() => new(HierarchyServiceStatus.Success);

    public static HierarchyServiceResult NotFound() => new(HierarchyServiceStatus.NotFound);

    public static HierarchyServiceResult Invalid(string error) => new(HierarchyServiceStatus.Invalid, error);
}

public sealed record HierarchyServiceResult<TValue>(HierarchyServiceStatus Status, TValue? Value = default, string? Error = null)
{
    public static HierarchyServiceResult<TValue> Success(TValue value) => new(HierarchyServiceStatus.Success, value);

    public static HierarchyServiceResult<TValue> NotFound() => new(HierarchyServiceStatus.NotFound);

    public static HierarchyServiceResult<TValue> Invalid(string error) => new(HierarchyServiceStatus.Invalid, default, error);
}
