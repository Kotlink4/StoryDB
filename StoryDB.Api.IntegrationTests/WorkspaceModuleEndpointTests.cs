using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Contracts.Hierarchy;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Contracts.Timelines;

namespace StoryDB.Api.IntegrationTests;

public class WorkspaceModuleEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task AttributeDefinitions_CreateReadAndUpdate()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var groupResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/attribute-definitions/groups", new
        {
            typeKey = "characters",
            name = "Core",
            iconKey = "heart",
        });
        Assert.Equal(HttpStatusCode.Created, groupResponse.StatusCode);

        var createResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/attribute-definitions", new
        {
            typeKey = "characters",
            name = "Power",
            dataType = "number",
            groupName = "Core",
            minValue = 0,
            maxValue = 100,
            unit = "pts",
            iconKey = "sword",
            options = Array.Empty<string>(),
        });
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<AttributeDefinitionDto>();
        Assert.NotNull(created);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/attribute-definitions/{created.Id}", new
        {
            typeKey = "characters",
            name = "Power Level",
            dataType = "number",
            groupName = "Core",
            minValue = 1,
            maxValue = 999,
            unit = "pts",
            iconKey = "sword",
            options = Array.Empty<string>(),
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var definitions = await client.GetFromJsonAsync<IReadOnlyList<AttributeDefinitionDto>>(
            $"/api/projects/{project.Id}/attribute-definitions?typeKey=characters");
        Assert.NotNull(definitions);
        Assert.Contains(definitions, definition =>
            definition.Id == created.Id &&
            definition.Name == "Power Level" &&
            definition.MaxValue == 999);
    }

    [Fact]
    public async Task HierarchyGroupsAndNodes_CreateReadAndUpdate()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var groupResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/hierarchies/groups", new
        {
            name = "Nobility",
        });
        Assert.Equal(HttpStatusCode.Created, groupResponse.StatusCode);
        var group = await groupResponse.Content.ReadFromJsonAsync<HierarchyGroupDto>();
        Assert.NotNull(group);

        var parentResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/hierarchies/groups/{group.Id}/nodes", new
        {
            name = "Duke",
            description = "High title",
            parentNodeIds = Array.Empty<int>(),
        });
        Assert.Equal(HttpStatusCode.Created, parentResponse.StatusCode);
        var parent = await parentResponse.Content.ReadFromJsonAsync<HierarchyNodeDto>();
        Assert.NotNull(parent);

        var childResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/hierarchies/groups/{group.Id}/nodes", new
        {
            name = "Count",
            description = "Lower title",
            parentNodeIds = new[] { parent.Id },
        });
        Assert.Equal(HttpStatusCode.Created, childResponse.StatusCode);
        var child = await childResponse.Content.ReadFromJsonAsync<HierarchyNodeDto>();
        Assert.NotNull(child);
        Assert.Contains(parent.Id, child.ParentNodeIds);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/hierarchies/groups/{group.Id}/nodes/{child.Id}", new
        {
            name = "Margrave",
            description = "Border title",
            parentNodeIds = new[] { parent.Id },
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var nodes = await client.GetFromJsonAsync<IReadOnlyList<HierarchyNodeDto>>(
            $"/api/projects/{project.Id}/hierarchies/groups/{group.Id}/nodes");
        Assert.NotNull(nodes);
        Assert.Contains(nodes, node => node.Id == child.Id && node.Name == "Margrave");
    }

    [Fact]
    public async Task TimelineEvents_CreateReadUpdateAndLink()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        var first = await CreateTimelineEventAsync(client, project.Id, "Founding", 100);
        var second = await CreateTimelineEventAsync(client, project.Id, "War", 200);

        var updateResponse = await client.PutAsJsonAsync($"/api/projects/{project.Id}/timeline/events/{first.Id}", new
        {
            title = "Founding of House",
            eventType = "point",
            parentEventId = (int?)null,
            description = "Updated",
            startLabel = "100",
            endLabel = (string?)null,
            startValue = 100m,
            endValue = (decimal?)null,
            category = "politics",
            color = "#ffffff",
            imagePath = (string?)null,
            participants = Array.Empty<object>(),
            changes = Array.Empty<object>(),
        });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var linkResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/timeline/links", new
        {
            sourceEventId = first.Id,
            targetEventId = second.Id,
            linkType = "causes",
            description = "Leads to war",
        });
        Assert.Equal(HttpStatusCode.OK, linkResponse.StatusCode);

        var events = await client.GetFromJsonAsync<IReadOnlyList<TimelineEventDto>>(
            $"/api/projects/{project.Id}/timeline/events");
        var links = await client.GetFromJsonAsync<IReadOnlyList<TimelineEventLinkDto>>(
            $"/api/projects/{project.Id}/timeline/links");
        Assert.NotNull(events);
        Assert.NotNull(links);
        Assert.Contains(events, item => item.Id == first.Id && item.Title == "Founding of House");
        Assert.Contains(links, item => item.SourceEventId == first.Id && item.TargetEventId == second.Id);
    }

    [Fact]
    public async Task TimelineLayout_AfterEventMutation_ReturnsStaleCachedState()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);

        await CreateTimelineEventAsync(client, project.Id, "Founding", 100);
        var generateResponse = await client.PostAsync($"/api/projects/{project.Id}/timeline/layout/generate", null);
        Assert.Equal(HttpStatusCode.OK, generateResponse.StatusCode);

        var generatedLayout = await generateResponse.Content.ReadFromJsonAsync<TimelineLayoutDto>();
        Assert.NotNull(generatedLayout);
        Assert.False(generatedLayout.IsStale);

        var cachedLayout = await client.GetFromJsonAsync<TimelineLayoutDto>(
            $"/api/projects/{project.Id}/timeline/layout");
        Assert.NotNull(cachedLayout);
        Assert.False(cachedLayout.IsStale);

        await CreateTimelineEventAsync(client, project.Id, "War", 200);

        var staleLayout = await client.GetFromJsonAsync<TimelineLayoutDto>(
            $"/api/projects/{project.Id}/timeline/layout");
        Assert.NotNull(staleLayout);
        Assert.True(staleLayout.IsStale);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Workspace Module Test Project {Guid.NewGuid():N}",
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations", "hierarchy" },
            presetKeys = Array.Empty<string>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var project = await response.Content.ReadFromJsonAsync<ProjectListItemDto>();
        Assert.NotNull(project);
        return project;
    }

    private static async Task<TimelineEventDto> CreateTimelineEventAsync(
        HttpClient client,
        int projectId,
        string title,
        decimal startValue)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/timeline/events", new
        {
            title,
            eventType = "point",
            parentEventId = (int?)null,
            description = (string?)null,
            startLabel = startValue.ToString(),
            endLabel = (string?)null,
            startValue,
            endValue = (decimal?)null,
            category = (string?)null,
            color = (string?)null,
            imagePath = (string?)null,
            participants = Array.Empty<object>(),
            changes = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var timelineEvent = await response.Content.ReadFromJsonAsync<TimelineEventDto>();
        Assert.NotNull(timelineEvent);
        return timelineEvent;
    }
}
