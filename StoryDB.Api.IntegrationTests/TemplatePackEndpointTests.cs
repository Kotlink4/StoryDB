using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Contracts.TemplatePacks;

namespace StoryDB.Api.IntegrationTests;

public class TemplatePackEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    private const int StructureNodeLayoutIdBase = 1_000_000_000;
    private const int CatalogEntryLayoutIdBase = 1_200_000_000;

    [Fact]
    public async Task PublicReadProject_IsVisibleButNotWritableToAnotherUser()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient);

        var updateResponse = await ownerClient.PutAsJsonAsync($"/api/projects/{project.Id}", new
        {
            name = project.Name,
            coverImagePath = project.CoverImagePath,
            enabledObjectTypeKeys = project.ObjectTypes.Select(type => type.Key).ToArray(),
            presetKeys = Array.Empty<string>(),
            templatePackIds = Array.Empty<int>(),
            visibility = "publicRead",
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var readerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(readerClient);
        var projects = await readerClient.GetFromJsonAsync<IReadOnlyList<ProjectListItemDto>>("/api/projects");
        Assert.NotNull(projects);
        var publicProject = Assert.Single(projects, currentProject => currentProject.Id == project.Id);
        Assert.False(publicProject.CanEdit);
        Assert.False(publicProject.CanManage);

        var writeResponse = await readerClient.PostAsJsonAsync($"/api/projects/{project.Id}/catalogs", new
        {
            name = "Reader catalog",
            description = "",
            supportsHierarchy = false,
            hierarchyMode = "entries",
        });
        Assert.Equal(HttpStatusCode.NotFound, writeResponse.StatusCode);
    }

    [Fact]
    public async Task PublicTemplatePack_CanBeFavoritedAndAppliedToNewProject()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var sourceProject = await CreateProjectAsync(ownerClient, ["character-basics", "world-catalogs"]);

        var createPackResponse = await ownerClient.PostAsJsonAsync("/api/template-packs/from-project", new
        {
            projectId = sourceProject.Id,
            name = $"Fantasy starter {Guid.NewGuid():N}",
            description = "Reusable catalogs and attributes",
            isPublic = true,
            options = new
            {
                includeAttributes = true,
                includeCatalogs = true,
                includeStructures = true,
            },
        });
        Assert.Equal(HttpStatusCode.Created, createPackResponse.StatusCode);
        var pack = await createPackResponse.Content.ReadFromJsonAsync<TemplatePackListItemDto>();
        Assert.NotNull(pack);
        Assert.True(pack.IsPublic);
        Assert.True(pack.Summary.AttributeCount > 0);
        Assert.True(pack.Summary.CatalogCount > 0);

        using var readerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(readerClient);
        var publicPacks = await readerClient.GetFromJsonAsync<IReadOnlyList<TemplatePackListItemDto>>(
            "/api/template-packs?scope=public");
        Assert.NotNull(publicPacks);
        Assert.Contains(publicPacks, currentPack => currentPack.Id == pack.Id);

        var favoriteResponse = await readerClient.PutAsJsonAsync($"/api/template-packs/{pack.Id}/favorite", new
        {
            isFavorite = true,
        });
        Assert.Equal(HttpStatusCode.OK, favoriteResponse.StatusCode);
        var favoritePack = await favoriteResponse.Content.ReadFromJsonAsync<TemplatePackListItemDto>();
        Assert.NotNull(favoritePack);
        Assert.True(favoritePack.IsFavorite);

        var targetProject = await CreateProjectAsync(readerClient, presetKeys: [], templatePackIds: [pack.Id]);
        var catalogs = await readerClient.GetFromJsonAsync<IReadOnlyList<CatalogDto>>(
            $"/api/projects/{targetProject.Id}/catalogs");
        Assert.NotNull(catalogs);
        Assert.Contains(catalogs, catalog => catalog.Name == "Расы");

        var attributes = await readerClient.GetFromJsonAsync<IReadOnlyList<AttributeDefinitionDto>>(
            $"/api/projects/{targetProject.Id}/attribute-definitions?typeKey=characters");
        Assert.NotNull(attributes);
        Assert.Contains(attributes, attribute => attribute.Name == "Раса");

        var existingProject = await CreateProjectAsync(readerClient);
        var applyResponse = await readerClient.PostAsync(
            $"/api/projects/{existingProject.Id}/template-packs/{pack.Id}/apply",
            content: null);
        Assert.Equal(HttpStatusCode.NoContent, applyResponse.StatusCode);

        var existingProjectCatalogs = await readerClient.GetFromJsonAsync<IReadOnlyList<CatalogDto>>(
            $"/api/projects/{existingProject.Id}/catalogs");
        Assert.NotNull(existingProjectCatalogs);
        Assert.Contains(existingProjectCatalogs, catalog => catalog.Name == "Расы");
    }

    [Fact]
    public async Task TemplatePack_UpdatePersistsMetadata()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var sourceProject = await CreateProjectAsync(client, ["character-basics"]);

        var createPackResponse = await client.PostAsJsonAsync("/api/template-packs/from-project", new
        {
            projectId = sourceProject.Id,
            name = $"Draft pack {Guid.NewGuid():N}",
            description = "Draft description",
            isPublic = false,
            options = new
            {
                includeAttributes = true,
                includeCatalogs = false,
                includeStructures = false,
            },
        });
        Assert.Equal(HttpStatusCode.Created, createPackResponse.StatusCode);
        var pack = await createPackResponse.Content.ReadFromJsonAsync<TemplatePackListItemDto>();
        Assert.NotNull(pack);

        var updateResponse = await client.PutAsJsonAsync($"/api/template-packs/{pack.Id}", new
        {
            name = "Published basics",
            description = "Updated description",
            isPublic = true,
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updatedPack = await updateResponse.Content.ReadFromJsonAsync<TemplatePackListItemDto>();
        Assert.NotNull(updatedPack);
        Assert.Equal("Published basics", updatedPack.Name);
        Assert.Equal("Updated description", updatedPack.Description);
        Assert.True(updatedPack.IsPublic);

        var packs = await client.GetFromJsonAsync<IReadOnlyList<TemplatePackListItemDto>>("/api/template-packs?scope=mine");
        Assert.NotNull(packs);
        var persistedPack = Assert.Single(packs, currentPack => currentPack.Id == pack.Id);
        Assert.Equal("Published basics", persistedPack.Name);
        Assert.Equal("Updated description", persistedPack.Description);
        Assert.True(persistedPack.IsPublic);
    }

    [Fact]
    public async Task TemplatePack_PreservesStructureCatalogLinks()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var sourceProject = await CreateProjectAsync(client, presetKeys: []);

        var catalogResponse = await client.PostAsJsonAsync($"/api/projects/{sourceProject.Id}/catalogs", new
        {
            name = "Расы",
            description = "Reusable race catalog",
            supportsHierarchy = true,
            hierarchyMode = "entries",
        });
        Assert.Equal(HttpStatusCode.Created, catalogResponse.StatusCode);
        var catalog = await catalogResponse.Content.ReadFromJsonAsync<CatalogDto>();
        Assert.NotNull(catalog);

        var groupResponse = await client.PostAsJsonAsync($"/api/projects/{sourceProject.Id}/catalogs/{catalog.Id}/entry-groups", new
        {
            name = "Естественные",
            parentGroupIds = Array.Empty<int>(),
        });
        Assert.Equal(HttpStatusCode.Created, groupResponse.StatusCode);
        var group = await groupResponse.Content.ReadFromJsonAsync<CatalogEntryGroupDto>();
        Assert.NotNull(group);

        var entryResponse = await client.PostAsJsonAsync($"/api/projects/{sourceProject.Id}/catalogs/{catalog.Id}/entries", new
        {
            name = "Эльфы",
            description = "Long-lived people",
            imagePath = (string?)null,
            entryGroupId = group.Id,
            parentEntryIds = Array.Empty<int>(),
            fieldValues = Array.Empty<object>(),
        });
        Assert.Equal(HttpStatusCode.Created, entryResponse.StatusCode);
        var entry = await entryResponse.Content.ReadFromJsonAsync<CatalogEntryDto>();
        Assert.NotNull(entry);

        var structureResponse = await client.PostAsJsonAsync($"/api/projects/{sourceProject.Id}/structures", new
        {
            name = "Классификация рас",
            description = "Race tree",
            ownerKind = "catalog",
            ownerId = catalog.Id,
            layoutKind = "tree",
            nodeBindingMode = "mixed",
            linkedCatalogId = catalog.Id,
            nodes = new[]
            {
                new
                {
                    clientId = "natural",
                    parentClientId = (string?)null,
                    linkedCatalogEntryId = (int?)null,
                    linkedCatalogEntryGroupId = (int?)group.Id,
                    name = "Естественные",
                    description = "Natural races",
                    nodeType = "branch",
                    color = "#22c55e",
                    iconKey = "leaf",
                    levelIndex = 0,
                    sortOrder = 10,
                },
                new
                {
                    clientId = "elves",
                    parentClientId = (string?)"natural",
                    linkedCatalogEntryId = (int?)entry.Id,
                    linkedCatalogEntryGroupId = (int?)null,
                    name = "Эльфы",
                    description = "Elf race node",
                    nodeType = "race",
                    color = "#34d399",
                    iconKey = "trees",
                    levelIndex = 1,
                    sortOrder = 20,
                },
            },
            edges = new[]
            {
                new
                {
                    sourceClientId = "natural",
                    targetClientId = "elves",
                    relationType = "раса",
                    description = (string?)null,
                    sortOrder = 10,
                },
            },
        });
        Assert.Equal(HttpStatusCode.Created, structureResponse.StatusCode);

        var createPackResponse = await client.PostAsJsonAsync("/api/template-packs/from-project", new
        {
            projectId = sourceProject.Id,
            name = $"Race structure pack {Guid.NewGuid():N}",
            description = "Catalog-linked structure",
            isPublic = false,
            options = new
            {
                includeAttributes = false,
                includeCatalogs = true,
                includeStructures = true,
            },
        });
        Assert.Equal(HttpStatusCode.Created, createPackResponse.StatusCode);
        var pack = await createPackResponse.Content.ReadFromJsonAsync<TemplatePackListItemDto>();
        Assert.NotNull(pack);
        Assert.Equal(1, pack.Summary.CatalogCount);
        Assert.Equal(1, pack.Summary.StructureCount);

        var targetProject = await CreateProjectAsync(client, presetKeys: [], templatePackIds: [pack.Id]);
        var targetCatalogs = await client.GetFromJsonAsync<IReadOnlyList<CatalogDto>>(
            $"/api/projects/{targetProject.Id}/catalogs");
        Assert.NotNull(targetCatalogs);
        var targetCatalog = Assert.Single(targetCatalogs, currentCatalog => currentCatalog.Name == "Расы");

        var structures = await client.GetFromJsonAsync<IReadOnlyList<StructureSummaryDto>>(
            $"/api/projects/{targetProject.Id}/structures");
        Assert.NotNull(structures);
        var structureSummary = Assert.Single(structures, structure => structure.Name == "Классификация рас");
        Assert.Equal(targetCatalog.Id, structureSummary.LinkedCatalogId);

        var structure = await client.GetFromJsonAsync<StructureDto>(
            $"/api/projects/{targetProject.Id}/structures/{structureSummary.Id}");
        Assert.NotNull(structure);
        Assert.Equal(targetCatalog.Id, structure.LinkedCatalogId);
        Assert.Contains(structure.Nodes, node => node.Name == "Естественные" && node.LinkedCatalogEntryGroupId is not null);
        var elfNode = Assert.Single(structure.Nodes, node => node.Name == "Эльфы" && node.LinkedCatalogEntryId is not null);

        var layoutResponse = await client.PutAsJsonAsync($"/api/projects/{targetProject.Id}/relations/layout", new
        {
            graphKey = $"structure:{structure.Id}",
            items = new[]
            {
                new
                {
                    storyObjectId = StructureNodeLayoutIdBase + elfNode.Id,
                    x = 120,
                    y = 180,
                    width = 230,
                    height = 76,
                    isPinned = true,
                },
                new
                {
                    storyObjectId = CatalogEntryLayoutIdBase + elfNode.LinkedCatalogEntryId!.Value,
                    x = 420,
                    y = 180,
                    width = 230,
                    height = 76,
                    isPinned = true,
                },
            },
        });
        Assert.Equal(HttpStatusCode.OK, layoutResponse.StatusCode);

        var savedLayout = await client.GetFromJsonAsync<RelationGraphLayoutDto>(
            $"/api/projects/{targetProject.Id}/relations/layout?graphKey=structure:{structure.Id}");
        Assert.NotNull(savedLayout);
        Assert.Equal(2, savedLayout.Items.Count);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(
        HttpClient client,
        IReadOnlyList<string>? presetKeys = null,
        IReadOnlyList<int>? templatePackIds = null)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Template Pack Test {Guid.NewGuid():N}",
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations" },
            presetKeys = presetKeys ?? [],
            templatePackIds = templatePackIds ?? [],
            visibility = "private",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var project = await response.Content.ReadFromJsonAsync<ProjectListItemDto>();
        Assert.NotNull(project);
        return project;
    }
}
