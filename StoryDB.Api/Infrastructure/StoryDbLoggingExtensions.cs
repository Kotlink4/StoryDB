using Serilog;
using Serilog.Events;

namespace StoryDB.Api.Infrastructure;

public static class StoryDbLoggingExtensions
{
    public static IHostBuilder UseStoryDbSerilog(
        this IHostBuilder host,
        IConfiguration configuration)
    {
        var logDirectory = configuration.GetValue<string>("Logging:FileDirectory")
            ?? Path.Combine(AppContext.BaseDirectory, "logs");
        Directory.CreateDirectory(logDirectory);

        return host.UseSerilog((context, _, loggerConfiguration) =>
        {
            loggerConfiguration
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "StoryDB.Api")
                .Enrich.WithProperty("Environment", context.HostingEnvironment.EnvironmentName)
                .WriteTo.Console(
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] [{TraceId}] [{SourceContext}] {Message:lj}{NewLine}{Exception}")
                .WriteTo.File(
                    Path.Combine(logDirectory, "storydb-api-.log"),
                    rollingInterval: RollingInterval.Day,
                    retainedFileCountLimit: context.Configuration.GetValue("Logging:RetainedFileCountLimit", 14),
                    fileSizeLimitBytes: context.Configuration.GetValue("Logging:FileSizeLimitBytes", 20_971_520L),
                    rollOnFileSizeLimit: true,
                    shared: true,
                    flushToDiskInterval: TimeSpan.FromSeconds(1),
                    outputTemplate: "[{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} {Level:u3}] [{TraceId}] [{UserId}] [{ProjectId}] [{SourceContext}] {Message:lj}{NewLine}{Exception}");
        });
    }
}
