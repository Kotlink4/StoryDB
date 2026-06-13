namespace StoryDB.Api.Services.Catalogs;

public enum CatalogServiceStatus
{
    Success,
    NotFound,
    Invalid,
}

public sealed record CatalogServiceResult<T>(
    CatalogServiceStatus Status,
    T? Value,
    string? Error)
{
    public static CatalogServiceResult<T> Success(T value) =>
        new(CatalogServiceStatus.Success, value, null);

    public static CatalogServiceResult<T> NotFound() =>
        new(CatalogServiceStatus.NotFound, default, null);

    public static CatalogServiceResult<T> Invalid(string error) =>
        new(CatalogServiceStatus.Invalid, default, error);
}

public sealed record CatalogServiceResult(CatalogServiceStatus Status, string? Error)
{
    public static CatalogServiceResult Success() =>
        new(CatalogServiceStatus.Success, null);

    public static CatalogServiceResult NotFound() =>
        new(CatalogServiceStatus.NotFound, null);

    public static CatalogServiceResult Invalid(string error) =>
        new(CatalogServiceStatus.Invalid, error);
}
