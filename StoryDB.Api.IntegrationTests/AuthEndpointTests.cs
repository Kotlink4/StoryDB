using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Controllers;

namespace StoryDB.Api.IntegrationTests;

public class AuthEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task GetCurrentUser_WithoutSession_ReturnsUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Register_CreatesUserAndReturnsCurrentUser()
    {
        using var client = factory.CreateClient();
        var email = TestUserSession.CreateEmail();

        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password = TestUserSession.Password,
            displayName = "Test Author",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<AuthUserDto>();
        Assert.NotNull(user);
        Assert.Equal(email, user.Email);
        Assert.Equal("Test Author", user.DisplayName);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsUser()
    {
        using var client = factory.CreateClient();
        var email = TestUserSession.CreateEmail();
        await TestUserSession.RegisterAsync(client, email);

        using var loginClient = factory.CreateClient();
        var response = await loginClient.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = TestUserSession.Password,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await response.Content.ReadFromJsonAsync<AuthUserDto>();
        Assert.NotNull(user);
        Assert.Equal(email, user.Email);
    }
}
