using StoryDB.Api;

namespace StoryDB.Api.Tests;

public class AuthInputValidatorTests
{
    [Theory]
    [InlineData(" user@example.com ", "user@example.com")]
    [InlineData("\tUser.Name@example.com\r\n", "User.Name@example.com")]
    public void NormalizeEmailInput_TrimsWhitespace(string value, string expected)
    {
        var result = AuthInputValidator.NormalizeEmailInput(value);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void NormalizeEmail_ProducesCaseInsensitiveLookupKey()
    {
        var result = AuthInputValidator.NormalizeEmail(" User.Name@example.com ");

        Assert.Equal("USER.NAME@EXAMPLE.COM", result);
    }

    [Theory]
    [InlineData("", "strong-password")]
    [InlineData("not-an-email", "strong-password")]
    [InlineData("user@example.com", "12345")]
    public void ValidateCredentials_ReturnsError_ForInvalidInput(string email, string password)
    {
        var result = AuthInputValidator.ValidateCredentials(email, password);

        Assert.NotNull(result);
    }

    [Fact]
    public void ValidateCredentials_ReturnsNull_ForValidInput()
    {
        var result = AuthInputValidator.ValidateCredentials("user@example.com", "strong-password");

        Assert.Null(result);
    }
}
