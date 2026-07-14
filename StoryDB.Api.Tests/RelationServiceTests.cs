using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Services.Relations;

namespace StoryDB.Api.Tests;

public sealed class RelationServiceTests
{
    private const int StructureNodeLayoutIdBase = 1_000_000_000;
    private const int CatalogEntryAssignmentLayoutIdBase = 2_000_000_000;

    [Fact]
    public async Task SaveDefaultLayoutAsync_AcceptsStructureGraphModeKeys()
    {
        await using var database = await RelationTestDatabase.CreateAsync();
        var service = database.CreateService();
        var structure = await database.CreateStructureAsync();
        var node = structure.Nodes.Single();
        var graphKey = $"structure:{structure.Id}:all";
        var layoutNodeId = StructureNodeLayoutIdBase + node.Id;

        var result = await service.SaveDefaultLayoutAsync(
            database.ProjectId,
            new RelationGraphLayoutRequest(
                graphKey,
                [
                    new RelationGraphLayoutItemRequest(
                        layoutNodeId,
                        120,
                        80,
                        24,
                        48,
                        false),
                ]));

        Assert.Equal(RelationServiceStatus.Success, result.Status);
        Assert.NotNull(result.Value);
        Assert.Equal(graphKey, result.Value.GraphKey);
        Assert.Equal(layoutNodeId, result.Value.Items.Single().StoryObjectId);
    }

    [Fact]
    public async Task SaveDefaultLayoutAsync_AcceptsStructureAssignmentTargets()
    {
        await using var database = await RelationTestDatabase.CreateAsync();
        var service = database.CreateService();
        var structure = await database.CreateStructureAsync();
        var node = structure.Nodes.Single();
        var usage = await database.CreateProjectStructureUsageAsync(structure.Id);
        var storyObject = await database.CreateStoryObjectAsync("Aria");
        var catalogEntry = await database.CreateCatalogEntryAsync("Elf");
        await database.AssignStructureTargetAsync(usage.Id, node.Id, "storyObject", storyObject.Id, storyObject.Id);
        await database.AssignStructureTargetAsync(usage.Id, node.Id, "catalogEntry", catalogEntry.Id, null);
        var graphKey = $"structure:{structure.Id}:all";

        var result = await service.SaveDefaultLayoutAsync(
            database.ProjectId,
            new RelationGraphLayoutRequest(
                graphKey,
                [
                    new RelationGraphLayoutItemRequest(
                        storyObject.Id,
                        120,
                        80,
                        24,
                        48,
                        true),
                    new RelationGraphLayoutItemRequest(
                        CatalogEntryAssignmentLayoutIdBase + catalogEntry.Id,
                        140,
                        90,
                        240,
                        148,
                        false),
                ]));

        Assert.Equal(RelationServiceStatus.Success, result.Status);
        Assert.NotNull(result.Value);
        Assert.Equal(
            [storyObject.Id, CatalogEntryAssignmentLayoutIdBase + catalogEntry.Id],
            result.Value.Items.Select(item => item.StoryObjectId).Order().ToArray());
    }

    [Fact]
    public async Task SaveDefaultLayoutAsync_IgnoresStaleStructureAssignmentTargets()
    {
        await using var database = await RelationTestDatabase.CreateAsync();
        var service = database.CreateService();
        var structure = await database.CreateStructureAsync();
        var node = structure.Nodes.Single();
        var storyObject = await database.CreateStoryObjectAsync("Removed assignment");
        var graphKey = $"structure:{structure.Id}:all";
        var layoutNodeId = StructureNodeLayoutIdBase + node.Id;

        var result = await service.SaveDefaultLayoutAsync(
            database.ProjectId,
            new RelationGraphLayoutRequest(
                graphKey,
                [
                    new RelationGraphLayoutItemRequest(
                        layoutNodeId,
                        120,
                        80,
                        24,
                        48,
                        false),
                    new RelationGraphLayoutItemRequest(
                        storyObject.Id,
                        330,
                        120,
                        240,
                        148,
                        true),
                ]));

        Assert.Equal(RelationServiceStatus.Success, result.Status);
        Assert.NotNull(result.Value);
        Assert.Equal(layoutNodeId, Assert.Single(result.Value.Items).StoryObjectId);
    }

