using System.Net;
using System.Net.Http.Json;

namespace StoryDB.Api.IntegrationTests;

internal static class TestUserSession
{
    public const string Password = "strong-password";

    public static string CreateEmail() => $"test-{Guid.NewGuid():N}@example.com";

    public static async Task RegisterAsync(HttpClient client, string? email = null)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = email ?? CreateEmail(),
            password = Password,
            displayName = "Test Author",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
