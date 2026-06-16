using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace StoryDB.Api.Services.Caching;

public sealed class CacheSingleFlight(IMemoryCache memoryCache) : ICacheSingleFlight
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> gates = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, byte> trackedKeys = new(StringComparer.Ordinal);
    private long hits;
    private long misses;
    private long factoryRuns;
    private long factoryFailures;
    private long waits;
    private long removals;
    private long evictions;
    private long capacityEvictions;

    public async Task<TValue> GetOrCreateAsync<TValue>(
        string key,
        Func<ICacheEntry, Task<TValue>> factory)
    {
        if (memoryCache.TryGetValue(key, out TValue? cachedValue) && cachedValue is not null)
        {
            Interlocked.Increment(ref hits);
            return cachedValue;
        }

        Interlocked.Increment(ref misses);
        var gate = gates.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        if (!gate.Wait(0))
        {
            Interlocked.Increment(ref waits);
            await gate.WaitAsync();
        }

        try
        {
            if (memoryCache.TryGetValue(key, out cachedValue) && cachedValue is not null)
            {
                Interlocked.Increment(ref hits);
                return cachedValue;
            }

            using var entry = memoryCache.CreateEntry(key);
            entry.Size ??= 1;
            entry.RegisterPostEvictionCallback((evictedKey, _, reason, _) =>
            {
                if (evictedKey is string removedKey)
                {
                    trackedKeys.TryRemove(removedKey, out _);
                }

                Interlocked.Increment(ref evictions);
                if (reason == EvictionReason.Capacity)
                {
                    Interlocked.Increment(ref capacityEvictions);
                }
            });
            Interlocked.Increment(ref factoryRuns);
            TValue value;
            try
            {
                value = await factory(entry);
            }
            catch
            {
                Interlocked.Increment(ref factoryFailures);
                throw;
            }

            entry.Value = value;
            trackedKeys[key] = 0;
            return value;
        }
        finally
        {
            gate.Release();
            if (gate.CurrentCount == 1)
            {
                gates.TryRemove(new KeyValuePair<string, SemaphoreSlim>(key, gate));
            }
        }
    }

    public void Remove(string key)
    {
        Interlocked.Increment(ref removals);
        trackedKeys.TryRemove(key, out _);
        memoryCache.Remove(key);
    }

    public int RemoveByPrefix(string keyPrefix)
    {
        var keys = trackedKeys.Keys
            .Where(key => key.StartsWith(keyPrefix, StringComparison.Ordinal))
            .ToArray();

        foreach (var key in keys)
        {
            trackedKeys.TryRemove(key, out _);
            memoryCache.Remove(key);
        }

        if (keys.Length > 0)
        {
            Interlocked.Add(ref removals, keys.Length);
        }

        return keys.Length;
    }

    public CacheSingleFlightStatsDto GetStats() =>
        new(
            Interlocked.Read(ref hits),
            Interlocked.Read(ref misses),
            Interlocked.Read(ref factoryRuns),
            Interlocked.Read(ref factoryFailures),
            Interlocked.Read(ref waits),
            Interlocked.Read(ref removals),
            Interlocked.Read(ref evictions),
            Interlocked.Read(ref capacityEvictions),
            trackedKeys.Count);
}
