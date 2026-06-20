using System.Globalization;
using System.Text;

namespace StoryDB.Api.Observability;

public static partial class PrometheusMetricsFormatter
{
    private static void AppendProcessMetrics(StringBuilder builder, ISet<string> emittedMetadata)
    {
        var gcInfo = GC.GetGCMemoryInfo();

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
    }

    private static void AppendThreadPoolMetrics(StringBuilder builder, ISet<string> emittedMetadata)
    {
        ThreadPool.GetAvailableThreads(out var availableWorkerThreads, out var availableCompletionPortThreads);
        ThreadPool.GetMaxThreads(out var maxWorkerThreads, out var maxCompletionPortThreads);
        var usedWorkerThreads = Math.Max(0, maxWorkerThreads - availableWorkerThreads);
        var usedCompletionPortThreads = Math.Max(0, maxCompletionPortThreads - availableCompletionPortThreads);

        AppendGauge(builder, emittedMetadata, "storydb_threadpool_worker_threads_used", "Current used .NET thread pool worker threads.", usedWorkerThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_worker_threads_available", "Current available .NET thread pool worker threads.", availableWorkerThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_worker_threads_max", "Configured maximum .NET thread pool worker threads.", maxWorkerThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_completion_port_threads_used", "Current used .NET thread pool completion port threads.", usedCompletionPortThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_completion_port_threads_available", "Current available .NET thread pool completion port threads.", availableCompletionPortThreads);
        AppendGauge(builder, emittedMetadata, "storydb_threadpool_completion_port_threads_max", "Configured maximum .NET thread pool completion port threads.", maxCompletionPortThreads);
    }
}
