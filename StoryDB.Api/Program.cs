using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using StoryDB.Api.Data;
using StoryDB.Api.Errors;
using StoryDB.Api.Files;
using StoryDB.Api.Filters;
using StoryDB.Api.Security;
using StoryDB.Api.Services.Auth;
using StoryDB.Api.Services.Attributes;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Services.Catalogs;
using StoryDB.Api.Services.Exports;
using StoryDB.Api.Services.Hierarchy;
using StoryDB.Api.Services.Objects;
using StoryDB.Api.Services.Projects;
using StoryDB.Api.Services.Relations;
using StoryDB.Api.Services.Structures;
using StoryDB.Api.Services.TemplatePacks;
using StoryDB.Api.Services.Timelines;
using StoryDB.Api.Validation;
using Serilog;
using Serilog.Events;
using StoryDB.Api.Observability;
using System.IO.Compression;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var logDirectory = builder.Configuration.GetValue<string>("Logging:FileDirectory")
    ?? Path.Combine(AppContext.BaseDirectory, "logs");
Directory.CreateDirectory(logDirectory);

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
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

// Add services to the container.

builder.Services.AddScoped<ProjectAccessFilter>();
builder.Services.AddScoped<TimelineEventValidator>();
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
builder.Services.AddSingleton<IApiMetricsService, ApiMetricsService>();
builder.Services.AddScoped<MediaMigrationService>();
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = GetPositiveConfigurationValue(builder.Configuration, "MemoryCache:SizeLimit", 2048);
});
builder.Services.AddSingleton<ICacheSingleFlight, CacheSingleFlight>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IProjectAccessService, ProjectAccessService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAttributeDefinitionService, AttributeDefinitionService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IProjectExportService, ProjectExportService>();
builder.Services.AddSingleton<ProjectExportJobService>();
builder.Services.AddSingleton<IProjectExportJobService>(services => services.GetRequiredService<ProjectExportJobService>());
builder.Services.AddHostedService<ProjectExportJobWorker>();
builder.Services.AddSingleton<AuditLogQueue>();
builder.Services.AddSingleton<IAuditLogQueue>(services => services.GetRequiredService<AuditLogQueue>());
builder.Services.AddHostedService(services => services.GetRequiredService<AuditLogQueue>());
builder.Services.AddScoped<IObjectService, ObjectService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITemplatePackService, TemplatePackService>();
builder.Services.AddScoped<IHierarchyService, HierarchyService>();
builder.Services.AddScoped<IRelationService, RelationService>();
builder.Services.AddScoped<IStructureService, StructureService>();
builder.Services.AddScoped<ITimelineService, TimelineService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = builder.Configuration.GetValue<long>("Security:MaxUploadBytes", 8 * 1024 * 1024);
    options.ValueLengthLimit = builder.Configuration.GetValue<int>("Security:MaxFormValueLength", 16 * 1024);
});
builder.Services.AddControllers(options =>
{
    options.Filters.Add(new AuthorizeFilter());
    options.Filters.Add(new ApiErrorResultFilter());
    options.Filters.Add<ProjectAccessFilter>();
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.MaxDepth = builder.Configuration.GetValue("Security:JsonMaxDepth", 32);
});
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
    [
        "application/json",
        "application/problem+json",
    ]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "StoryDB.Session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        var sessionLifetimeHours = builder.Configuration.GetValue("Authentication:SessionLifetimeHours", 12);
        options.ExpireTimeSpan = TimeSpan.FromHours(sessionLifetimeHours <= 0 ? 12 : sessionLifetimeHours);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddPolicy("StoryDbClient", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return false;
                }

                return (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
                    uri.Port == 50201;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, _) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        return ValueTask.CompletedTask;
    };

    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(GetRateLimitPartitionKey(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = builder.Configuration.GetValue("Security:RateLimits:Auth:PermitLimit", 12),
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("Security:RateLimits:Auth:WindowMinutes", 1)),
        }));

    options.AddPolicy("upload", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(GetRateLimitPartitionKey(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = builder.Configuration.GetValue("Security:RateLimits:Upload:PermitLimit", 20),
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("Security:RateLimits:Upload:WindowMinutes", 1)),
        }));

    options.AddPolicy("expensive", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(GetRateLimitPartitionKey(httpContext), _ => new FixedWindowRateLimiterOptions
        {
            AutoReplenishment = true,
            PermitLimit = builder.Configuration.GetValue("Security:RateLimits:Expensive:PermitLimit", 600),
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("Security:RateLimits:Expensive:WindowMinutes", 1)),
        }));
});
var dbContextPoolSize = GetPositiveConfigurationValue(builder.Configuration, "Database:DbContextPoolSize", 128);
builder.Services.AddDbContextPool<StoryDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("StoryDb")
        ?? throw new InvalidOperationException("Connection string 'StoryDb' was not found.");
    var commandTimeoutSeconds = GetPositiveConfigurationValue(builder.Configuration, "Database:CommandTimeoutSeconds", 30);
    var maxRetryCount = Math.Max(0, builder.Configuration.GetValue("Database:MaxRetryCount", 3));
    var maxRetryDelaySeconds = GetPositiveConfigurationValue(builder.Configuration, "Database:MaxRetryDelaySeconds", 5);
    options.UseNpgsql(
        connectionString,
        npgsqlOptions =>
        {
            npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
            npgsqlOptions.CommandTimeout(commandTimeoutSeconds);
            if (maxRetryCount > 0)
            {
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount,
                    TimeSpan.FromSeconds(maxRetryDelaySeconds),
                    errorCodesToAdd: null);
            }
        });
    options.EnableDetailedErrors(builder.Environment.IsDevelopment());
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
    }
}, dbContextPoolSize);
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();
app.Logger.LogInformation("StoryDB API bootstrapped in {Environment} environment.", app.Environment.EnvironmentName);

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<StoryDbContext>();
    dbContext.Database.Migrate();

    var scopedFileStorageService = scope.ServiceProvider.GetRequiredService<IFileStorageService>();
    scopedFileStorageService.EnsureUploadsRoot();

    var mediaMigrationService = scope.ServiceProvider.GetRequiredService<MediaMigrationService>();
    await mediaMigrationService.MigrateLegacyImagesAsync();
}
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseMiddleware<RequestLogContextMiddleware>();
app.UseMiddleware<ApiExceptionMiddleware>();
app.UseMiddleware<RequestBodySizeLimitMiddleware>();
app.UseResponseCompression();

if (builder.Configuration.GetValue("UseHttpsRedirection", false))
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

    return databaseAvailable ? Results.Ok(payload) : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
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

    return databaseAvailable ? Results.Ok(payload) : Results.Json(payload, statusCode: StatusCodes.Status503ServiceUnavailable);
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

app.MapControllers();

try
{
    app.Logger.LogInformation("StoryDB API is running.");
    app.Run();
}
finally
{
    Log.CloseAndFlush();
}

static string GetRateLimitPartitionKey(HttpContext context)
{
    var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
    if (!string.IsNullOrWhiteSpace(userId))
    {
        return $"user:{userId}";
    }

    var forwardedFor = context.Request.Headers["X-Forwarded-For"].ToString();
    var forwardedAddress = forwardedFor
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .FirstOrDefault();

    return $"ip:{forwardedAddress ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
}

static int GetPositiveConfigurationValue(IConfiguration configuration, string key, int fallback)
{
    var value = configuration.GetValue(key, fallback);
    return value > 0 ? value : fallback;
}

public partial class Program;






