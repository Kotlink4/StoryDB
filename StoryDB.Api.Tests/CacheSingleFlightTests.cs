using Microsoft.Extensions.Caching.Memory;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Tests;

public class CacheSingleFlightTests
{
    [Fact]
    public async Task GetOrCreateAsync_ConcurrentMisses_RunFactoryOnceAndRecordWaits()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var cache = new CacheSingleFlight(memoryCache);
        var factoryRuns = 0;
        var releaseFactory = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        async Task<string> CreateValue(ICacheEntry entry)
        {
            Interlocked.Increment(ref factoryRuns);
            await releaseFactory.Task;
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return "cached-value";
        }

        var first = cache.GetOrCreateAsync("graph:1", CreateValue);
        var second = cache.GetOrCreateAsync("graph:1", CreateValue);
        releaseFactory.SetResult();

        var values = await Task.WhenAll(first, second);
        var stats = cache.GetStats();

        Assert.Equal(["cached-value", "cached-value"], values);
        Assert.Equal(1, factoryRuns);
        Assert.Equal(1, stats.FactoryRuns);
        Assert.Equal(2, stats.Misses);
        Assert.Equal(1, stats.Hits);
        Assert.Equal(1, stats.Waits);
        Assert.Equal(0, stats.FactoryFailures);
        Assert.Equal(1, stats.ActiveKeys);
    }

    [Fact]
    public async Task Remove_RecordsRemovalAndAllowsRefill()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var cache = new CacheSingleFlight(memoryCache);
        var factoryRuns = 0;

        Task<int> CreateValue(ICacheEntry entry)
        {
            Interlocked.Increment(ref factoryRuns);
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return Task.FromResult(factoryRuns);
        }

        var first = await cache.GetOrCreateAsync("objects:1", CreateValue);
        var second = await cache.GetOrCreateAsync("objects:1", CreateValue);
        cache.Remove("objects:1");
        var third = await cache.GetOrCreateAsync("objects:1", CreateValue);

        var stats = cache.GetStats();
        Assert.Equal(1, first);
        Assert.Equal(1, second);
        Assert.Equal(2, third);
        Assert.Equal(2, stats.FactoryRuns);
        Assert.Equal(1, stats.Hits);
        Assert.Equal(1, stats.Removals);
    }

    [Fact]
    public async Task RemoveByPrefix_RemovesOnlyMatchingTrackedKeys()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions());
        var cache = new CacheSingleFlight(memoryCache);
        var factoryRuns = 0;

        Task<int> CreateValue(ICacheEntry entry)
        {
            Interlocked.Increment(ref factoryRuns);
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return Task.FromResult(factoryRuns);
        }

        var firstStructure = await cache.GetOrCreateAsync("project:1:structure-detail:10", CreateValue);
        var secondStructure = await cache.GetOrCreateAsync("project:1:structure-detail:11", CreateValue);
        var otherProjectStructure = await cache.GetOrCreateAsync("project:2:structure-detail:10", CreateValue);

        var removed = cache.RemoveByPrefix("project:1:structure-detail:");
        var reloadedStructure = await cache.GetOrCreateAsync("project:1:structure-detail:10", CreateValue);
        var stillCachedOtherProject = await cache.GetOrCreateAsync("project:2:structure-detail:10", CreateValue);

        var stats = cache.GetStats();
        Assert.Equal(1, firstStructure);
        Assert.Equal(2, secondStructure);
        Assert.Equal(3, otherProjectStructure);
        Assert.Equal(2, removed);
        Assert.Equal(4, reloadedStructure);
        Assert.Equal(3, stillCachedOtherProject);
        Assert.Equal(4, stats.FactoryRuns);
        Assert.Equal(1, stats.Hits);
        Assert.Equal(2, stats.Removals);
        Assert.Equal(2, stats.ActiveKeys);
    }

    [Fact]
    public async Task GetOrCreateAsync_WithSizeLimitedCache_AssignsDefaultEntrySize()
    {
        using var memoryCache = new MemoryCache(new MemoryCacheOptions
        {
            SizeLimit = 1,
        });
        var cache = new CacheSingleFlight(memoryCache);

        var value = await cache.GetOrCreateAsync(
            "limited:1",
            entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
                return Task.FromResult("stored");
            });

        Assert.Equal("stored", value);
        Assert.Equal(1, cache.GetStats().FactoryRuns);
    }
}
