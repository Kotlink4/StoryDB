using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;

namespace StoryDB.Api.IntegrationTests;

public class ObjectEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task ObjectCurrentStatus_RoundTripsThroughCreateGetAndUpdate()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var createResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/objects", new
        {
            typeKey = "characters",
            name = "Status Test Character",
            surname = (string?)null,
            surnameForm = (string?)null,
            description = (string?)null,
            age = "17",
            role = "Main character",
            currentStatus = "Training",
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

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var createdObject = await createResponse.Content.ReadFromJsonAsync<StoryObjectDto>();
        Assert.NotNull(createdObject);
        Assert.Equal("Training", createdObject.CurrentStatus);

        var loadedObject = await client.GetFromJsonAsync<StoryObjectDto>(
            $"/api/projects/{project.Id}/objects/{createdObject.Id}");
        Assert.NotNull(loadedObject);
        Assert.Equal("Training", loadedObject.CurrentStatus);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{createdObject.Id}", new
        {
            name = loadedObject.Name,
            surname = loadedObject.Surname,
            surnameForm = loadedObject.SurnameForm,
            description = loadedObject.Description,
            age = loadedObject.Age,
            role = loadedObject.Role,
            currentStatus = "Injured",
            imagePath = loadedObject.ImagePath,
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

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedObject = await updateResponse.Content.ReadFromJsonAsync<StoryObjectDto>();
        Assert.NotNull(updatedObject);
        Assert.Equal("Injured", updatedObject.CurrentStatus);

        var reloadedObject = await client.GetFromJsonAsync<StoryObjectDto>(
            $"/api/projects/{project.Id}/objects/{createdObject.Id}");
        Assert.NotNull(reloadedObject);
        Assert.Equal("Injured", reloadedObject.CurrentStatus);
    }

    [Fact]
    public async Task ObjectSummaries_ReturnLightListWhileObjectEndpointReturnsDetails()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var createdObject = await CreateObjectAsync(client, project.Id);

        var summaryJson = await client.GetStringAsync($"/api/projects/{project.Id}/objects/summaries?typeKey=characters");
        using var summaryDocument = JsonDocument.Parse(summaryJson);
        var summary = Assert.Single(summaryDocument.RootElement.EnumerateArray());

        Assert.Equal(createdObject.Id, summary.GetProperty("id").GetInt32());
        Assert.Equal("Summary Test Character", summary.GetProperty("name").GetString());
        Assert.True(summary.TryGetProperty("attributes", out _));
        Assert.False(summary.TryGetProperty("galleryImages", out _));
        Assert.False(summary.TryGetProperty("catalogSelections", out _));
        Assert.False(summary.TryGetProperty("outgoingCharacterRelationships", out _));

        var detailJson = await client.GetStringAsync($"/api/projects/{project.Id}/objects/{createdObject.Id}");
        using var detailDocument = JsonDocument.Parse(detailJson);
        Assert.True(detailDocument.RootElement.TryGetProperty("galleryImages", out _));
        Assert.True(detailDocument.RootElement.TryGetProperty("catalogSelections", out _));
        Assert.True(detailDocument.RootElement.TryGetProperty("outgoingCharacterRelationships", out _));
    }

    [Fact]
    public async Task ObjectSummaries_AfterObjectUpdate_ReturnFreshData()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var createdObject = await CreateObjectAsync(client, project.Id);

        var firstSummaries = await client.GetFromJsonAsync<IReadOnlyList<StoryObjectSummaryDto>>(
            $"/api/projects/{project.Id}/objects/summaries?typeKey=characters");
        Assert.NotNull(firstSummaries);
        Assert.Equal("Summary Test Character", Assert.Single(firstSummaries).Name);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{createdObject.Id}", new
        {
            name = "Updated Summary Character",
            surname = createdObject.Surname,
            surnameForm = createdObject.SurnameForm,
            description = createdObject.Description,
            age = createdObject.Age,
            role = createdObject.Role,
            currentStatus = "Resting",
            imagePath = createdObject.ImagePath,
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
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updatedSummaries = await client.GetFromJsonAsync<IReadOnlyList<StoryObjectSummaryDto>>(
            $"/api/projects/{project.Id}/objects/summaries?typeKey=characters");
        Assert.NotNull(updatedSummaries);
        var updatedSummary = Assert.Single(updatedSummaries);
        Assert.Equal("Updated Summary Character", updatedSummary.Name);
        Assert.Equal("Resting", updatedSummary.CurrentStatus);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Object Test Project {Guid.NewGuid():N}",
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
            name = "Summary Test Character",
            surname = "Crowell",
            surnameForm = (string?)null,
            description = "Object with enough data to need a detail endpoint.",
            age = "17",
            role = "Main character",
            currentStatus = "Active",
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
