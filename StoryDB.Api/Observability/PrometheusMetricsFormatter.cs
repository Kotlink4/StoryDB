using System.Globalization;
using System.Text;
using StoryDB.Api.Contracts.Exports;

namespace StoryDB.Api.Observability;

public static class PrometheusMetricsFormatter
{
    public static string Format(
        ApiMetricsSnapshot apiMetrics,
        ProjectExportQueueStatsDto exportJobs,
        AuditLogQueueStatsDto auditLogs)
    {
        var builder = new StringBuilder();
        var emittedMetadata = new HashSet<string>(StringComparer.Ordinal);
        var uptimeSeconds = Math.Max(0, (apiMetrics.CapturedAt - apiMetrics.StartedAt).TotalSeconds);
        var gcInfo = GC.GetGCMemoryInfo();

        AppendGauge(builder, emittedMetadata, "storydb_api_uptime_seconds", "StoryDB API process uptime in seconds.", uptimeSeconds);
        AppendCounter(builder, emittedMetadata, "storydb_api_requests_total", "Total observed HTTP requests.", apiMetrics.TotalRequests);
        AppendCounter(builder, emittedMetadata, "storydb_api_failed_requests_total", "Total observed HTTP requests with 5xx status codes.", apiMetrics.FailedRequests);
        AppendCounter(builder, emittedMetadata, "storydb_api_slow_requests_total", "Total observed HTTP requests above the configured slow threshold.", apiMetrics.SlowRequests);

        AppendGauge(builder, emittedMetadata, "storydb_process_managed_memory_bytes", "Managed memory currently reported by GC.GetTotalMemory.", GC.GetTotalMemory(forceFullCollection: false));
        AppendGauge(builder, emittedMetadata, "storydb_process_heap_size_bytes", "Managed heap size reported by the GC.", gcInfo.HeapSizeBytes);
        AppendGauge(builder, emittedMetadata, "storydb_process_memory_load_bytes", "Current memory load reported by the GC.", gcInfo.MemoryLoadBytes);
        AppendGauge(builder, emittedMetadata, "storydb_process_high_memory_threshold_bytes", "High memory load threshold reported by the GC.", gcInfo.HighMemoryLoadThresholdBytes);

        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Queued, ("status", "queued"));
        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Running, ("status", "running"));
        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Succeeded, ("status", "succeeded"));
        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Failed, ("status", "failed"));

        AppendGauge(builder, emittedMetadata, "storydb_audit_log_queue_capacity", "Configured audit log queue capacity.", auditLogs.Capacity);
        AppendGauge(builder, emittedMetadata, "storydb_audit_log_queue_queued", "Audit log entries currently waiting in the background queue.", auditLogs.Queued);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_enqueued_total", "Total audit log entries accepted by the background queue.", auditLogs.Enqueued);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_processed_total", "Total audit log entries written by the background worker.", auditLogs.Processed);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_failed_total", "Total audit log entries that failed in the background worker.", auditLogs.Failed);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_dropped_total", "Total audit log entries dropped because the background queue was full.", auditLogs.Dropped);

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

        return builder.ToString();
    }

    private static void AppendCounter(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        string name,
        string help,
        double value,
        params (string Key, string Value)[] labels)
    {
        AppendMetric(builder, emittedMetadata, name, "counter", help, value, labels);
    }

    private static void AppendGauge(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        string name,
        string help,
        double value,
        params (string Key, string Value)[] labels)
    {
        AppendMetric(builder, emittedMetadata, name, "gauge", help, value, labels);
    }

    private static void AppendMetric(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        string name,
        string type,
        string help,
        double value,
        IReadOnlyList<(string Key, string Value)> labels)
    {
        if (emittedMetadata.Add(name))
        {
            builder.Append("# HELP ").Append(name).Append(' ').AppendLine(help);
            builder.Append("# TYPE ").Append(name).Append(' ').AppendLine(type);
        }

        builder.Append(name);
        if (labels.Count > 0)
        {
            builder.Append('{');
            for (var index = 0; index < labels.Count; index += 1)
            {
                if (index > 0)
                {
                    builder.Append(',');
                }

                builder
                    .Append(labels[index].Key)
                    .Append("=\"")
                    .Append(EscapeLabelValue(labels[index].Value))
                    .Append('"');
            }

            builder.Append('}');
        }

        builder.Append(' ')
            .AppendLine(value.ToString("0.###", CultureInfo.InvariantCulture));
    }

    private static string EscapeLabelValue(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal);
}
