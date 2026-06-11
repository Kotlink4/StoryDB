namespace StoryDB.Api;

public static class AuthInputValidator
{
    public static string? ValidateCredentials(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || email.Length > 254 || !email.Contains('@'))
        {
            return "Valid email is required.";
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 6 || password.Length > 128)
        {
            return "Password must be between 6 and 128 characters.";
        }

        return null;
    }

    public static string NormalizeEmailInput(string email) => email.Trim();

    public static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();
}
