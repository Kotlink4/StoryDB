namespace StoryDB.Api.Services.Structures;

public enum StructureServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record StructureServiceResult(StructureServiceStatus Status, string? Error = null)
{
    public static StructureServiceResult Success() => new(StructureServiceStatus.Success);

    public static StructureServiceResult NotFound() => new(StructureServiceStatus.NotFound);

    public static StructureServiceResult Invalid(string error) => new(StructureServiceStatus.Invalid, error);
}

public sealed record StructureServiceResult<TValue>(
    StructureServiceStatus Status,
    TValue? Value = default,
    string? Error = null)
{
    public static StructureServiceResult<TValue> Success(TValue value) => new(StructureServiceStatus.Success, value);

    public static StructureServiceResult<TValue> NotFound() => new(StructureServiceStatus.NotFound);

    public static StructureServiceResult<TValue> Invalid(string error) => new(StructureServiceStatus.Invalid, default, error);
}
