namespace StoryDB.Api.Services.Exports;

public sealed class ProjectExportJobWorker(
    ProjectExportJobService exportJobService,
    IConfiguration configuration,
    ILogger<ProjectExportJobWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var workerCancellation = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
            var workerToken = workerCancellation.Token;
            var queueTask = exportJobService.ProcessQueueAsync(workerToken);
            var cleanupTask = RunCleanupLoopAsync(workerToken);

            var completedTask = await Task.WhenAny(queueTask, cleanupTask);
            if (completedTask.IsFaulted)
            {
                await workerCancellation.CancelAsync();
                await completedTask;
            }

            await workerCancellation.CancelAsync();
            await Task.WhenAll(
                queueTask,
                cleanupTask);
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

    private async Task RunCleanupLoopAsync(CancellationToken stoppingToken)
    {
        var intervalMinutes = Math.Max(1, configuration.GetValue("Exports:CleanupIntervalMinutes", 5));
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(intervalMinutes));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            exportJobService.CleanupCompletedJobs();
        }
    }
}
