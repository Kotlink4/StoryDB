namespace StoryDB.Api.Services.Exports;

public sealed class ProjectExportJobWorker(ProjectExportJobService exportJobService, ILogger<ProjectExportJobWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await exportJobService.ProcessQueueAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown path.
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Export job worker stopped unexpectedly.");
            throw;
        }
    }
}
