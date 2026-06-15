using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Memory;

namespace StoryDB.Api.Services.Caching;

public sealed class CacheSingleFlight(IMemoryCache memoryCache) : ICacheSingleFlight
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> gates = new(StringComparer.Ordinal);

    public async Task<TValue> GetOrCreateAsync<TValue>(
        string key,
        Func<ICacheEntry, Task<TValue>> factory)
    {
        if (memoryCache.TryGetValue(key, out TValue? cachedValue) && cachedValue is not null)
        {
            return cachedValue;
        }

        var gate = gates.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            if (memoryCache.TryGetValue(key, out cachedValue) && cachedValue is not null)
            {
                return cachedValue;
            }

            using var entry = memoryCache.CreateEntry(key);
            var value = await factory(entry);
            entry.Value = value;
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

    public void Remove(string key) => memoryCache.Remove(key);
}
