using StoryDB.Api.Validation;

namespace StoryDB.Api;

public static class AuthInputValidator
{
    public static string? ValidateCredentials(string? email, string? password)
        => RequestValidators.ValidateAuthCredentials(email, password);

    public static string NormalizeEmailInput(string? email) => email?.Trim() ?? string.Empty;

    public static string NormalizeEmail(string? email) => NormalizeEmailInput(email).ToUpperInvariant();
}
