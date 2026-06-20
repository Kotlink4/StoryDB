using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.IntegrationTests;

public class ProjectSnapshotEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task PublishSnapshot_CreatesReadableCurrentSnapshot()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var storyObject = await CreateObjectAsync(client, project.Id);

        var missingSnapshot = await client.GetAsync($"/api/projects/{project.Id}/snapshot");
        Assert.Equal(HttpStatusCode.NotFound, missingSnapshot.StatusCode);

        var publishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);

        var publishedSnapshot = await publishResponse.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(publishedSnapshot);
        Assert.Equal(project.Id, publishedSnapshot.ProjectId);
        Assert.Equal(1, publishedSnapshot.Revision);
        Assert.Equal(1, publishedSnapshot.SchemaVersion);
        Assert.Equal("ready", publishedSnapshot.Status);
        Assert.Equal("current", publishedSnapshot.Scope);
        Assert.Equal(project.Id, publishedSnapshot.Data.Project.Id);
        Assert.Contains(publishedSnapshot.Data.ObjectTypes, objectType => objectType.Key == "characters");

        Assert.True(publishedSnapshot.Data.ObjectsByType.TryGetValue("characters", out var snapshotObjects));
        Assert.Contains(snapshotObjects, currentObject =>
            currentObject.Id == storyObject.Id &&
            currentObject.Name == "Snapshot Test Character" &&
            currentObject.CurrentStatus == "Published");

        var loadedSnapshot = await client.GetFromJsonAsync<ProjectSnapshotDto>($"/api/projects/{project.Id}/snapshot");
        Assert.NotNull(loadedSnapshot);
        Assert.Equal(publishedSnapshot.Id, loadedSnapshot.Id);
    }

    [Fact]
    public async Task MutatingProjectData_MarksCurrentSnapshotStaleUntilRepublished()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var storyObject = await CreateObjectAsync(client, project.Id);

        var firstPublishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, firstPublishResponse.StatusCode);
        var firstSnapshot = await firstPublishResponse.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(firstSnapshot);
        Assert.Equal("ready", firstSnapshot.Status);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{storyObject.Id}", new
        {
            name = "Updated Snapshot Character",
            surname = storyObject.Surname,
            surnameForm = storyObject.SurnameForm,
            description = storyObject.Description,
            age = storyObject.Age,
            role = storyObject.Role,
            currentStatus = "Changed after snapshot",
            imagePath = storyObject.ImagePath,
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

        var staleSnapshot = await client.GetFromJsonAsync<ProjectSnapshotDto>($"/api/projects/{project.Id}/snapshot");
        Assert.NotNull(staleSnapshot);
        Assert.Equal(firstSnapshot.Id, staleSnapshot.Id);
        Assert.Equal("stale", staleSnapshot.Status);
        Assert.Contains("objects", staleSnapshot.DirtySections);
        Assert.DoesNotContain(
            staleSnapshot.Data.ObjectsByType["characters"],
            currentObject => currentObject.Name == "Updated Snapshot Character");

        var secondPublishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, secondPublishResponse.StatusCode);
        var secondSnapshot = await secondPublishResponse.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(secondSnapshot);
        Assert.Equal("ready", secondSnapshot.Status);
        Assert.Empty(secondSnapshot.DirtySections);
        Assert.Equal(firstSnapshot.Revision + 1, secondSnapshot.Revision);
        Assert.Contains(
            secondSnapshot.Data.ObjectsByType["characters"],
            currentObject => currentObject.Name == "Updated Snapshot Character");
    }

    [Fact]
    public async Task RebuildSnapshotSections_RebuildsRequestedSectionsAndKeepsPreviousReadModelData()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var storyObject = await CreateObjectAsync(client, project.Id);

        var firstPublishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, firstPublishResponse.StatusCode);
        var firstSnapshot = await firstPublishResponse.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(firstSnapshot);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{storyObject.Id}", new
        {
            name = "Section Rebuilt Character",
            surname = storyObject.Surname,
            surnameForm = storyObject.SurnameForm,
            description = storyObject.Description,
            age = storyObject.Age,
            role = storyObject.Role,
            currentStatus = "Rebuilt",
            imagePath = storyObject.ImagePath,
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

        var rebuildResponse = await client.PostAsJsonAsync(
            $"/api/projects/{project.Id}/snapshot/rebuild",
            new ProjectSnapshotRebuildRequest([]));
        Assert.Equal(HttpStatusCode.OK, rebuildResponse.StatusCode);
        var rebuiltSnapshot = await rebuildResponse.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(rebuiltSnapshot);
        Assert.Equal("ready", rebuiltSnapshot.Status);
        Assert.Empty(rebuiltSnapshot.DirtySections);
        Assert.Equal(firstSnapshot.Revision + 1, rebuiltSnapshot.Revision);
        Assert.Contains(
            rebuiltSnapshot.Data.ObjectsByType["characters"],
            currentObject => currentObject.Name == "Section Rebuilt Character");
        Assert.Equal(
            JsonSerializer.Serialize(firstSnapshot.Data.Catalogs),
            JsonSerializer.Serialize(rebuiltSnapshot.Data.Catalogs));
        Assert.Equal(
            JsonSerializer.Serialize(firstSnapshot.Data.TimelineEvents),
            JsonSerializer.Serialize(rebuiltSnapshot.Data.TimelineEvents));
    }

    [Fact]
    public async Task RebuildSnapshotSections_WithUnknownSection_ReturnsBadRequest()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var response = await client.PostAsJsonAsync(
            $"/api/projects/{project.Id}/snapshot/rebuild",
            new ProjectSnapshotRebuildRequest(["objects", "unknown"]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PublishSnapshot_PrunesOldRevisionsPerScope()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        await CreateObjectAsync(client, project.Id);

        for (var index = 0; index < 7; index++)
        {
            var publishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
            Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);
        }

        for (var index = 0; index < 3; index++)
        {
            var publishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish-public", null);
            Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);
        }

        using var scope = factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
        var currentRevisions = dbContext.ProjectSnapshots
            .Where(snapshot => snapshot.ProjectId == project.Id && snapshot.Scope == ProjectSnapshotScope.Current)
            .OrderBy(snapshot => snapshot.Revision)
            .Select(snapshot => snapshot.Revision)
            .ToList();
        var publishedRevisions = dbContext.ProjectSnapshots
            .Where(snapshot => snapshot.ProjectId == project.Id && snapshot.Scope == ProjectSnapshotScope.Published)
            .OrderBy(snapshot => snapshot.Revision)
            .Select(snapshot => snapshot.Revision)
            .ToList();

        Assert.Equal([3, 4, 5, 6, 7], currentRevisions);
        Assert.Equal([10], publishedRevisions);
    }

    [Fact]
    public async Task PublishSnapshot_WhenBuildFails_PersistsFailedSnapshotWithError()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        await CreateCatalogWithSelectFieldAsync(client, project.Id);

        using (var scope = factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
            var field = dbContext.CatalogFieldDefinitions.Single();
            field.OptionsJson = "{broken";
            await dbContext.SaveChangesAsync();
        }

        var response = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var snapshot = await response.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(snapshot);
        Assert.Equal("failed", snapshot.Status);
        Assert.Contains("catalogs", snapshot.DirtySections);
        Assert.False(string.IsNullOrWhiteSpace(snapshot.Error));
        Assert.Equal(project.Id, snapshot.Data.Project.Id);

        var loadedSnapshot = await client.GetFromJsonAsync<ProjectSnapshotDto>($"/api/projects/{project.Id}/snapshot");
        Assert.NotNull(loadedSnapshot);
        Assert.Equal(snapshot.Id, loadedSnapshot.Id);
        Assert.Equal("failed", loadedSnapshot.Status);
    }

    [Fact]
    public async Task PublishedSnapshot_PublicReadProject_IsReadableAnonymouslyAndSeparatedFromCurrent()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient, "publicRead");
        var storyObject = await CreateObjectAsync(ownerClient, project.Id);

        var publishCurrentResponse = await ownerClient.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, publishCurrentResponse.StatusCode);

        var publishPublicResponse = await ownerClient.PostAsync($"/api/projects/{project.Id}/snapshot/publish-public", null);
        Assert.Equal(HttpStatusCode.OK, publishPublicResponse.StatusCode);
        var publicSnapshot = await publishPublicResponse.Content.ReadFromJsonAsync<ProjectSnapshotDto>();
        Assert.NotNull(publicSnapshot);
        Assert.Equal("published", publicSnapshot.Scope);
        Assert.Equal("ready", publicSnapshot.Status);

        using var anonymousClient = factory.CreateClient();
        var anonymousCurrentResponse = await anonymousClient.GetAsync($"/api/projects/{project.Id}/snapshot");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymousCurrentResponse.StatusCode);

        var anonymousPublishedSnapshot = await anonymousClient.GetFromJsonAsync<ProjectSnapshotDto>(
            $"/api/projects/{project.Id}/snapshot?scope=published");
        Assert.NotNull(anonymousPublishedSnapshot);
        Assert.Equal(publicSnapshot.Id, anonymousPublishedSnapshot.Id);
        Assert.Contains(
            anonymousPublishedSnapshot.Data.ObjectsByType["characters"],
            currentObject => currentObject.Id == storyObject.Id && currentObject.Name == "Snapshot Test Character");

        var updateResponse = await ownerClient.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{storyObject.Id}", new
        {
            name = "Live Change After Public Snapshot",
            surname = storyObject.Surname,
            surnameForm = storyObject.SurnameForm,
            description = storyObject.Description,
            age = storyObject.Age,
            role = storyObject.Role,
            currentStatus = "Changed after public snapshot",
            imagePath = storyObject.ImagePath,
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

        var stillPublishedSnapshot = await anonymousClient.GetFromJsonAsync<ProjectSnapshotDto>(
            $"/api/projects/{project.Id}/snapshot?scope=published");
        Assert.NotNull(stillPublishedSnapshot);
        Assert.Equal("ready", stillPublishedSnapshot.Status);
        Assert.DoesNotContain(
            stillPublishedSnapshot.Data.ObjectsByType["characters"],
            currentObject => currentObject.Name == "Live Change After Public Snapshot");

        var currentSnapshot = await ownerClient.GetFromJsonAsync<ProjectSnapshotDto>($"/api/projects/{project.Id}/snapshot");
        Assert.NotNull(currentSnapshot);
        Assert.Equal("stale", currentSnapshot.Status);
    }

    [Fact]
    public async Task PublishedSnapshot_PrivateProject_IsNotReadableAnonymously()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient);
        await CreateObjectAsync(ownerClient, project.Id);

        var publishPublicResponse = await ownerClient.PostAsync($"/api/projects/{project.Id}/snapshot/publish-public", null);
        Assert.Equal(HttpStatusCode.OK, publishPublicResponse.StatusCode);

        using var anonymousClient = factory.CreateClient();
        var response = await anonymousClient.GetAsync($"/api/projects/{project.Id}/snapshot?scope=published");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task CurrentSnapshot_PublicReadProjectForAnotherUser_ReturnsNotFound()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient, "publicRead");
        await CreateObjectAsync(ownerClient, project.Id);

        var publishCurrentResponse = await ownerClient.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, publishCurrentResponse.StatusCode);

        using var readerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(readerClient);
        var response = await readerClient.GetAsync($"/api/projects/{project.Id}/snapshot");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PublishPublicSnapshot_PublicEditProjectForAnotherUser_ReturnsNotFound()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient, "publicEdit");
        await CreateObjectAsync(ownerClient, project.Id);

        using var editorClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(editorClient);
        var response = await editorClient.PostAsync($"/api/projects/{project.Id}/snapshot/publish-public", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client, string? visibility = null)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Snapshot Test Project {Guid.NewGuid():N}",
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations" },
            presetKeys = Array.Empty<string>(),
            visibility,
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
            name = "Snapshot Test Character",
            surname = "Voss",
            surnameForm = (string?)null,
            description = "Object included in a saved read model.",
            age = "29",
            role = "Navigator",
            currentStatus = "Published",
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

    private static async Task CreateCatalogWithSelectFieldAsync(HttpClient client, int projectId)
    {
        var catalogResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs", new
        {
            name = $"Snapshot Catalog {Guid.NewGuid():N}",
            description = "Catalog used to exercise snapshot failures.",
            supportsHierarchy = false,
            hierarchyMode = "entries",
        });
        Assert.Equal(HttpStatusCode.Created, catalogResponse.StatusCode);
        var catalog = await catalogResponse.Content.ReadFromJsonAsync<Contracts.Catalogs.CatalogDto>();
        Assert.NotNull(catalog);

        var fieldResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs/{catalog.Id}/fields", new
        {
            name = "Kind",
            dataType = "select",
            isRequired = false,
            fieldGroupId = (int?)null,
            minValue = (decimal?)null,
            maxValue = (decimal?)null,
            options = new[] { "A", "B" },
            referenceCatalogId = (int?)null,
        });
        Assert.Equal(HttpStatusCode.Created, fieldResponse.StatusCode);
    }
}
