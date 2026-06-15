using System.Collections.Concurrent;
using System.Threading;

namespace StoryDB.Api.Observability;

public sealed class ApiMetricsService : IApiMetricsService
{
    private const int MaxTrackedEndpoints = 200;
    private const int MaxLatencySamplesPerEndpoint = 256;

    private readonly DateTimeOffset startedAt = DateTimeOffset.UtcNow;
    private readonly ConcurrentDictionary<string, EndpointMetrics> endpoints = new();
    private long totalRequests;
    private long failedRequests;
    private long slowRequests;

    public void Record(HttpContext context, long elapsedMs, long slowRequestThresholdMs)
    {
        var method = context.Request.Method.ToUpperInvariant();
        var path = NormalizePath(context.Request.Path.Value);
        var statusCode = context.Response.StatusCode;
        var isFailure = statusCode >= StatusCodes.Status500InternalServerError;
        var isSlow = elapsedMs >= slowRequestThresholdMs;

        Interlocked.Increment(ref totalRequests);
        if (isFailure)
        {
            Interlocked.Increment(ref failedRequests);
        }

        if (isSlow)
        {
            Interlocked.Increment(ref slowRequests);
        }

        if (endpoints.Count >= MaxTrackedEndpoints && !endpoints.ContainsKey($"{method} {path}"))
        {
            path = "/__other__";
        }

        var endpoint = endpoints.GetOrAdd($"{method} {path}", _ => new EndpointMetrics(method, path));
        endpoint.Record(elapsedMs, isFailure, isSlow);
    }

    public ApiMetricsSnapshot GetSnapshot()
    {
        var endpointSnapshots = endpoints.Values
            .Select(endpoint => endpoint.GetSnapshot())
            .OrderByDescending(endpoint => endpoint.TotalRequests)
            .ThenBy(endpoint => endpoint.Method)
            .ThenBy(endpoint => endpoint.Path)
            .ToList();

        return new ApiMetricsSnapshot(
            startedAt,
            DateTimeOffset.UtcNow,
            Interlocked.Read(ref totalRequests),
            Interlocked.Read(ref failedRequests),
            Interlocked.Read(ref slowRequests),
            endpointSnapshots);
    }

    private static string NormalizePath(string? rawPath)
    {
        if (string.IsNullOrWhiteSpace(rawPath))
        {
            return "/";
        }

        var segments = rawPath.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (segments.Length == 0)
        {
            return "/";
        }

        var normalized = segments.Select(segment =>
        {
            if (int.TryParse(segment, out _))
            {
                return "{id}";
            }

            return Guid.TryParse(segment, out _) ? "{guid}" : segment.ToLowerInvariant();
        });

        return "/" + string.Join('/', normalized);
    }

    private sealed class EndpointMetrics(string method, string path)
    {
        private readonly object syncRoot = new();
        private readonly long[] latencySamples = new long[MaxLatencySamplesPerEndpoint];
        private long totalRequests;
        private long failedRequests;
        private long slowRequests;
        private long totalElapsedMs;
        private long lastElapsedMs;
        private long maxElapsedMs;
        private int sampleCount;
        private int nextSampleIndex;

        public void Record(long elapsedMs, bool isFailure, bool isSlow)
        {
            lock (syncRoot)
            {
                totalRequests += 1;
                totalElapsedMs += elapsedMs;
                lastElapsedMs = elapsedMs;
                maxElapsedMs = Math.Max(maxElapsedMs, elapsedMs);

                if (isFailure)
                {
                    failedRequests += 1;
                }

                if (isSlow)
                {
                    slowRequests += 1;
                }

                latencySamples[nextSampleIndex] = elapsedMs;
                nextSampleIndex = (nextSampleIndex + 1) % latencySamples.Length;
                sampleCount = Math.Min(sampleCount + 1, latencySamples.Length);
            }
        }

        public ApiEndpointMetricsSnapshot GetSnapshot()
        {
            lock (syncRoot)
            {
                var samples = latencySamples.Take(sampleCount).OrderBy(value => value).ToArray();
                var p95 = samples.Length == 0
                    ? 0
                    : samples[Math.Min(samples.Length - 1, (int)Math.Ceiling(samples.Length * 0.95) - 1)];

                return new ApiEndpointMetricsSnapshot(
                    method,
                    path,
                    totalRequests,
                    failedRequests,
                    slowRequests,
                    totalRequests == 0 ? 0 : Math.Round((double)totalElapsedMs / totalRequests, 2),
                    lastElapsedMs,
                    maxElapsedMs,
                    p95);
            }
        }
    }
}
