namespace StoryDB.Api.Observability;

public interface IApiMetricsService
{
    void Record(HttpContext context, long elapsedMs, long slowRequestThresholdMs);

    ApiMetricsSnapshot GetSnapshot();
}

public sealed record ApiMetricsSnapshot(
    DateTimeOffset StartedAt,
    DateTimeOffset CapturedAt,
    long TotalRequests,
    long FailedRequests,
    long SlowRequests,
    IReadOnlyList<ApiEndpointMetricsSnapshot> Endpoints);

public sealed record ApiEndpointMetricsSnapshot(
    string Method,
    string Path,
    long TotalRequests,
    long FailedRequests,
    long SlowRequests,
    double AverageElapsedMs,
    long LastElapsedMs,
    long MaxElapsedMs,
    double P95ElapsedMs);