    [Fact]
    public async Task GetDefaultLayoutAsync_RemapsRecreatedStructureNodeItems()
    {
        await using var database = await RelationTestDatabase.CreateAsync();
        var service = database.CreateService();
        var structure = await database.CreateStructureAsync();
        var originalNode = structure.Nodes.Single();
        var graphKey = $"structure:{structure.Id}:all";
        var originalLayoutNodeId = StructureNodeLayoutIdBase + originalNode.Id;

        var saveResult = await service.SaveDefaultLayoutAsync(
            database.ProjectId,
            new RelationGraphLayoutRequest(
                graphKey,
                [
                    new RelationGraphLayoutItemRequest(
                        originalLayoutNodeId,
                        330,
                        120,
                        240,
                        148,
                        false),
                ]));
        Assert.Equal(RelationServiceStatus.Success, saveResult.Status);

        var now = DateTime.UtcNow;
        database.Context.StructureNodes.RemoveRange(database.Context.StructureNodes.Where(node => node.StructureId == structure.Id));
        await database.Context.SaveChangesAsync();
        var recreatedNode = new StructureNode
        {
            StructureId = structure.Id,
            Name = originalNode.Name,
            LevelIndex = originalNode.LevelIndex,
            SortOrder = originalNode.SortOrder,
            CreatedAt = now,
            UpdatedAt = now,
        };
        database.Context.StructureNodes.Add(recreatedNode);
        await database.Context.SaveChangesAsync();

        var result = await service.GetDefaultLayoutAsync(database.ProjectId, graphKey);

        Assert.Equal(RelationServiceStatus.Success, result.Status);
        Assert.NotNull(result.Value);
        var item = Assert.Single(result.Value.Items);
        Assert.Equal(StructureNodeLayoutIdBase + recreatedNode.Id, item.StoryObjectId);
        Assert.Equal(330, item.X);
        Assert.Equal(120, item.Y);
        Assert.True(result.Value.IsStale);
    }

    private sealed class RelationTestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection connection;

        private RelationTestDatabase(SqliteConnection connection, StoryDbContext context, int projectId)
        {
            this.connection = connection;
            Context = context;
            ProjectId = projectId;
        }

        public StoryDbContext Context { get; }

        public int ProjectId { get; }

        public static async Task<RelationTestDatabase> CreateAsync()
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
                Email = "relation-tester@example.test",
                NormalizedEmail = "RELATION-TESTER@EXAMPLE.TEST",
                CreatedAt = now,
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var project = new Project
            {
                OwnerUserId = user.Id,
                Name = "Relation test project",
                CreatedAt = now,
                UpdatedAt = now,
            };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            return new RelationTestDatabase(connection, context, project.Id);
        }

        public RelationService CreateService()
        {
            var memoryCache = new MemoryCache(new MemoryCacheOptions());
            return new RelationService(Context, new CacheSingleFlight(memoryCache));
        }

        public async Task<Structure> CreateStructureAsync()
        {
            var now = DateTime.UtcNow;
            var structure = new Structure
            {
                ProjectId = ProjectId,
                Name = "Race classification",
                OwnerKind = "global",
                ApplicationScope = "characters",
                LayoutKind = "tree",
                NodeBindingMode = "none",
                CatalogSyncMode = "manual",
                CreatedAt = now,
                UpdatedAt = now,
                Nodes =
                [
                    new StructureNode
                    {
                        Name = "Humanoids",
                        LevelIndex = 0,
                        SortOrder = 0,
                        CreatedAt = now,
                        UpdatedAt = now,
                    },
                ],
            };
            Context.Structures.Add(structure);
            await Context.SaveChangesAsync();
            return structure;
        }

        public async Task<StructureUsage> CreateProjectStructureUsageAsync(int structureId)
        {
            var now = DateTime.UtcNow;
            var usage = new StructureUsage
            {
                ProjectId = ProjectId,
                StructureId = structureId,
                TargetKind = "project",
                TargetId = ProjectId,
                DisplayName = "Project usage",
                IsPrimary = true,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.StructureUsages.Add(usage);
            await Context.SaveChangesAsync();
            return usage;
        }

        public async Task<StoryObject> CreateStoryObjectAsync(string name)
        {
            var now = DateTime.UtcNow;
            var objectType = new ObjectType
            {
                ProjectId = ProjectId,
                Key = "characters",
                Name = "Characters",
                SortOrder = 0,
                IsEnabled = true,
            };
            Context.ObjectTypes.Add(objectType);
            await Context.SaveChangesAsync();

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
            return storyObject;
        }

        public async Task<CatalogEntry> CreateCatalogEntryAsync(string name)
        {
            var now = DateTime.UtcNow;
            var catalog = new Catalog
            {
                ProjectId = ProjectId,
                Key = "races",
                Name = "Races",
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.Catalogs.Add(catalog);
            await Context.SaveChangesAsync();

            var entry = new CatalogEntry
            {
                CatalogId = catalog.Id,
                Name = name,
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            };
            Context.CatalogEntries.Add(entry);
            await Context.SaveChangesAsync();
            return entry;
        }

        public async Task AssignStructureTargetAsync(
            int usageId,
            int nodeId,
            string targetKind,
            int targetId,
            int? storyObjectId)
        {
            var now = DateTime.UtcNow;
            Context.StructureAssignments.Add(new StructureAssignment
            {
                ProjectId = ProjectId,
                StructureUsageId = usageId,
                StructureNodeId = nodeId,
                TargetKind = targetKind,
                TargetId = targetId,
                StoryObjectId = storyObjectId,
                SortOrder = 0,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await Context.SaveChangesAsync();
        }

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
