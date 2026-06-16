using System.Globalization;
using System.Text;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Observability;

public static class PrometheusMetricsFormatter
{
    public static string Format(
        ApiMetricsSnapshot apiMetrics,
        ProjectExportQueueStatsDto exportJobs,
        AuditLogQueueStatsDto auditLogs,
        CacheSingleFlightStatsDto cache)
    {
        var builder = new StringBuilder();
        var emittedMetadata = new HashSet<string>(StringComparer.Ordinal);
        var uptimeSeconds = Math.Max(0, (apiMetrics.CapturedAt - apiMetrics.StartedAt).TotalSeconds);
        var gcInfo = GC.GetGCMemoryInfo();
        ThreadPool.GetAvailableThreads(out var availableWorkerThreads, out var availableCompletionPortThreads);
        ThreadPool.GetMaxThreads(out var maxWorkerThreads, out var maxCompletionPortThreads);
        var usedWorkerThreads = Math.Max(0, maxWorkerThreads - availableWorkerThreads);
        var usedCompletionPortThreads = Math.Max(0, maxCompletionPortThreads - availableCompletionPortThreads);

        AppendGauge(builder, emittedMetadata, "storydb_api_uptime_seconds", "StoryDB API process uptime in seconds.", uptimeSeconds);
        AppendCounter(builder, emittedMetadata, "storydb_api_requests_total", "Total observed HTTP requests.", apiMetrics.TotalRequests);
        AppendGauge(builder, emittedMetadata, "storydb_api_active_requests", "HTTP requests currently being processed.", apiMetrics.ActiveRequests);
        AppendCounter(builder, emittedMetadata, "storydb_api_failed_requests_total", "Total observed HTTP requests with 5xx status codes.", apiMetrics.FailedRequests);
        AppendCounter(builder, emittedMetadata, "storydb_api_slow_requests_total", "Total observed HTTP requests above the configured slow threshold.", apiMetrics.SlowRequests);
        AppendGauge(builder, emittedMetadata, "storydb_api_tracked_endpoints", "Current number of normalized endpoints tracked by in-process API metrics.", apiMetrics.TrackedEndpointCount);
        AppendGauge(builder, emittedMetadata, "storydb_api_max_tracked_endpoints", "Configured maximum number of normalized endpoints tracked before overflow aggregation.", apiMetrics.MaxTrackedEndpoints);
        AppendCounter(builder, emittedMetadata, "storydb_api_endpoint_overflow_requests_total", "Total requests aggregated into the endpoint overflow bucket after the tracked endpoint limit was reached.", apiMetrics.OverflowRequests);

        AppendGauge(builder, emittedMetadata, "storydb_process_managed_memory_bytes", "Managed memory currently reported by GC.GetTotalMemory.", GC.GetTotalMemory(forceFullCollection: false));
        AppendGauge(builder, emittedMetadata, "storydb_process_heap_size_bytes", "Managed heap size reported by the GC.", gcInfo.HeapSizeBytes);
        AppendGauge(builder, emittedMetadata, "storydb_process_memory_load_bytes", "Current memory load reported by the GC.", gcInfo.MemoryLoadBytes);
        AppendGauge(builder, emittedMetadata, "storydb_process_high_memory_threshold_bytes", "High memory load threshold reported by the GC.", gcInfo.HighMemoryLoadThresholdBytes);
        AppendGauge(builder, emittedMetadata, "storydb_process_gc_fragmented_bytes", "Fragmented managed heap bytes reported by the GC.", gcInfo.FragmentedBytes);
        AppendCounter(builder, emittedMetadata, "storydb_process_gc_allocated_bytes_total", "Total allocated managed bytes reported by the GC.", GC.GetTotalAllocatedBytes(precise: false));
        for (var generation = 0; generation <= GC.MaxGeneration; generation += 1)
        {
            AppendCounter(
                builder,
                emittedMetadata,
                "storydb_process_gc_collections_total",
                "GC collections by generation since process start.",
                GC.CollectionCount(generation),
                ("generation", generation.ToString(CultureInfo.InvariantCulture)));
        }

        AppendGauge(builder, emittedMetadata, "storydb_threadpool_worker_threads_used", "Current used .NET thread pool worker threads.", usedWorkerThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_worker_threads_available", "Current available .NET thread pool worker threads.", availableWorkerThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_worker_threads_max", "Configured maximum .NET thread pool worker threads.", maxWorkerThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_completion_port_threads_used", "Current used .NET thread pool completion port threads.", usedCompletionPortThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_completion_port_threads_available", "Current available .NET thread pool completion port threads.", availableCompletionPortThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_completion_port_threads_max", "Configured maximum .NET thread pool completion port threads.", maxCompletionPortThreads);

        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Queued, ("status", "queued"));
        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Running, ("status", "running"));
        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Succeeded, ("status", "succeeded"));
        AppendGauge(builder, emittedMetadata, "storydb_export_jobs", "Export jobs by status.", exportJobs.Failed, ("status", "failed"));
        AppendGauge(builder, emittedMetadata, "storydb_export_job_queue_capacity", "Configured background export job queue capacity.", exportJobs.Capacity);
        AppendGauge(builder, emittedMetadata, "storydb_export_job_queue_depth", "Current background export jobs waiting in the in-memory queue.", exportJobs.QueueDepth);
        AppendGauge(builder, emittedMetadata, "storydb_export_job_retained_jobs", "Current retained export job states.", exportJobs.RetainedJobs);
        AppendCounter(builder, emittedMetadata, "storydb_export_job_enqueued_total", "Total background export jobs accepted into the queue.", exportJobs.EnqueuedTotal);
        AppendCounter(builder, emittedMetadata, "storydb_export_job_started_total", "Total background export jobs started by the worker.", exportJobs.StartedTotal);
        AppendCounter(builder, emittedMetadata, "storydb_export_job_completed_total", "Total background export jobs completed by the worker.", exportJobs.CompletedTotal);

        AppendGauge(builder, emittedMetadata, "storydb_audit_log_queue_capacity", "Configured audit log queue capacity.", auditLogs.Capacity);
        AppendGauge(builder, emittedMetadata, "storydb_audit_log_queue_queued", "Audit log entries currently waiting in the background queue.", auditLogs.Queued);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_enqueued_total", "Total audit log entries accepted by the background queue.", auditLogs.Enqueued);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_processed_total", "Total audit log entries written by the background worker.", auditLogs.Processed);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_failed_total", "Total audit log entries that failed in the background worker.", auditLogs.Failed);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_dropped_total", "Total audit log entries dropped because the background queue was full.", auditLogs.Dropped);

        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_hits_total", "Total cache hits observed by the single-flight cache wrapper.", cache.Hits);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_misses_total", "Total cache misses observed by the single-flight cache wrapper.", cache.Misses);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_factory_runs_total", "Total cache factory executions started after a miss.", cache.FactoryRuns);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_factory_failures_total", "Total cache factory executions that failed.", cache.FactoryFailures);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_waits_total", "Total requests that waited for an in-flight cache factory for the same key.", cache.Waits);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_removals_total", "Total cache removals requested through the single-flight cache wrapper.", cache.Removals);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_evictions_total", "Total cache entries evicted from the single-flight cache wrapper.", cache.Evictions);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_capacity_evictions_total", "Total cache entries evicted because the memory cache reached its configured size limit.", cache.CapacityEvictions);
        AppendGauge(builder, emittedMetadata, "storydb_cache_singleflight_active_keys", "Current number of active single-flight keys.", cache.ActiveKeys);

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
