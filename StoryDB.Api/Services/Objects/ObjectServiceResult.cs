namespace StoryDB.Api.Services.Objects;

public enum ObjectServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record ObjectServiceResult(ObjectServiceStatus Status, string? Error = null)
{
    public static ObjectServiceResult Success() => new(ObjectServiceStatus.Success);

    public static ObjectServiceResult NotFound() => new(ObjectServiceStatus.NotFound);

    public static ObjectServiceResult Invalid(string? error) => new(ObjectServiceStatus.Invalid, error);
}

public sealed record ObjectServiceResult<TValue>(ObjectServiceStatus Status, TValue? Value = default, string? Error = null)
{
    public static ObjectServiceResult<TValue> Success(TValue value) => new(ObjectServiceStatus.Success, value);

    public static ObjectServiceResult<TValue> NotFound() => new(ObjectServiceStatus.NotFound);

    public static ObjectServiceResult<TValue> Invalid(string? error) => new(ObjectServiceStatus.Invalid, default, error);
}
