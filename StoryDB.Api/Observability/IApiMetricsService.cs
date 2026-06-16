namespace StoryDB.Api.Observability;

public interface IApiMetricsService
{
    void RequestStarted();

    void Record(HttpContext context, long elapsedMs, long slowRequestThresholdMs);

    ApiMetricsSnapshot GetSnapshot();
}

public sealed record ApiMetricsSnapshot(
    DateTimeOffset StartedAt,
    DateTimeOffset CapturedAt,
    long TotalRequests,
    long ActiveRequests,
    long FailedRequests,
    long SlowRequests,
    int TrackedEndpointCount,
    int MaxTrackedEndpoints,
    long OverflowRequests,
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
