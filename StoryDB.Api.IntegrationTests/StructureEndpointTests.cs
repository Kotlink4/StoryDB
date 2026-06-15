using System.Net;
using System.Net.Http.Json;
using StoryDB.Api.Contracts.Objects;
using StoryDB.Api.Contracts.Projects;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Contracts.Timelines;

namespace StoryDB.Api.IntegrationTests;

public class StructureEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task AssignObjectToOrganizationStructure_AppearsInRelationGraph()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var organization = await CreateObjectAsync(client, project.Id, "organizations", "House Crowell");
        var character = await CreateObjectAsync(client, project.Id, "characters", "Lilia");
        var structure = await CreateStructureAsync(client, project.Id, organization.Id);

        var usageResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/structures/{structure.Id}/usages", new
        {
            targetKind = "object",
            targetId = organization.Id,
            displayName = "House hierarchy",
            notes = (string?)null,
            isPrimary = true,
        });
        Assert.Equal(HttpStatusCode.Created, usageResponse.StatusCode);
        var usage = await usageResponse.Content.ReadFromJsonAsync<StructureUsageDto>();
        Assert.NotNull(usage);

        var node = Assert.Single(structure.Nodes);
        var assignmentResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/structures/usages/{usage.Id}/assignments", new
        {
            structureNodeId = node.Id,
            storyObjectId = character.Id,
            roleLabel = "Heir",
            notes = (string?)null,
            sortOrder = 0,
        });
        Assert.Equal(HttpStatusCode.Created, assignmentResponse.StatusCode);
        var assignment = await assignmentResponse.Content.ReadFromJsonAsync<StructureAssignmentDto>();
        Assert.NotNull(assignment);
        Assert.Equal(character.Id, assignment.StoryObjectId);
        Assert.Equal(node.Id, assignment.StructureNodeId);

        var assignments = await client.GetFromJsonAsync<IReadOnlyList<StructureAssignmentDto>>(
            $"/api/projects/{project.Id}/structures/assignments?storyObjectId={character.Id}");
        Assert.NotNull(assignments);
        Assert.Contains(assignments, item =>
            item.StructureUsageId == usage.Id &&
            item.StructureNodeId == node.Id &&
            item.RoleLabel == "Heir");

        var graph = await client.GetFromJsonAsync<RelationGraphDto>($"/api/projects/{project.Id}/relations/graph");
        Assert.NotNull(graph);
        Assert.Contains(graph.Edges, edge =>
            edge.Category == "structure" &&
            edge.SourceId == character.Id &&
            edge.TargetId == organization.Id &&
            edge.RelationType == "Heir");
    }

    [Fact]
    public async Task UpdateLegacyOrganizationStructure_WithLevels_IsRejected()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var organization = await CreateObjectAsync(client, project.Id, "organizations", "House Crowell");

        var response = await client.PutAsJsonAsync($"/api/projects/{project.Id}/objects/{organization.Id}/structure", new
        {
            levels = new[]
            {
                new
                {
                    name = "Leadership",
                    description = (string?)null,
                    slots = new[]
                    {
                        new
                        {
                            name = "Head",
                            description = (string?)null,
                            slotType = (string?)null,
                            color = (string?)null,
                            iconKey = (string?)null,
                        },
                    },
                },
            },
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TimelineEvent_WithStructureAssignmentChange_IsAccepted()
    {
        using var client = factory.CreateClient();
        await TestUserSession.RegisterAsync(client);
        var project = await CreateProjectAsync(client);
        var organization = await CreateObjectAsync(client, project.Id, "organizations", "House Crowell");
        var character = await CreateObjectAsync(client, project.Id, "characters", "Lilia");
        var structure = await CreateStructureAsync(client, project.Id, organization.Id);

        var usageResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/structures/{structure.Id}/usages", new
        {
            targetKind = "object",
            targetId = organization.Id,
            displayName = "House hierarchy",
            notes = (string?)null,
            isPrimary = true,
        });
        Assert.Equal(HttpStatusCode.Created, usageResponse.StatusCode);
        var usage = await usageResponse.Content.ReadFromJsonAsync<StructureUsageDto>();
        Assert.NotNull(usage);

        var node = Assert.Single(structure.Nodes);
        var assignmentResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/structures/usages/{usage.Id}/assignments", new
        {
            structureNodeId = node.Id,
            storyObjectId = character.Id,
            roleLabel = "Heir",
            notes = (string?)null,
            sortOrder = 0,
        });
        Assert.Equal(HttpStatusCode.Created, assignmentResponse.StatusCode);
        var assignment = await assignmentResponse.Content.ReadFromJsonAsync<StructureAssignmentDto>();
        Assert.NotNull(assignment);

        var timelineResponse = await client.PostAsJsonAsync($"/api/projects/{project.Id}/timeline/events", new
        {
            title = "Lilia changes rank",
            eventType = "point",
            parentEventId = (int?)null,
            description = (string?)null,
            startLabel = "100",
            endLabel = (string?)null,
            startValue = 100m,
            endValue = (decimal?)null,
            category = (string?)null,
            color = (string?)null,
            imagePath = (string?)null,
            participants = Array.Empty<object>(),
            changes = new[]
            {
                new
                {
                    changeType = "structureAssignment",
                    targetType = "structureAssignment",
                    targetId = assignment.Id,
                    fieldKey = "roleLabel",
                    fieldName = "roleLabel",
                    oldValueJson = "\"Heir\"",
                    newValueJson = "\"Head\"",
                    effectiveFromLabel = "100",
                    effectiveToLabel = (string?)null,
                    effectiveFromValue = 100m,
                    effectiveToValue = (decimal?)null,
                    notes = (string?)null,
                },
            },
        });

        Assert.Equal(HttpStatusCode.Created, timelineResponse.StatusCode);
        var timelineEvent = await timelineResponse.Content.ReadFromJsonAsync<TimelineEventDto>();
        Assert.NotNull(timelineEvent);
        var change = Assert.Single(timelineEvent.Changes);
        Assert.Equal("structureAssignment", change.ChangeType);
        Assert.Equal("structureAssignment", change.TargetType);
        Assert.Equal(assignment.Id, change.TargetId);
    }

    private static async Task<ProjectListItemDto> CreateProjectAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/projects", new
        {
            name = $"Structure Test Project {Guid.NewGuid():N}",
            coverImagePath = (string?)null,
            enabledObjectTypeKeys = new[] { "characters", "items", "places", "organizations" },
            presetKeys = Array.Empty<string>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var project = await response.Content.ReadFromJsonAsync<ProjectListItemDto>();
        Assert.NotNull(project);
        return project;
    }

    private static async Task<StoryObjectDto> CreateObjectAsync(
        HttpClient client,
        int projectId,
        string typeKey,
        string name)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/objects", new
        {
            typeKey,
            name,
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

    private static async Task<StructureDto> CreateStructureAsync(HttpClient client, int projectId, int organizationId)
    {
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/structures", new
        {
            name = "Noble house ranks",
            description = (string?)null,
            ownerKind = "object",
            ownerId = organizationId,
            layoutKind = "levels",
            nodeBindingMode = "none",
            linkedCatalogId = (int?)null,
            nodes = new[]
            {
                new
                {
                    clientId = "leader",
                    parentClientId = (string?)null,
                    linkedCatalogEntryId = (int?)null,
                    linkedCatalogEntryGroupId = (int?)null,
                    name = "Leadership",
                    description = (string?)null,
                    nodeType = "rank",
                    color = (string?)null,
                    iconKey = (string?)null,
                    levelIndex = 0,
                    sortOrder = 0,
                },
            },
            edges = Array.Empty<object>(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var structure = await response.Content.ReadFromJsonAsync<StructureDto>();
        Assert.NotNull(structure);
        return structure;
    }
}
