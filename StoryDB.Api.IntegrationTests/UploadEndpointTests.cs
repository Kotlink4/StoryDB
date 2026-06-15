using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Projects;

namespace StoryDB.Api.IntegrationTests;

public class UploadEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task UploadedFiles_WithoutSession_ReturnUnauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/uploads/global/images/2026/06/missing/gallery.webp");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProjectUploadedFiles_ForAnotherUsersProject_ReturnNotFound()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient);

        using var otherClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(otherClient);

        var response = await otherClient.GetAsync($"/uploads/projects/{project.Id}/images/2026/06/missing/gallery.webp");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UploadImage_ToAnotherUsersProject_ReturnsNotFound()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient);

        using var otherClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(otherClient);

        using var content = new MultipartFormDataContent();
        using var imageContent = new ByteArrayContent([0x89, 0x50, 0x4E, 0x47]);
        imageContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        content.Add(imageContent, "file", "tiny.png");

        var response = await otherClient.PostAsync($"/api/uploads/images?projectId={project.Id}", content);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Upload Test Project {Guid.NewGuid():N}",
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations" },
            presetKeys = Array.Empty<string>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var project = await response.Content.ReadFromJsonAsync<ProjectListItemDto>();
        Assert.NotNull(project);
        return project;
    }
}
