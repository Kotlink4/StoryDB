using System.Text;

namespace StoryDB.Api.Observability;

public static partial class PrometheusMetricsFormatter
{
    private static void AppendApiMetrics(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        ApiMetricsSnapshot apiMetrics)
    {
        var uptimeSeconds = Math.Max(0, (apiMetrics.CapturedAt - apiMetrics.StartedAt).TotalSeconds);

        AppendGauge(
            builder,
            emittedMetadata,
            "storydb_api_uptime_seconds",
            "StoryDB API process uptime in seconds.",
            uptimeSeconds);
        AppendCounter(builder, emittedMetadata, "storydb_api_requests_total", "Total observed HTTP requests.", apiMetrics.TotalRequests);
        AppendGauge(builder, emittedMetadata, "storydb_api_active_requests", "HTTP requests currently being processed.", apiMetrics.ActiveRequests);
        AppendCounter(builder, emittedMetadata, "storydb_api_failed_requests_total", "Total observed HTTP requests with 5xx status codes.", apiMetrics.FailedRequests);
        AppendCounter(builder, emittedMetadata, "storydb_api_slow_requests_total", "Total observed HTTP requests above the configured slow threshold.", apiMetrics.SlowRequests);
        AppendGauge(builder, emittedMetadata, "storydb_api_tracked_endpoints", "Current number of normalized endpoints tracked by in-process API metrics.", apiMetrics.TrackedEndpointCount);
        AppendGauge(builder, emittedMetadata, "storydb_api_max_tracked_endpoints", "Configured maximum number of normalized endpoints tracked before overflow aggregation.", apiMetrics.MaxTrackedEndpoints);
        AppendCounter(builder, emittedMetadata, "storydb_api_endpoint_overflow_requests_total", "Total requests aggregated into the endpoint overflow bucket after the tracked endpoint limit was reached.", apiMetrics.OverflowRequests);
    }

    private static void AppendEndpointMetrics(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        ApiMetricsSnapshot apiMetrics)
    {
        foreach (var endpoint in apiMetrics.Endpoints)
        {
            var labels = new[] { ("method", endpoint.Method), ("path", endpoint.Path) };
            AppendCounter(builder, emittedMetadata, "storydb_api_endpoint_requests_total", "HTTP requests by normalized endpoint.", endpoint.TotalRequests, labels);
            AppendCounter(builder, emittedMetadata, "storydb_api_endpoint_failed_requests_total", "5xx HTTP requests by normalized endpoint.", endpoint.FailedRequests, labels);
            AppendCounter(builder, emittedMetadata, "storydb_api_endpoint_slow_requests_total", "Slow HTTP requests by normalized endpoint.", endpoint.SlowRequests, labels);
            AppendGauge(builder, emittedMetadata, "storydb_api_endpoint_elapsed_average_ms", "Average elapsed milliseconds by normalized endpoint.", endpoint.AverageElapsedMs, labels);
            AppendGauge(builder, emittedMetadata, "storydb_api_endpoint_elapsed_p95_ms", "Rolling p95 elapsed milliseconds by normalized endpoint.", endpoint.P95ElapsedMs, labels);
            AppendGauge(builder, emittedMetadata, "storydb_api_endpoint_elapsed_max_ms", "Maximum observed elapsed milliseconds by normalized endpoint.", endpoint.MaxElapsedMs, labels);
        }
    }
}
