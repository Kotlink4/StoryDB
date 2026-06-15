using System.Net;
using System.Net.Http.Json;

namespace StoryDB.Api.IntegrationTests;

public class HealthEndpointTests(StoryDbApiFactory factory) : IClassFixture<StoryDbApiFactory>
{
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
        Assert.Contains("storydb_api_endpoint_requests_total{method=\"GET\",path=\"/health\"}", body);
        Assert.Contains("storydb_export_jobs{status=\"queued\"}", body);
    }

    private sealed record HealthResponse(string Status, string Database);

    private sealed record MetricsResponse(long TotalRequests, IReadOnlyList<EndpointMetricsResponse> Endpoints);

    private sealed record EndpointMetricsResponse(string Path, long TotalRequests);
}
