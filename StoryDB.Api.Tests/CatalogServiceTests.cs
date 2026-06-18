using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Services.Catalogs;

namespace StoryDB.Api.Tests;

public sealed class CatalogServiceTests
{
    [Fact]
    public async Task EntryGroups_SupportMultipleLevelsAndRejectCycles()
    {
        await using var database = await CatalogTestDatabase.CreateAsync();
        var service = database.CreateService();

        var catalogResult = await service.CreateCatalogAsync(
            database.ProjectId,
            new CatalogDraft("Races", null, true, "groups"));
        Assert.Equal(CatalogServiceStatus.Success, catalogResult.Status);
        var catalogId = catalogResult.Value!.Id;

        var root = await service.CreateEntryGroupAsync(
            database.ProjectId,
            catalogId,
            new CatalogEntryGroupDraft("Humanoids", []));
        var child = await service.CreateEntryGroupAsync(
            database.ProjectId,
            catalogId,
            new CatalogEntryGroupDraft("Elves", [root.Value!.Id]));
        var leaf = await service.CreateEntryGroupAsync(
            database.ProjectId,
            catalogId,
            new CatalogEntryGroupDraft("High elves", [child.Value!.Id]));

        Assert.Equal(CatalogServiceStatus.Success, root.Status);
        Assert.Equal(CatalogServiceStatus.Success, child.Status);
        Assert.Equal(CatalogServiceStatus.Success, leaf.Status);
        Assert.Equal([root.Value!.Id], child.Value!.ParentLinks.Select(link => link.ParentGroupId));
        Assert.Equal([child.Value!.Id], leaf.Value!.ParentLinks.Select(link => link.ParentGroupId));

        var cycleAttempt = await service.UpdateEntryGroupAsync(
            database.ProjectId,
            catalogId,
            root.Value!.Id,
            new CatalogEntryGroupDraft("Humanoids", [leaf.Value!.Id]));

        Assert.Equal(CatalogServiceStatus.Invalid, cycleAttempt.Status);
        Assert.Equal("Catalog group hierarchy cannot contain cycles.", cycleAttempt.Error);

        var groups = await service.GetEntryGroupsAsync(database.ProjectId, catalogId);
        var reloadedRoot = groups.Value!.Single(group => group.Id == root.Value!.Id);
        Assert.Empty(reloadedRoot.ParentLinks);
    }

    private sealed class CatalogTestDatabase : IAsyncDisposable
    {
        private readonly SqliteConnection connection;

        private CatalogTestDatabase(SqliteConnection connection, StoryDbContext context, int projectId)
        {
            this.connection = connection;
            Context = context;
            ProjectId = projectId;
        }

        public StoryDbContext Context { get; }

        public int ProjectId { get; }

        public static async Task<CatalogTestDatabase> CreateAsync()
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
                Email = "catalog-tester@example.test",
                NormalizedEmail = "CATALOG-TESTER@EXAMPLE.TEST",
                CreatedAt = now,
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();

            var project = new Project
            {
                OwnerUserId = user.Id,
                Name = "Catalog test project",
                CreatedAt = now,
                UpdatedAt = now,
            };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            return new CatalogTestDatabase(connection, context, project.Id);
        }

        public CatalogService CreateService()
        {
            var memoryCache = new MemoryCache(new MemoryCacheOptions());
            return new CatalogService(Context, new CacheSingleFlight(memoryCache));
        }

        public async ValueTask DisposeAsync()
        {
            await Context.DisposeAsync();
            await connection.DisposeAsync();
        }
    }
}
