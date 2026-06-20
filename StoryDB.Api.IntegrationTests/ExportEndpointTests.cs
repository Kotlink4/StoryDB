using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Xml.Linq;
using StoryDB.Api.Contracts.Catalogs;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;

namespace StoryDB.Api.IntegrationTests;

public sealed class ExportEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task DossierExport_ReturnsDocxWithSelectedObjectData()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var catalog = await CreateCatalogAsync(client, project.Id);
        var catalogEntry = await CreateCatalogEntryAsync(client, project.Id, catalog.Id);
        await CreateAttributeDefinitionAsync(client, project.Id);
        var selectedObject = await CreateObjectAsync(client, project.Id, "Лилия", "Ал Кроувел", catalog.Id, catalogEntry.Id);
        var excludedObject = await CreateObjectAsync(client, project.Id, "Руфус", "Гер Лион", catalog.Id, catalogEntry.Id);

        var response = await client.GetAsync($"/api/projects/{project.Id}/exports/dossiers.docx?objectIds={selectedObject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            response.Content.Headers.ContentType?.MediaType);
        Assert.Contains(".docx", response.Content.Headers.ContentDisposition?.FileNameStar ?? response.Content.Headers.ContentDisposition?.FileName);

        var documentText = ExtractDocxText(await response.Content.ReadAsByteArrayAsync());
        Assert.Contains(project.Name, documentText);
        Assert.Contains("Персонажи", documentText);
        Assert.Contains("Лилия Ал Кроувел", documentText);
        Assert.Contains("Главный герой", documentText);
        Assert.Contains("Активна", documentText);
        Assert.Contains("Сила", documentText);
        Assert.Contains("999", documentText);
        Assert.Contains("Раса", documentText);
        Assert.Contains("Эльф", documentText);
        Assert.DoesNotContain("Руфус Гер Лион", documentText);
        Assert.NotEqual(0, excludedObject.Id);
    }

    [Fact]
    public async Task DossierExport_UsesCurrentSnapshotInsteadOfLiveObjectData()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        await CreateAttributeDefinitionAsync(client, project.Id);
        var storyObject = await CreateObjectAsync(client, project.Id, "Сохраненная", "Версия", null, null);

        var publishResponse = await client.PostAsync($"/api/projects/{project.Id}/snapshot/publish", null);
        Assert.Equal(HttpStatusCode.OK, publishResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{storyObject.Id}", new
        {
            name = "Живая",
            surname = "Правка",
            surnameForm = storyObject.SurnameForm,
            description = "Это изменение не должно попасть в экспорт до нового snapshot.",
            age = storyObject.Age,
            role = "Новая роль",
            currentStatus = "Черновик",
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

        var response = await client.GetAsync($"/api/projects/{project.Id}/exports/dossiers.docx?objectIds={storyObject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var documentText = ExtractDocxText(await response.Content.ReadAsByteArrayAsync());
        Assert.Contains("Сохраненная Версия", documentText);
        Assert.Contains("Активна", documentText);
        Assert.DoesNotContain("Живая Правка", documentText);
        Assert.DoesNotContain("Черновик", documentText);
    }

    [Fact]
    public async Task DossierExport_PrivateProjectForAnotherUser_ReturnsNotFound()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient);
        await CreateAttributeDefinitionAsync(ownerClient, project.Id);
        var storyObject = await CreateObjectAsync(ownerClient, project.Id, "Закрытый", "Герой", null, null);

        using var otherClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(otherClient);
        var response = await otherClient.GetAsync($"/api/projects/{project.Id}/exports/dossiers.docx?objectIds={storyObject.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DossierExport_PublicReadProjectForAnotherUser_ReturnsDocx()
    {
        using var ownerClient = factory.CreateClient();
        await TestUserSession.RegisterAsync(ownerClient);
        var project = await CreateProjectAsync(ownerClient);
        await CreateAttributeDefinitionAsync(ownerClient, project.Id);
        var storyObject = await CreateObjectAsync(ownerClient, project.Id, "Публичный", "Герой", null, null);

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
        var response = await readerClient.GetAsync($"/api/projects/{project.Id}/exports/dossiers.docx?objectIds={storyObject.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var documentText = ExtractDocxText(await response.Content.ReadAsByteArrayAsync());
        Assert.Contains("Публичный Герой", documentText);
    }

    [Fact]
    public async Task DossierExportJob_CompletesAndReturnsDocx()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        await CreateAttributeDefinitionAsync(client, project.Id);
        var storyObject = await CreateObjectAsync(client, project.Id, "Фоновый", "Экспорт", null, null);

        var startResponse = await client.PostAsJsonAsync(
            $"/api/projects/{project.Id}/exports/dossiers/jobs",
            new ProjectDossierExportRequest([storyObject.Id]));

        Assert.Equal(HttpStatusCode.Accepted, startResponse.StatusCode);
        var job = await startResponse.Content.ReadFromJsonAsync<ProjectExportJobDto>();
        Assert.NotNull(job);
        Assert.Equal("queued", job.Status);

        ProjectExportJobDto? completedJob = null;
        for (var attempt = 0; attempt < 60; attempt += 1)
        {
            await Task.Delay(250);
            completedJob = await client.GetFromJsonAsync<ProjectExportJobDto>(
                $"/api/projects/{project.Id}/exports/dossiers/jobs/{job.Id}");
            if (completedJob?.Status is "succeeded" or "failed" or "invalid")
            {
                break;
            }
        }

        Assert.NotNull(completedJob);
        Assert.Equal("succeeded", completedJob.Status);

        var downloadResponse = await client.GetAsync(
            $"/api/projects/{project.Id}/exports/dossiers/jobs/{job.Id}/download");

        Assert.Equal(HttpStatusCode.OK, downloadResponse.StatusCode);
        var documentText = ExtractDocxText(await downloadResponse.Content.ReadAsByteArrayAsync());
        Assert.Contains("Фоновый Экспорт", documentText);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Export Test Project {Guid.NewGuid():N}",
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations" },
            presetKeys = Array.Empty<string>(),
            templatePackIds = Array.Empty<int>(),
            visibility = "private",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var project = await response.Content.ReadFromJsonAsync<ProjectListItemDto>();
        Assert.NotNull(project);
        return project;
    }

    private static async Task CreateAttributeDefinitionAsync(HttpClient client, int projectId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/attribute-definitions", new
        {
            typeKey = "characters",
            name = "Сила",
            groupName = "Основное",
            dataType = "number",
            unit = (string?)null,
            description = "Strength score",
            options = Array.Empty<string>(),
            minValue = 0,
            maxValue = 999,
            iconKey = "heart",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static async Task<CatalogDto> CreateCatalogAsync(HttpClient client, int projectId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs", new
        {
            name = "Раса",
            description = "Race catalog",
            supportsHierarchy = false,
            hierarchyMode = "entries",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var catalog = await response.Content.ReadFromJsonAsync<CatalogDto>();
        Assert.NotNull(catalog);
        return catalog;
    }

    private static async Task<CatalogEntryDto> CreateCatalogEntryAsync(HttpClient client, int projectId, int catalogId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/catalogs/{catalogId}/entries", new
        {
            name = "Эльф",
            description = "Race entry",
            imagePath = (string?)null,
            entryGroupId = (int?)null,
            fieldValues = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var entry = await response.Content.ReadFromJsonAsync<CatalogEntryDto>();
        Assert.NotNull(entry);
        return entry;
    }

    private static async Task<StoryObjectDto> CreateObjectAsync(
        HttpClient client,
        int projectId,
        string name,
        string surname,
        int? catalogId,
        int? catalogEntryId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/objects", new
        {
            typeKey = "characters",
            name,
            surname,
            surnameForm = (string?)null,
            description = "Персонаж для проверки экспорта.",
            age = "17",
            role = "Главный герой",
            currentStatus = "Активна",
            imagePath = (string?)null,
            attributes = new[]
            {
                new
                {
                    name = "Сила",
                    value = "999",
                },
            },
            hierarchySelections = Array.Empty<object>(),
            catalogSelections = catalogId is null || catalogEntryId is null
                ? Array.Empty<object>()
                :
                [
                    new
                    {
                        targetType = "entry",
                        catalogId = catalogId.Value,
                        catalogEntryGroupId = (int?)null,
                        catalogEntryId = catalogEntryId.Value,
                    },
                ],
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

    private static string ExtractDocxText(byte[] content)
    {
        using var stream = new MemoryStream(content);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        var documentEntry = archive.GetEntry("word/document.xml");
        Assert.NotNull(documentEntry);

        using var documentStream = documentEntry.Open();
        var document = XDocument.Load(documentStream);
        XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
        return string.Join("\n", document.Descendants(w + "t").Select(element => element.Value));
    }
}
