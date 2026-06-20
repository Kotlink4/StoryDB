using System.Text;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Observability;

public static partial class PrometheusMetricsFormatter
{
    public static string Format(
        ApiMetricsSnapshot apiMetrics,
        ProjectExportQueueStatsDto exportJobs,
        AuditLogQueueStatsDto auditLogs,
        CacheSingleFlightStatsDto cache)
    {
        var builder = new StringBuilder();
        var emittedMetadata = new HashSet<string>(StringComparer.Ordinal);

        AppendApiMetrics(builder, emittedMetadata, apiMetrics);
        AppendProcessMetrics(builder, emittedMetadata);
        AppendThreadPoolMetrics(builder, emittedMetadata);
        AppendExportJobMetrics(builder, emittedMetadata, exportJobs);
        AppendAuditLogMetrics(builder, emittedMetadata, auditLogs);
        AppendCacheMetrics(builder, emittedMetadata, cache);
        AppendEndpointMetrics(builder, emittedMetadata, apiMetrics);

        return builder.ToString();
    }

}
