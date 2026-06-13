using System.Security.Claims;

namespace StoryDB.Api.Services.Auth;

public enum AuthServiceStatus
{
    Success,
    Unauthorized,
    Conflict,
    Invalid,
}

public sealed record AuthServiceResult<TValue>(
    AuthServiceStatus Status,
    TValue? Value = default,
    ClaimsPrincipal? Principal = null,
    string? Error = null,
    bool ShouldSignOut = false)
{
    public static AuthServiceResult<TValue> Success(TValue value, ClaimsPrincipal? principal = null) =>
        new(AuthServiceStatus.Success, value, principal);

    public static AuthServiceResult<TValue> Unauthorized(string? error = null, bool shouldSignOut = false) =>
        new(AuthServiceStatus.Unauthorized, default, null, error, shouldSignOut);

    public static AuthServiceResult<TValue> Conflict(string error) =>
        new(AuthServiceStatus.Conflict, default, null, error);

    public static AuthServiceResult<TValue> Invalid(string error) =>
        new(AuthServiceStatus.Invalid, default, null, error);
}
