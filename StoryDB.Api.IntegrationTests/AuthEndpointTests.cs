using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Auth;

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
        var setCookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.Contains("StoryDB.Session=", setCookie);
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", setCookie, StringComparison.OrdinalIgnoreCase);
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

    [Fact]
    public async Task Login_WhenRepeatedTooOften_ReturnsTooManyRequests()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", $"203.0.113.{Random.Shared.Next(1, 254)}");

        HttpResponseMessage? lastResponse = null;
        for (var attempt = 0; attempt < 13; attempt++)
        {
            lastResponse = await client.PostAsJsonAsync("/api/auth/login", new
            {
                email = "missing@example.com",
                password = TestUserSession.Password,
            });
        }

        Assert.NotNull(lastResponse);
        Assert.Equal((HttpStatusCode)429, lastResponse.StatusCode);
    }

    [Fact]
    public async Task UnsafeRequest_WithUntrustedOrigin_ReturnsForbidden()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new
            {
                email = "missing@example.com",
                password = TestUserSession.Password,
            }),
        };
        request.Headers.Add("Origin", "https://evil.example");
        request.Headers.Add("X-Forwarded-For", $"198.51.100.{Random.Shared.Next(1, 254)}");

        using var client = factory.CreateClient();
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RequestBody_WhenTooLarge_ReturnsPayloadTooLarge()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = new StringContent(
                $"{{\"email\":\"missing@example.com\",\"password\":\"{new string('x', 2 * 1024 * 1024)}\"}}",
                System.Text.Encoding.UTF8,
                "application/json"),
        };
        request.Headers.Add("X-Forwarded-For", $"192.0.2.{Random.Shared.Next(1, 254)}");

        using var client = factory.CreateClient();
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }
}


