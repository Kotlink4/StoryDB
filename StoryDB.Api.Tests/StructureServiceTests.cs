using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Services.Structures;

namespace StoryDB.Api.Tests;

public sealed class StructureServiceTests
{
    [Fact]
    public async Task CreateStructureAsync_AllowsManualStructureWithoutCatalog()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var result = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: null,
                linkedCatalogId: null,
                nodeBindingMode: "none"));

        Assert.Equal(StructureServiceStatus.Success, result.Status);
        Assert.NotNull(result.Value);
        Assert.Equal("manual", result.Value.CatalogSyncMode);
        Assert.Null(result.Value.LinkedCatalogId);
    }

    [Fact]
    public async Task CreateStructureAsync_RejectsLinkedCatalog()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var catalog = await database.CreateRaceCatalogAsync();
        var service = database.CreateService();

        var result = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: catalog.Id,
                nodeBindingMode: "none"));

        Assert.Equal(StructureServiceStatus.Invalid, result.Status);
        Assert.Equal("Structures no longer support linked catalogs. Catalog entry scope applies to all project catalogs.", result.Error);
    }

    [Fact]
    public async Task CreateStructureAsync_RejectsCatalogNodeBindings()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var result = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest(
                        "node-a",
                        null,
                        100,
                        null,
                        "Legacy catalog-linked node",
                        null,
                        null,
                        null,
                        null,
                        0,
                        1),
                ]));

        Assert.Equal(StructureServiceStatus.Invalid, result.Status);
        Assert.Equal("Structure nodes no longer support catalog links. Store hierarchy data in structure nodes.", result.Error);
    }

    [Fact]
    public async Task CreateStructureAsync_AddsProjectUsageForAnyOwnerKind()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var catalog = await database.CreateRaceCatalogAsync();
        var service = database.CreateService();

        var structureResult = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                ownerKind: "catalog",
                ownerId: catalog.Id,
                applicationScope: "characters",
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest(
                        "node-a",
                        null,
                        null,
                        null,
                        "Elf",
                        null,
                        "race",
                        null,
                        null,
                        0,
                        0),
                ]));

        Assert.Equal(StructureServiceStatus.Success, structureResult.Status);
        var usageResult = await service.GetStructureUsagesAsync(
            database.ProjectId,
            "project",
            database.ProjectId,
            structureResult.Value!.Id);
        Assert.Equal(StructureServiceStatus.Success, usageResult.Status);
        var usage = Assert.Single(usageResult.Value!);

        var storyObjectId = await database.CreateStoryObjectAsync("Aria");
        var assignmentResult = await service.AssignObjectToStructureAsync(
            database.ProjectId,
            usage.Id,
            new StructureAssignmentRequest(
                structureResult.Value.Nodes.Single().Id,
                storyObjectId,
                "storyObject",
                storyObjectId,
                "race",
                null,
                0));

        Assert.Equal(StructureServiceStatus.Success, assignmentResult.Status);
        Assert.Equal("Elf", assignmentResult.Value!.StructureNodeName);
        Assert.Equal(storyObjectId, assignmentResult.Value.TargetId);
    }

    [Fact]
    public async Task CreateStructureAsync_RejectsSelfReferencingStructureEdge()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var result = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest(
                        "node-a",
                        null,
                        null,
                        null,
                        "Root",
                        null,
                        null,
                        null,
                        null,
                        0,
                        0),
                ],
                edges:
                [
                    new StructureEdgeRequest("node-a", "node-a", "same", null, 0),
                ]));

        Assert.Equal(StructureServiceStatus.Invalid, result.Status);
        Assert.Equal("Structure edge cannot connect a node to itself.", result.Error);
    }

    [Fact]
    public async Task UpdateStructureNodeDetailsAsync_AllowsDossierEditWhenStructureHasAssignments()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var structureResult = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest(
                        "node-a",
                        null,
                        null,
                        null,
                        "Old rank",
                        "Old description",
                        "rank",
                        "#64748b",
                        "crown",
                        0,
                        0),
                ]));
        Assert.Equal(StructureServiceStatus.Success, structureResult.Status);

        var nodeId = structureResult.Value!.Nodes.Single().Id;
        var storyObjectId = await database.CreateStoryObjectAsync("Aria");
        var usageResult = await service.GetStructureUsagesAsync(
            database.ProjectId,
            "project",
            database.ProjectId,
            structureResult.Value.Id);
        Assert.Equal(StructureServiceStatus.Success, usageResult.Status);
        var usage = Assert.Single(usageResult.Value!);

        var assignmentResult = await service.AssignObjectToStructureAsync(
            database.ProjectId,
            usage.Id,
            new StructureAssignmentRequest(nodeId, storyObjectId, "storyObject", storyObjectId, "leader", null, 0));
        Assert.Equal(StructureServiceStatus.Success, assignmentResult.Status);

        var fullUpdate = await service.UpdateStructureAsync(
            database.ProjectId,
            structureResult.Value.Id,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest("node-a", null, null, null, "Blocked", null, null, null, null, 0, 0),
                ]));
        Assert.Equal(StructureServiceStatus.Invalid, fullUpdate.Status);

        var structureDetailsUpdate = await service.UpdateStructureDetailsAsync(
            database.ProjectId,
            structureResult.Value.Id,
            new StructureDetailsRequest("Renamed system", "Updated structure description"));
        Assert.Equal(StructureServiceStatus.Success, structureDetailsUpdate.Status);
        Assert.Equal("Renamed system", structureDetailsUpdate.Value!.Name);
        Assert.Equal("Updated structure description", structureDetailsUpdate.Value.Description);

        var nodeUpdate = await service.UpdateStructureNodeDetailsAsync(
            database.ProjectId,
            structureResult.Value.Id,
            nodeId,
            new StructureNodeDetailsRequest("New rank", "New description", "title", "#0ea5e9", "star"));

        Assert.Equal(StructureServiceStatus.Success, nodeUpdate.Status);
        Assert.Equal("New rank", nodeUpdate.Value!.Name);
        Assert.Equal("New description", nodeUpdate.Value.Description);
        Assert.Equal("title", nodeUpdate.Value.NodeType);
        Assert.Equal("#0ea5e9", nodeUpdate.Value.Color);
        Assert.Equal("star", nodeUpdate.Value.IconKey);
    }

    [Fact]
    public async Task StructureTopologyUpdateAndDelete_BlockTimelineReferences()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var structureResult = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest(
                        "node-a",
                        null,
                        null,
                        null,
                        "Council seat",
                        "A structure node used in a timeline.",
                        "seat",
                        "#64748b",
                        "crown",
                        0,
                        0),
                ]));
        Assert.Equal(StructureServiceStatus.Success, structureResult.Status);

        var nodeId = structureResult.Value!.Nodes.Single().Id;
        await database.CreateTimelineEventWithStructureReferencesAsync(structureResult.Value.Id, nodeId);

        var loadedStructure = await service.GetStructureAsync(database.ProjectId, structureResult.Value.Id);
        Assert.Equal(StructureServiceStatus.Success, loadedStructure.Status);
        Assert.Equal(2, loadedStructure.Value!.TimelineReferenceCount);

        var summaries = await service.GetStructuresAsync(database.ProjectId, null, null);
        Assert.Equal(StructureServiceStatus.Success, summaries.Status);
        Assert.Equal(2, summaries.Value!.Single().TimelineReferenceCount);

        var fullUpdate = await service.UpdateStructureAsync(
            database.ProjectId,
            structureResult.Value.Id,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest("node-b", null, null, null, "Replacement", null, null, null, null, 0, 0),
                ]));
        Assert.Equal(StructureServiceStatus.Invalid, fullUpdate.Status);
        Assert.Equal(
            "Structure is referenced by timeline events. Remove timeline references before editing the structure topology.",
            fullUpdate.Error);

        var delete = await service.DeleteStructureAsync(database.ProjectId, structureResult.Value.Id);
        Assert.Equal(StructureServiceStatus.Invalid, delete.Status);
        Assert.Equal("Structure is used by one or more targets and cannot be deleted.", delete.Error);

        var nodeUpdate = await service.UpdateStructureNodeDetailsAsync(
            database.ProjectId,
            structureResult.Value.Id,
            nodeId,
            new StructureNodeDetailsRequest("Renamed council seat", "Still used in timeline.", "seat", "#0ea5e9", "star"));
        Assert.Equal(StructureServiceStatus.Success, nodeUpdate.Status);
    }

    [Fact]
    public async Task DeleteStructureUsageAsync_BlocksTimelineReferences()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var structureResult = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none"));
        Assert.Equal(StructureServiceStatus.Success, structureResult.Status);

        var usageResult = await service.GetStructureUsagesAsync(
            database.ProjectId,
            "project",
            database.ProjectId,
            structureResult.Value!.Id);
        Assert.Equal(StructureServiceStatus.Success, usageResult.Status);
        var usage = Assert.Single(usageResult.Value!);

        await database.CreateTimelineTargetReferenceAsync("structureUsage", usage.Id, asChange: true);

        var delete = await service.DeleteStructureUsageAsync(database.ProjectId, usage.Id);
        Assert.Equal(StructureServiceStatus.Invalid, delete.Status);
        Assert.Equal("Structure usage is referenced by timeline events and cannot be disconnected.", delete.Error);
    }

    [Fact]
    public async Task StructureAssignmentUpdateAndDelete_BlockTimelineReferences()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var structureResult = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest("node-a", null, null, null, "House", null, "house", null, null, 0, 0),
                    new StructureNodeRequest("node-b", null, null, null, "Council", null, "seat", null, null, 0, 1),
                ]));
        Assert.Equal(StructureServiceStatus.Success, structureResult.Status);

        var firstNodeId = structureResult.Value!.Nodes.Single(node => node.Name == "House").Id;
        var secondNodeId = structureResult.Value.Nodes.Single(node => node.Name == "Council").Id;
        var storyObjectId = await database.CreateStoryObjectAsync("Aria");
        var usageResult = await service.GetStructureUsagesAsync(
            database.ProjectId,
            "project",
            database.ProjectId,
            structureResult.Value.Id);
        Assert.Equal(StructureServiceStatus.Success, usageResult.Status);
        var usage = Assert.Single(usageResult.Value!);

        var assignmentResult = await service.AssignObjectToStructureAsync(
            database.ProjectId,
            usage.Id,
            new StructureAssignmentRequest(firstNodeId, storyObjectId, "storyObject", storyObjectId, "member", null, 0));
        Assert.Equal(StructureServiceStatus.Success, assignmentResult.Status);

        await database.CreateTimelineTargetReferenceAsync("structureAssignment", assignmentResult.Value!.Id, asChange: false);

        var delete = await service.DeleteStructureAssignmentAsync(database.ProjectId, assignmentResult.Value.Id);
        Assert.Equal(StructureServiceStatus.Invalid, delete.Status);
        Assert.Equal("Structure assignment is referenced by timeline events and cannot be removed.", delete.Error);

        var retarget = await service.UpdateStructureAssignmentAsync(
            database.ProjectId,
            assignmentResult.Value.Id,
            new StructureAssignmentRequest(secondNodeId, storyObjectId, "storyObject", storyObjectId, "member", null, 0));
        Assert.Equal(StructureServiceStatus.Invalid, retarget.Status);
        Assert.Equal(
            "Structure assignment is referenced by timeline events. Remove timeline references before changing its target or node.",
            retarget.Error);

        var metadataUpdate = await service.UpdateStructureAssignmentAsync(
            database.ProjectId,
            assignmentResult.Value.Id,
            new StructureAssignmentRequest(firstNodeId, storyObjectId, "storyObject", storyObjectId, "heir", "Changed label only.", 1));
        Assert.Equal(StructureServiceStatus.Success, metadataUpdate.Status);
        Assert.Equal("heir", metadataUpdate.Value!.RoleLabel);
        Assert.Equal("Changed label only.", metadataUpdate.Value.Notes);
    }

    [Fact]
    public async Task StructureReferenceProtection_IsCaseInsensitiveForTimelineTargetType()
    {
        await using var database = await StructureTestDatabase.CreateAsync();
        var service = database.CreateService();

        var structureResult = await service.CreateStructureAsync(
            database.ProjectId,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest("node-a", null, null, null, "House", null, "house", null, null, 0, 0),
                ]));
        Assert.Equal(StructureServiceStatus.Success, structureResult.Status);

        var nodeId = structureResult.Value!.Nodes.Single().Id;
        await database.CreateTimelineTargetReferenceAsync("StructureNode", nodeId, asChange: false);

        var fullUpdate = await service.UpdateStructureAsync(
            database.ProjectId,
            structureResult.Value.Id,
            CreateStructureRequest(
                catalogSyncMode: "manual",
                linkedCatalogId: null,
                nodeBindingMode: "none",
                nodes:
                [
                    new StructureNodeRequest("node-b", null, null, null, "Replacement", null, null, null, null, 0, 0),
                ]));

        Assert.Equal(StructureServiceStatus.Invalid, fullUpdate.Status);
    }

    private static StructureRequest CreateStructureRequest(
        string? catalogSyncMode,
        int? linkedCatalogId,
        string nodeBindingMode,
        string ownerKind = "project",
        int? ownerId = null,
        string applicationScope = "characters",
        IReadOnlyList<StructureNodeRequest>? nodes = null,
        IReadOnlyList<StructureEdgeRequest>? edges = null) =>
        new(
            "Race system",
            "Reusable world structure.",
            ownerKind,
            ownerId,
            applicationScope,
            "tree",
            nodeBindingMode,
            catalogSyncMode,
            linkedCatalogId,
            nodes ?? [],
            edges ?? []);

    private sealed class RaceCatalogSeed(int id, int humanoidsGroupId, int elvesGroupId, int highElfEntryId)
    {
        public int Id { get; } = id;

        public int HumanoidsGroupId { get; } = humanoidsGroupId;

        public int ElvesGroupId { get; } = elvesGroupId;

        public int HighElfEntryId { get; } = highElfEntryId;
    }

    private sealed class StructureTestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection connection;

        private StructureTestDatabase(SqliteConnection connection, StoryDbContext context, int projectId)
        {
            this.connection = connection;
            Context = context;
            ProjectId = projectId;
        }

        public StoryDbContext Context { get; }

        public int ProjectId { get; }

        public static async Task<StructureTestDatabase> CreateAsync()
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var options = new DbContextOptionsBuilder<StoryDbContext>()
                .UseSqlite(connection)
                .Options;
            var context = new StoryDbContext(options);
            await context.Database.EnsureCreatedAsync();

            var now = DateTime.UtcNow;
            var user = new AppUser
            {
                DisplayName = "Tester",
                Email = "tester@example.test",
                NormalizedEmail = "TESTER@EXAMPLE.TEST",
                CreatedAt = now,
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var project = new Project
            {
                OwnerUserId = user.Id,
                Name = "Test project",
                CreatedAt = now,
                UpdatedAt = now,
            };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            return new StructureTestDatabase(connection, context, project.Id);
        }

        public StructureService CreateService()
        {
            var memoryCache = new MemoryCache(new MemoryCacheOptions());
            return new StructureService(Context, new CacheSingleFlight(memoryCache));
        }

        public async Task<RaceCatalogSeed> CreateRaceCatalogAsync()
        {
            var now = DateTime.UtcNow;
            var catalog = new Catalog
            {
                ProjectId = ProjectId,
                Key = "races",
                Name = "Races",
                SupportsHierarchy = true,
                HierarchyMode = "tree",
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.Catalogs.Add(catalog);
            await Context.SaveChangesAsync();

            var humanoids = new CatalogEntryGroup
            {
                CatalogId = catalog.Id,
                Name = "Humanoids",
                SortOrder = 0,
            };
            var elves = new CatalogEntryGroup
            {
                CatalogId = catalog.Id,
                Name = "Elves",
                SortOrder = 1,
            };
            Context.CatalogEntryGroups.AddRange(humanoids, elves);
            await Context.SaveChangesAsync();

            Context.CatalogEntryGroupHierarchyLinks.Add(new CatalogEntryGroupHierarchyLink
            {
                ParentGroupId = humanoids.Id,
                ChildGroupId = elves.Id,
            });

            var commonElf = new CatalogEntry
            {
                CatalogId = catalog.Id,
                EntryGroupId = elves.Id,
                Name = "Common elves",
                Description = "The parent race record.",
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            };
            var highElf = new CatalogEntry
            {
                CatalogId = catalog.Id,
                EntryGroupId = elves.Id,
                Name = "High elves",
                Description = "A child race record.",
                SortOrder = 1,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.CatalogEntries.AddRange(commonElf, highElf);
            await Context.SaveChangesAsync();

            Context.CatalogEntryHierarchyLinks.Add(new CatalogEntryHierarchyLink
            {
                ParentEntryId = commonElf.Id,
                ChildEntryId = highElf.Id,
            });
            await Context.SaveChangesAsync();

            return new RaceCatalogSeed(catalog.Id, humanoids.Id, elves.Id, highElf.Id);
        }

        public async Task<int> AddRaceEntryAsync(int groupId, string name, string description)
        {
            var now = DateTime.UtcNow;
            var entry = new CatalogEntry
            {
                CatalogId = await Context.CatalogEntryGroups
                    .Where(group => group.Id == groupId)
                    .Select(group => group.CatalogId)
                    .SingleAsync(),
                EntryGroupId = groupId,
                Name = name,
                Description = description,
                SortOrder = 2,
                CreatedAt = now,
                UpdatedAt = now,
            };

            Context.CatalogEntries.Add(entry);
            await Context.SaveChangesAsync();
            return entry.Id;
        }

        public async Task<int> CreateStoryObjectWithCatalogSelectionAsync(
            string name,
            int catalogId,
            string targetType,
            int? catalogEntryGroupId,
            int? catalogEntryId)
        {
            var storyObjectId = await CreateStoryObjectAsync(name);

            Context.StoryObjectCatalogSelections.Add(new StoryObjectCatalogSelection
            {
                StoryObjectId = storyObjectId,
                TargetType = targetType,
                CatalogId = catalogId,
                CatalogEntryGroupId = catalogEntryGroupId,
                CatalogEntryId = catalogEntryId,
                SortOrder = 0,
            });
            await Context.SaveChangesAsync();

            return storyObjectId;
        }

        public async Task<int> CreateStoryObjectAsync(string name)
        {
            var now = DateTime.UtcNow;
            var objectType = await Context.ObjectTypes.FirstOrDefaultAsync(type =>
                type.ProjectId == ProjectId &&
                type.Key == "characters");
            if (objectType is null)
            {
                objectType = new ObjectType
                {
                    ProjectId = ProjectId,
                    Key = "characters",
                    Name = "Characters",
                    SortOrder = 0,
                    IsEnabled = true,
                };
                Context.ObjectTypes.Add(objectType);
                await Context.SaveChangesAsync();
            }

            var storyObject = new StoryObject
            {
                ProjectId = ProjectId,
                ObjectTypeId = objectType.Id,
                Name = name,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.Objects.Add(storyObject);
            await Context.SaveChangesAsync();

            return storyObject.Id;
        }

        public async Task CreateTimelineEventWithStructureReferencesAsync(int structureId, int structureNodeId)
        {
            await CreateTimelineTargetReferenceAsync("structureNode", structureNodeId, asChange: false);
            await CreateTimelineTargetReferenceAsync("structure", structureId, asChange: true);
        }

        public async Task CreateTimelineTargetReferenceAsync(string targetType, int targetId, bool asChange)
        {
            var now = DateTime.UtcNow;
            var timeline = new Timeline
            {
                ProjectId = ProjectId,
                Name = $"World timeline {Guid.NewGuid():N}",
                Mode = "world",
                IsDefault = false,
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.Timelines.Add(timeline);
            await Context.SaveChangesAsync();

            var timelineEvent = new TimelineEvent
            {
                ProjectId = ProjectId,
                TimelineId = timeline.Id,
                Title = "Council founding",
                EventType = "point",
                StartLabel = "1",
                StartValue = 1,
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.TimelineEvents.Add(timelineEvent);
            await Context.SaveChangesAsync();

            if (asChange)
            {
                Context.TimelineChanges.Add(new TimelineChange
                {
                    TimelineEventId = timelineEvent.Id,
                    ChangeType = "structure-state",
                    TargetType = targetType,
                    TargetId = targetId,
                    FieldKey = "status",
                    FieldName = "Status",
                    NewValueJson = "\"active\"",
                    SortOrder = 0,
                });
            }
            else
            {
                Context.TimelineParticipants.Add(new TimelineParticipant
                {
                    TimelineEventId = timelineEvent.Id,
                    TargetType = targetType,
                    TargetId = targetId,
                    Role = "Affected target",
                    SortOrder = 0,
                });
            }

            await Context.SaveChangesAsync();
        }

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
