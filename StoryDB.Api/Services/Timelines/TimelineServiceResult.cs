namespace StoryDB.Api.Services.Timelines;

public enum TimelineServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record TimelineServiceResult(TimelineServiceStatus Status, string? Error = null)
{
    public static TimelineServiceResult Success() => new(TimelineServiceStatus.Success);

    public static TimelineServiceResult NotFound() => new(TimelineServiceStatus.NotFound);

    public static TimelineServiceResult Invalid(string? error) => new(TimelineServiceStatus.Invalid, error);
}

public sealed record TimelineServiceResult<TValue>(TimelineServiceStatus Status, TValue? Value = default, string? Error = null)
{
    public static TimelineServiceResult<TValue> Success(TValue? value) => new(TimelineServiceStatus.Success, value);

    public static TimelineServiceResult<TValue> NotFound() => new(TimelineServiceStatus.NotFound);

    public static TimelineServiceResult<TValue> Invalid(string? error) => new(TimelineServiceStatus.Invalid, default, error);
}
