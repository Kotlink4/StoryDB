using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using StoryDB.Api.Security;

namespace StoryDB.Api.Tests;

public sealed class CurrentUserServiceTests
{
    [Fact]
    public void UserId_ReturnsClaimValue_WhenAuthenticatedUserHasNumericId()
    {
        var service = CreateService(new Claim(ClaimTypes.NameIdentifier, "42"));

        Assert.Equal(42, service.UserId);
        Assert.True(service.IsAuthenticated);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-number")]
    public void UserId_ReturnsNull_WhenClaimIsMissingOrInvalid(string claimValue)
    {
        var service = CreateService(new Claim(ClaimTypes.NameIdentifier, claimValue));

        Assert.Null(service.UserId);
    }

    [Fact]
    public void UserId_ReturnsNull_WhenHttpContextIsMissing()
    {
        var service = new CurrentUserService(new HttpContextAccessor());

        Assert.Null(service.UserId);
        Assert.False(service.IsAuthenticated);
    }

    private static CurrentUserService CreateService(params Claim[] claims)
    {
        var identity = new ClaimsIdentity(claims, "Test");
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity),
        };

        return new CurrentUserService(new HttpContextAccessor { HttpContext = context });
    }
}
