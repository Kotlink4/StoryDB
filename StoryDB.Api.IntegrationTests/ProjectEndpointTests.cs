using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Projects;

namespace StoryDB.Api.IntegrationTests;

public class ProjectEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task CreateProject_AsAuthenticatedUser_ReturnsProject()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);

        var projectName = $"Integration Project {Guid.NewGuid():N}";
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = projectName,
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations" },
            presetKeys = Array.Empty<string>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var project = await response.Content.ReadFromJsonAsync<ProjectListItemDto>();
        Assert.NotNull(project);
        Assert.True(project.Id > 0);
        Assert.Equal(projectName, project.Name);
        Assert.Equal(0, project.ObjectCount);
        Assert.Contains(project.ObjectTypes, objectType =>
            objectType.Key == "characters" && objectType.IsEnabled);
    }
}

