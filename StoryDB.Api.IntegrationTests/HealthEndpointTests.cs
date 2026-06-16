using System.Net;
using System.Net.Http.Json;

namespace StoryDB.Api.IntegrationTests;

public class HealthEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
    [Fact]
    public async Task Live_AsAnonymousUser_ReturnsAliveStatus()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<LiveResponse>();
        Assert.NotNull(payload);
        Assert.Equal("alive", payload.Status);
    }

    [Fact]
    public async Task Ready_AsAnonymousUser_ReturnsReadyStatus()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<ReadyResponse>();
        Assert.NotNull(payload);
        Assert.Equal("ready", payload.Status);
        Assert.Equal("available", payload.Database);
    }

    [Fact]
    public async Task Health_AsAnonymousUser_ReturnsHealthyStatus()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.NotNull(payload);
        Assert.Equal("healthy", payload.Status);
        Assert.Equal("available", payload.Database);
        Assert.NotNull(payload.AuditLogs);
        Assert.True(payload.AuditLogs.Capacity >= 100);
        Assert.NotNull(payload.Cache);
        Assert.True(payload.Cache.ActiveKeys >= 0);
    }

    [Fact]
    public async Task Metrics_AfterRequests_ReturnsRequestCounters()
    {
        using var client = factory.CreateClient();

        await client.GetAsync("/health");
        var response = await client.GetAsync("/metrics");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var payload = await response.Content.ReadFromJsonAsync<MetricsResponse>();
        Assert.NotNull(payload);
        Assert.True(payload.TotalRequests >= 1);
        Assert.True(payload.ActiveRequests >= 0);
        Assert.True(payload.TrackedEndpointCount >= 1);
        Assert.True(payload.MaxTrackedEndpoints >= payload.TrackedEndpointCount);
        Assert.Contains(payload.Endpoints, endpoint => endpoint.Path == "/health" && endpoint.TotalRequests >= 1);
    }

    [Fact]
    public async Task PrometheusMetrics_AfterRequests_ReturnsScrapeText()
    {
        using var client = factory.CreateClient();

        await client.GetAsync("/health");
        var response = await client.GetAsync("/metrics/prometheus");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("# TYPE storydb_api_requests_total counter", body);
        Assert.Contains("storydb_api_requests_total", body);
        Assert.Contains("storydb_api_active_requests", body);
        Assert.Contains("storydb_api_tracked_endpoints", body);
        Assert.Contains("storydb_api_endpoint_overflow_requests_total", body);
        Assert.Contains("storydb_api_endpoint_requests_total{method=\"GET\",path=\"/health\"}", body);
        Assert.Contains("storydb_process_gc_allocated_bytes_total", body);
        Assert.Contains("storydb_process_gc_collections_total{generation=\"0\"}", body);
        Assert.Contains("storydb_threadpool_worker_threads_used", body);
        Assert.Contains("storydb_threadpool_completion_port_threads_available", body);
        Assert.Contains("storydb_export_jobs{status=\"queued\"}", body);
        Assert.Contains("storydb_export_job_queue_capacity", body);
        Assert.Contains("storydb_export_job_enqueued_total", body);
        Assert.Contains("storydb_audit_log_queue_capacity", body);
        Assert.Contains("storydb_audit_log_queue_enqueued_total", body);
        Assert.Contains("storydb_audit_log_queue_dropped_total", body);
        Assert.Contains("storydb_cache_singleflight_hits_total", body);
        Assert.Contains("storydb_cache_singleflight_misses_total", body);
        Assert.Contains("storydb_cache_singleflight_waits_total", body);
        Assert.Contains("storydb_cache_singleflight_evictions_total", body);
        Assert.Contains("storydb_cache_singleflight_capacity_evictions_total", body);
    }

    [Fact]
    public async Task PrometheusMetrics_WithGzipAccepted_ReturnsCompressedResponse()
    {
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.AcceptEncoding.ParseAdd("gzip");

        var response = await client.GetAsync("/metrics/prometheus");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("gzip", response.Content.Headers.ContentEncoding);
    }

    private sealed record LiveResponse(string Status);

    private sealed record ReadyResponse(string Status, string Database);

    private sealed record HealthResponse(
        string Status,
        string Database,
        AuditLogQueueStatsResponse AuditLogs,
        CacheSingleFlightStatsResponse Cache);

    private sealed record AuditLogQueueStatsResponse(int Capacity);

    private sealed record CacheSingleFlightStatsResponse(int ActiveKeys);

    private sealed record MetricsResponse(
        long TotalRequests,
        long ActiveRequests,
        int TrackedEndpointCount,
        int MaxTrackedEndpoints,
        IReadOnlyList<EndpointMetricsResponse> Endpoints);

    private sealed record EndpointMetricsResponse(string Path, long TotalRequests);
}
