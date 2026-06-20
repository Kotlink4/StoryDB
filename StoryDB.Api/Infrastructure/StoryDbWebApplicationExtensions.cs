using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using StoryDB.Api.Data;
using StoryDB.Api.Errors;
using StoryDB.Api.Files;
using StoryDB.Api.Observability;
using StoryDB.Api.Security;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Services.Exports;

namespace StoryDB.Api.Infrastructure;

public static class StoryDbWebApplicationExtensions
{
    public static WebApplication InitializeStoryDbDataStore(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
        dbContext.Database.Migrate();

        var scopedFileStorageService = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
        scopedFileStorageService.EnsureUploadsRoot();

        return app;
    }

    public static WebApplication UseStoryDbRequestPipeline(
        this WebApplication app,
        IConfiguration configuration)
    {
        app.UseMiddleware<RequestLogContextMiddleware>();
        app.UseMiddleware<ApiExceptionMiddleware>();
        app.UseMiddleware<RequestBodySizeLimitMiddleware>();
        app.UseResponseCompression();

        if (configuration.GetValue("UseHttpsRedirection", false))
        {
            app.UseHttpsRedirection();
        }

        app.UseCors("StoryDbClient");
        app.UseMiddleware<UnsafeRequestOriginMiddleware>();
        app.UseAuthentication();
        app.UseRateLimiter();

        var fileStorageService = app.Services.GetRequiredService<IFileStorageService>();
        fileStorageService.EnsureUploadsRoot();
        app.UseMiddleware<UploadAccessMiddleware>();
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(fileStorageService.UploadsRootPath),
            RequestPath = "/uploads",
        });

        app.UseMiddleware<AuditLogMiddleware>();
        app.UseAuthorization();

        return app;
    }

    public static WebApplication MapStoryDbOperationalEndpoints(this WebApplication app)
    {
        app.MapGet("/live", () => Results.Ok(new
        {
            status = "alive",
            checkedAt = DateTimeOffset.UtcNow,
            environment = app.Environment.EnvironmentName,
        })).AllowAnonymous();

        app.MapGet("/ready", async (IServiceProvider services, CancellationToken cancellationToken) =>
        {
            var checkedAt = DateTimeOffset.UtcNow;
            await using var scope = services.CreateAsyncScope();
            var scopedDbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
            var databaseAvailable = await scopedDbContext.Database.CanConnectAsync(cancellationToken);
            var payload = new
            {
                status = databaseAvailable ? "ready" : "degraded",
                checkedAt,
                database = databaseAvailable ? "available" : "unavailable",
                environment = app.Environment.EnvironmentName,
            };

            return databaseAvailable
                ? Results.Ok(payload)
                : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
        }).AllowAnonymous();

        app.MapGet("/health", async (IServiceProvider services, CancellationToken cancellationToken) =>
        {
            var startedAt = DateTimeOffset.UtcNow;
            await using var scope = services.CreateAsyncScope();
            var scopedDbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
            var exportJobs = services.GetRequiredService<IProjectExportJobService>().GetStats();
            var auditLogs = services.GetRequiredService<IAuditLogQueue>().GetStats();
            var cache = services.GetRequiredService<ICacheSingleFlight>().GetStats();
            var databaseAvailable = await scopedDbContext.Database.CanConnectAsync(cancellationToken);
            var gcInfo = GC.GetGCMemoryInfo();
            var payload = new
            {
                status = databaseAvailable ? "healthy" : "degraded",
                checkedAt = startedAt,
                database = databaseAvailable ? "available" : "unavailable",
                managedMemoryBytes = GC.GetTotalMemory(forceFullCollection: false),
                heapSizeBytes = gcInfo.HeapSizeBytes,
                memoryLoadBytes = gcInfo.MemoryLoadBytes,
                highMemoryLoadThresholdBytes = gcInfo.HighMemoryLoadThresholdBytes,
                exportJobs,
                auditLogs,
                cache,
                environment = app.Environment.EnvironmentName,
            };

            return databaseAvailable
                ? Results.Ok(payload)
                : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
        }).AllowAnonymous();

        app.MapGet("/metrics", (IApiMetricsService metricsService) =>
        {
            return Results.Ok(metricsService.GetSnapshot());
        }).AllowAnonymous();

        app.MapGet("/metrics/prometheus", (
            IApiMetricsService metricsService,
            IProjectExportJobService exportJobService,
            IAuditLogQueue auditLogQueue,
            ICacheSingleFlight cacheSingleFlight) =>
        {
            var body = PrometheusMetricsFormatter.Format(
                metricsService.GetSnapshot(),
                exportJobService.GetStats(),
                auditLogQueue.GetStats(),
                cacheSingleFlight.GetStats());
            return Results.Text(body, "text/plain; version=0.0.4; charset=utf-8");
        }).AllowAnonymous();

        return app;
    }
}
