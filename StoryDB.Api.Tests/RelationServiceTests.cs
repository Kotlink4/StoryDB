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

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
