namespace StoryDB.Api.Services.Relations;

public enum RelationServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record RelationServiceResult<TValue>(RelationServiceStatus Status, TValue? Value = default, string? Error = null)
{
    public static RelationServiceResult<TValue> Success(TValue? value) => new(RelationServiceStatus.Success, value);

    public static RelationServiceResult<TValue> NotFound() => new(RelationServiceStatus.NotFound);

    public static RelationServiceResult<TValue> Invalid(string error) => new(RelationServiceStatus.Invalid, default, error);
}
