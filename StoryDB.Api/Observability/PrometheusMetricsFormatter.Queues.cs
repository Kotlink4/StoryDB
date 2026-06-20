using System.Text;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Services.Caching;

namespace StoryDB.Api.Observability;

public static partial class PrometheusMetricsFormatter
{
    private static void AppendExportJobMetrics(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        ProjectExportQueueStatsDto exportJobs)
    {
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
    }

    private static void AppendAuditLogMetrics(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        AuditLogQueueStatsDto auditLogs)
    {
        AppendGauge(builder, emittedMetadata, "storydb_audit_log_queue_capacity", "Configured audit log queue capacity.", auditLogs.Capacity);
        AppendGauge(builder, emittedMetadata, "storydb_audit_log_queue_queued", "Audit log entries currently waiting in the background queue.", auditLogs.Queued);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_enqueued_total", "Total audit log entries accepted by the background queue.", auditLogs.Enqueued);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_processed_total", "Total audit log entries written by the background worker.", auditLogs.Processed);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_failed_total", "Total audit log entries that failed in the background worker.", auditLogs.Failed);
        AppendCounter(builder, emittedMetadata, "storydb_audit_log_queue_dropped_total", "Total audit log entries dropped because the background queue was full.", auditLogs.Dropped);
    }

    private static void AppendCacheMetrics(
        StringBuilder builder,
        ISet<string> emittedMetadata,
        CacheSingleFlightStatsDto cache)
    {
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_hits_total", "Total cache hits observed by the single-flight cache wrapper.", cache.Hits);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_misses_total", "Total cache misses observed by the single-flight cache wrapper.", cache.Misses);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_factory_runs_total", "Total cache factory executions started after a miss.", cache.FactoryRuns);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_factory_failures_total", "Total cache factory executions that failed.", cache.FactoryFailures);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_waits_total", "Total requests that waited for an in-flight cache factory for the same key.", cache.Waits);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_removals_total", "Total cache removals requested through the single-flight cache wrapper.", cache.Removals);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_evictions_total", "Total cache entries evicted from the single-flight cache wrapper.", cache.Evictions);
        AppendCounter(builder, emittedMetadata, "storydb_cache_singleflight_capacity_evictions_total", "Total cache entries evicted because the memory cache reached its configured size limit.", cache.CapacityEvictions);
        AppendGauge(builder, emittedMetadata, "storydb_cache_singleflight_active_keys", "Current number of active single-flight keys.", cache.ActiveKeys);
    }
}
