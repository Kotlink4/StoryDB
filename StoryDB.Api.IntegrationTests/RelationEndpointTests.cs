using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Contracts.Relations;

namespace StoryDB.Api.IntegrationTests;

public class RelationEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task SaveDefaultLayout_PersistsRelationsAllGraphKey()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var storyObject = await CreateObjectAsync(client, project.Id);

        var saveResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/relations/layout", new
        {
            items = new[]
            {
                new
                {
                    storyObjectId = storyObject.Id,
                    x = 120m,
                    y = 48m,
                    width = 180m,
                    height = 72m,
                    isPinned = true,
                },
            },
        });

        Assert.Equal(HttpStatusCode.OK, saveResponse.StatusCode);
        var savedLayout = await saveResponse.Content.ReadFromJsonAsync<RelationGraphLayoutDto>();
        Assert.NotNull(savedLayout);
        Assert.Equal("relations:all", savedLayout.GraphKey);

        var loadedLayout = await client.GetFromJsonAsync<RelationGraphLayoutDto>(
            $"/api/projects/{project.Id}/relations/layout");

        Assert.NotNull(loadedLayout);
        Assert.Equal("relations:all", loadedLayout.GraphKey);
        var item = Assert.Single(loadedLayout.Items);
        Assert.Equal(storyObject.Id, item.StoryObjectId);
        Assert.True(item.IsPinned);
    }

    [Fact]
    public async Task Layouts_WithDifferentGraphKeys_AreStoredSeparately()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var storyObject = await CreateObjectAsync(client, project.Id);

        var defaultSaveResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/relations/layout", new
        {
            graphKey = "relations:all",
            items = new[]
            {
                new
                {
                    storyObjectId = storyObject.Id,
                    x = 10m,
                    y = 20m,
                    width = 180m,
                    height = 72m,
                    isPinned = false,
                },
            },
        });
        Assert.Equal(HttpStatusCode.OK, defaultSaveResponse.StatusCode);

        var structureSaveResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/relations/layout", new
        {
            graphKey = "relations:structure",
            items = new[]
            {
                new
                {
                    storyObjectId = storyObject.Id,
                    x = 320m,
                    y = 160m,
                    width = 180m,
                    height = 72m,
                    isPinned = true,
                },
            },
        });
        Assert.Equal(HttpStatusCode.OK, structureSaveResponse.StatusCode);

        var defaultLayout = await client.GetFromJsonAsync<RelationGraphLayoutDto>(
            $"/api/projects/{project.Id}/relations/layout?graphKey={Uri.EscapeDataString("relations:all")}");
        var structureLayout = await client.GetFromJsonAsync<RelationGraphLayoutDto>(
            $"/api/projects/{project.Id}/relations/layout?graphKey={Uri.EscapeDataString("relations:structure")}");

        Assert.NotNull(defaultLayout);
        Assert.NotNull(structureLayout);
        Assert.Equal("relations:all", defaultLayout.GraphKey);
        Assert.Equal("relations:structure", structureLayout.GraphKey);
        Assert.Equal(10m, Assert.Single(defaultLayout.Items).X);
        var structureItem = Assert.Single(structureLayout.Items);
        Assert.Equal(320m, structureItem.X);
        Assert.True(structureItem.IsPinned);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var projectName = $"Relation Test Project {Guid.NewGuid():N}";
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
        return project;
    }

    private static async Task<StoryObjectDto> CreateObjectAsync(HttpClient client, int projectId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/objects", new
        {
            typeKey = "characters",
            name = "Relation Test Character",
            surname = (string?)null,
            surnameForm = (string?)null,
            description = (string?)null,
            age = (string?)null,
            role = (string?)null,
            imagePath = (string?)null,
            attributes = Array.Empty<object>(),
            hierarchySelections = Array.Empty<object>(),
            catalogSelections = Array.Empty<object>(),
            ownedItemIds = Array.Empty<int>(),
            ownerCharacterIds = Array.Empty<int>(),
            territoryPlaceIds = Array.Empty<int>(),
            ownerOrganizationIds = Array.Empty<int>(),
            parentObjectIds = Array.Empty<int>(),
            characterRelationships = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var storyObject = await response.Content.ReadFromJsonAsync<StoryObjectDto>();
        Assert.NotNull(storyObject);
        return storyObject;
    }
}
