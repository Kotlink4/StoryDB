namespace StoryDB.Api.Services.Exports;

public enum ProjectExportServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record ProjectExportServiceResult<TValue>(
    ProjectExportServiceStatus Status,
    TValue? Value = default,
    string? Error = null)
{
    public static ProjectExportServiceResult<TValue> Success(TValue value) =>
        new(ProjectExportServiceStatus.Success, value);

    public static ProjectExportServiceResult<TValue> NotFound() =>
        new(ProjectExportServiceStatus.NotFound);

    public static ProjectExportServiceResult<TValue> Invalid(string error) =>
        new(ProjectExportServiceStatus.Invalid, default, error);
}
