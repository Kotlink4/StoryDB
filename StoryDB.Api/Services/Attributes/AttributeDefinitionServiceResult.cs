namespace StoryDB.Api.Services.Attributes;

public enum AttributeDefinitionServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record AttributeDefinitionServiceResult(AttributeDefinitionServiceStatus Status, string? Error = null)
{
    public static AttributeDefinitionServiceResult Success() => new(AttributeDefinitionServiceStatus.Success);

    public static AttributeDefinitionServiceResult NotFound() => new(AttributeDefinitionServiceStatus.NotFound);

    public static AttributeDefinitionServiceResult Invalid(string error) => new(AttributeDefinitionServiceStatus.Invalid, error);
}

public sealed record AttributeDefinitionServiceResult<TValue>(
    AttributeDefinitionServiceStatus Status,
    TValue? Value = default,
    string? Error = null)
{
    public static AttributeDefinitionServiceResult<TValue> Success(TValue value) =>
        new(AttributeDefinitionServiceStatus.Success, value);

    public static AttributeDefinitionServiceResult<TValue> NotFound() =>
        new(AttributeDefinitionServiceStatus.NotFound);

    public static AttributeDefinitionServiceResult<TValue> Invalid(string error) =>
        new(AttributeDefinitionServiceStatus.Invalid, default, error);
}
