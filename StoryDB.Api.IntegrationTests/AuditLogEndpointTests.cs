using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Audit;
using StoryDB.Api.Contracts.Projects;

namespace StoryDB.Api.IntegrationTests;

public sealed class AuditLogEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task MutatingProjectRequest_WritesAuditLogAsynchronously()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var createCatalogResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/catalogs", new
        {
            name = $"Audit catalog {Guid.NewGuid():N}",
            description = "Audit smoke catalog",
            supportsHierarchy = false,
            hierarchyMode = "entries",
        });
        Assert.Equal(HttpStatusCode.Created, createCatalogResponse.StatusCode);

        AuditLogDto? auditLog = null;
        for (var attempt = 0; attempt < 40; attempt += 1)
        {
            await Task.Delay(100);
            var logs = await client.GetFromJsonAsync<IReadOnlyList<AuditLogDto>>(
                $"/api/projects/{project.Id}/audit-logs?limit=20");
            Assert.NotNull(logs);

            auditLog = logs.FirstOrDefault(log =>
                log.HttpMethod == HttpMethod.Post.Method &&
                log.Path == $"/api/projects/{project.Id}/catalogs" &&
                log.StatusCode == (int)HttpStatusCode.Created);
            if (auditLog is not null)
            {
                break;
            }
        }

        Assert.NotNull(auditLog);
        Assert.Equal(project.Id, auditLog.ProjectId);
        Assert.False(string.IsNullOrWhiteSpace(auditLog.TraceId));
        Assert.True(auditLog.DurationMs >= 0);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Audit Test Project {Guid.NewGuid():N}",
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
}
