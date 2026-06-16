using Microsoft.Extensions.Caching.Memory;

namespace StoryDB.Api.Services.Caching;

public interface ICacheSingleFlight
{
    Task<TValue> GetOrCreateAsync<TValue>(
        string key,
        Func<ICacheEntry, Task<TValue>> factory);

    void Remove(string key);

    int RemoveByPrefix(string keyPrefix);

    CacheSingleFlightStatsDto GetStats();
}

public sealed record CacheSingleFlightStatsDto(
    long Hits,
    long Misses,
    long FactoryRuns,
    long FactoryFailures,
    long Waits,
    long Removals,
    long Evictions,
    long CapacityEvictions,
    int ActiveKeys);
