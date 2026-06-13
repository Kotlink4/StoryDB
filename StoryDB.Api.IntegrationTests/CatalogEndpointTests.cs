using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Controllers;

namespace StoryDB.Api.IntegrationTests;

public class CatalogEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task CreateCatalogEntry_WithFieldValue_ReturnsEntry()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var catalog = await CreateCatalogAsync(client, project.Id);
        var fieldGroup = await CreateFieldGroupAsync(client, project.Id, catalog.Id);
        var field = await CreateNumberFieldAsync(client, project.Id, catalog.Id, fieldGroup.Id);
        var entryGroup = await CreateEntryGroupAsync(client, project.Id, catalog.Id);

        var response = await client.PostAsJsonAsync($"/api/projects/{project.Id}/catalogs/{catalog.Id}/entries", new
        {
            name = "Fireball",
            description = "Burns a target.",
            imagePath = (string?)null,
            entryGroupId = entryGroup.Id,
            parentEntryIds = Array.Empty<int>(),
            fieldValues = new[]
            {
                new
                {
                    fieldDefinitionId = field.Id,
                    value = "7",
                    referencedEntryIds = Array.Empty<int>(),
                },
            },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var entry = await response.Content.ReadFromJsonAsync<CatalogEntryDto>();
        Assert.NotNull(entry);
        Assert.Equal("Fireball", entry.Name);
        Assert.Equal(entryGroup.Id, entry.EntryGroupId);

        var value = Assert.Single(entry.FieldValues);
        Assert.Equal(field.Id, value.FieldDefinitionId);
        Assert.Equal("7", value.Value);
        Assert.Empty(value.ReferencedEntryIds);
    }

    [Fact]
    public async Task CreateCatalogEntry_WithInvalidFieldValue_DoesNotPersistPartialEntry()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var catalog = await CreateCatalogAsync(client, project.Id);
        var field = await CreateNumberFieldAsync(client, project.Id, catalog.Id, fieldGroupId: null);

        var response = await client.PostAsJsonAsync($"/api/projects/{project.Id}/catalogs/{catalog.Id}/entries", new
        {
            name = "Overpowered spell",
            description = (string?)null,
            imagePath = (string?)null,
            entryGroupId = (int?)null,
            parentEntryIds = Array.Empty<int>(),
            fieldValues = new[]
            {
                new
                {
                    fieldDefinitionId = field.Id,
                    value = "999",
                    referencedEntryIds = Array.Empty<int>(),
                },
            },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var entries = await client.GetFromJsonAsync<IReadOnlyList<CatalogEntryDto>>(
            $"/api/projects/{project.Id}/catalogs/{catalog.Id}/entries");
        Assert.NotNull(entries);
        Assert.Empty(entries);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var projectName = $"Catalog Test Project {Guid.NewGuid():N}";
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

    private static async Task<CatalogDto> CreateCatalogAsync(HttpClient client, int projectId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs", new
        {
            name = $"Magic {Guid.NewGuid():N}",
            description = "Magic systems",
            supportsHierarchy = true,
            hierarchyMode = "entries",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var catalog = await response.Content.ReadFromJsonAsync<CatalogDto>();
        Assert.NotNull(catalog);
        return catalog;
    }

    private static async Task<CatalogFieldGroupDto> CreateFieldGroupAsync(
        HttpClient client,
        int projectId,
        int catalogId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs/{catalogId}/field-groups", new
        {
            name = "Basics",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var group = await response.Content.ReadFromJsonAsync<CatalogFieldGroupDto>();
        Assert.NotNull(group);
        return group;
    }

    private static async Task<CatalogFieldDefinitionDto> CreateNumberFieldAsync(
        HttpClient client,
        int projectId,
        int catalogId,
        int? fieldGroupId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs/{catalogId}/fields", new
        {
            name = "Power",
            dataType = "number",
            isRequired = true,
            fieldGroupId,
            minValue = 0,
            maxValue = 10,
            options = (IReadOnlyList<string>?)null,
            referenceCatalogId = (int?)null,
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var field = await response.Content.ReadFromJsonAsync<CatalogFieldDefinitionDto>();
        Assert.NotNull(field);
        return field;
    }

    private static async Task<CatalogEntryGroupDto> CreateEntryGroupAsync(
        HttpClient client,
        int projectId,
        int catalogId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs/{catalogId}/entry-groups", new
        {
            name = "Attack",
            parentGroupIds = Array.Empty<int>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var group = await response.Content.ReadFromJsonAsync<CatalogEntryGroupDto>();
        Assert.NotNull(group);
        return group;
    }
}
