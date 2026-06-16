using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Channels;
using StoryDB.Api.Contracts.Exports;

namespace StoryDB.Api.Services.Exports;

public sealed class ProjectExportJobService(
    IServiceScopeFactory scopeFactory,
    ILogger<ProjectExportJobService> logger,
    IConfiguration configuration)
    : IProjectExportJobService
{
    private readonly string exportJobsDirectory = Path.Combine(Path.GetTempPath(), "storydb-export-jobs");
    private readonly int maxRetainedJobs = Math.Max(10, configuration.GetValue("Exports:MaxRetainedJobs", 200));
    private readonly TimeSpan completedJobRetention = TimeSpan.FromMinutes(
        Math.Max(1, configuration.GetValue("Exports:CompletedJobRetentionMinutes", 30)));

    private readonly ConcurrentDictionary<Guid, ProjectExportJobState> jobs = new();
    private readonly Channel<Guid> queue = Channel.CreateBounded<Guid>(new BoundedChannelOptions(
        Math.Max(10, configuration.GetValue("Exports:JobQueueCapacity", 100)))
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false,
        });
    private readonly int queueCapacity = Math.Max(10, configuration.GetValue("Exports:JobQueueCapacity", 100));
    private long queueDepth;
    private long enqueuedTotal;
    private long startedTotal;
    private long completedTotal;

    public async Task<ProjectExportJobDto> EnqueueDossierExportAsync(
        int projectId,
        ProjectDossierExportRequest request,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(exportJobsDirectory);
        CleanupCompletedJobs();

        var job = new ProjectExportJobState(
            Guid.NewGuid(),
            projectId,
            "dossiers.docx",
            request,
            DateTimeOffset.UtcNow);

        jobs[job.Id] = job;
        Interlocked.Increment(ref queueDepth);
        try
        {
            await queue.Writer.WriteAsync(job.Id, cancellationToken);
            Interlocked.Increment(ref enqueuedTotal);
        }
        catch
        {
            Interlocked.Decrement(ref queueDepth);
            jobs.TryRemove(job.Id, out _);
            throw;
        }

        return ToDto(job);
    }

    public ProjectExportJobDto? GetJob(Guid jobId) =>
        jobs.TryGetValue(jobId, out var job) ? ToDto(job) : null;

    public ProjectExportServiceResult<ProjectCompletedExportFile> GetCompletedFile(Guid jobId)
    {
        if (!jobs.TryGetValue(jobId, out var job))
        {
            return ProjectExportServiceResult<ProjectCompletedExportFile>.NotFound();
        }

        if (job.Status == ProjectExportJobStatus.Invalid)
        {
            return ProjectExportServiceResult<ProjectCompletedExportFile>.Invalid(job.Error ?? "Export job failed.");
        }

        if (job.Status != ProjectExportJobStatus.Succeeded ||
            string.IsNullOrWhiteSpace(job.FilePath) ||
            !File.Exists(job.FilePath))
        {
            return ProjectExportServiceResult<ProjectCompletedExportFile>.Invalid(
                job.Status == ProjectExportJobStatus.Succeeded
                    ? "Export job result is no longer available."
                    : "Export job is not completed yet.");
        }

        return ProjectExportServiceResult<ProjectCompletedExportFile>.Success(
            new ProjectCompletedExportFile(
                job.FilePath,
                job.FileName ?? "storydb-export.docx",
                job.ContentType ?? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
    }

    public ProjectExportQueueStatsDto GetStats()
    {
        var snapshot = jobs.Values.ToArray();
        return new ProjectExportQueueStatsDto(
            queueCapacity,
            (int)Math.Max(0, Interlocked.Read(ref queueDepth)),
            snapshot.Length,
            Interlocked.Read(ref enqueuedTotal),
            Interlocked.Read(ref startedTotal),
            Interlocked.Read(ref completedTotal),
            snapshot.Count(job => job.Status == ProjectExportJobStatus.Queued),
            snapshot.Count(job => job.Status == ProjectExportJobStatus.Running),
            snapshot.Count(job => job.Status == ProjectExportJobStatus.Succeeded),
            snapshot.Count(job => job.Status is ProjectExportJobStatus.Failed or ProjectExportJobStatus.Invalid));
    }

    internal async Task ProcessQueueAsync(CancellationToken stoppingToken)
    {
        await foreach (var jobId in queue.Reader.ReadAllAsync(stoppingToken))
        {
            if (!jobs.TryGetValue(jobId, out var job))
            {
                continue;
            }

            Interlocked.Decrement(ref queueDepth);
            await RunJobAsync(job, stoppingToken);
            CleanupCompletedJobs();
        }
    }

    private async Task RunJobAsync(ProjectExportJobState job, CancellationToken stoppingToken)
    {
        Interlocked.Increment(ref startedTotal);
        job.Status = ProjectExportJobStatus.Running;
        job.StartedAt = DateTimeOffset.UtcNow;
        var startedAt = TimeProvider.System.GetTimestamp();

        try
        {
            using var scope = scopeFactory.CreateScope();
            var exportService = scope.ServiceProvider.GetRequiredService<IProjectExportService>();
            var result = await exportService.ExportDossiersAsync(job.ProjectId, job.Request, stoppingToken);

            job.CompletedAt = DateTimeOffset.UtcNow;
            job.Status = result.Status switch
            {
                ProjectExportServiceStatus.Success => ProjectExportJobStatus.Succeeded,
                ProjectExportServiceStatus.NotFound => ProjectExportJobStatus.Invalid,
                ProjectExportServiceStatus.Invalid => ProjectExportJobStatus.Invalid,
                _ => ProjectExportJobStatus.Failed,
            };
            if (result.Value is not null)
            {
                job.FileName = result.Value.FileName;
                job.ContentType = result.Value.ContentType;
                job.ContentLength = result.Value.Content.Length;
                job.FilePath = Path.Combine(exportJobsDirectory, $"{job.Id:N}.docx");
                await File.WriteAllBytesAsync(job.FilePath, result.Value.Content, stoppingToken);
            }
            job.Error = result.Status switch
            {
                ProjectExportServiceStatus.NotFound => "Export source was not found.",
                ProjectExportServiceStatus.Invalid => result.Error,
                ProjectExportServiceStatus.Success => null,
                _ => "Export job failed.",
            };

            logger.LogInformation(
                "Export job {ExportJobId} finished with status {ExportJobStatus} in {ElapsedMilliseconds} ms. ProjectId={ProjectId}, Kind={ExportKind}, ContentLength={ContentLength}",
                job.Id,
                job.Status,
                TimeProvider.System.GetElapsedTime(startedAt).TotalMilliseconds,
                job.ProjectId,
                job.Kind,
                job.ContentLength);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            job.CompletedAt = DateTimeOffset.UtcNow;
            job.Status = ProjectExportJobStatus.Failed;
            job.Error = "Export job was cancelled because the application is stopping.";
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to run export job {ExportJobId}", job.Id);
            job.CompletedAt = DateTimeOffset.UtcNow;
            job.Status = ProjectExportJobStatus.Failed;
            job.Error = "Export job failed.";
        }
        finally
        {
            Interlocked.Increment(ref completedTotal);
        }
    }

    internal void CleanupCompletedJobs()
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var job in jobs.Values)
        {
            if (jobs.Count <= maxRetainedJobs &&
                (job.CompletedAt is null || now - job.CompletedAt.Value < completedJobRetention))
            {
                continue;
            }

            if (job.Status is ProjectExportJobStatus.Queued or ProjectExportJobStatus.Running)
            {
                continue;
            }

            if (jobs.TryRemove(job.Id, out var removedJob) &&
                !string.IsNullOrWhiteSpace(removedJob.FilePath) &&
                File.Exists(removedJob.FilePath))
            {
                File.Delete(removedJob.FilePath);
            }
        }
    }

    private static ProjectExportJobDto ToDto(ProjectExportJobState job) =>
        new(
            job.Id,
            job.ProjectId,
            job.Kind,
            ToStatusText(job.Status),
            job.CreatedAt,
            job.StartedAt,
            job.CompletedAt,
            job.FileName,
            job.Error);

    private static string ToStatusText(ProjectExportJobStatus status) => status switch
    {
        ProjectExportJobStatus.Queued => "queued",
        ProjectExportJobStatus.Running => "running",
        ProjectExportJobStatus.Succeeded => "succeeded",
        ProjectExportJobStatus.Invalid => "invalid",
        _ => "failed",
    };

    private sealed class ProjectExportJobState(
        Guid id,
        int projectId,
        string kind,
        ProjectDossierExportRequest request,
        DateTimeOffset createdAt)
    {
        public Guid Id { get; } = id;
        public int ProjectId { get; } = projectId;
        public string Kind { get; } = kind;
        public ProjectDossierExportRequest Request { get; } = request;
        public DateTimeOffset CreatedAt { get; } = createdAt;
        public DateTimeOffset? StartedAt { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public ProjectExportJobStatus Status { get; set; } = ProjectExportJobStatus.Queued;
        public string? FileName { get; set; }
        public string? ContentType { get; set; }
        public string? FilePath { get; set; }
        public int ContentLength { get; set; }
        public string? Error { get; set; }
    }

    private enum ProjectExportJobStatus
    {
        Queued,
        Running,
        Succeeded,
        Invalid,
        Failed,
    }
}
