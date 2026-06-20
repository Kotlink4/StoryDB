using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Errors;
using StoryDB.Api.Files;
using StoryDB.Api.Filters;
using StoryDB.Api.Observability;
using StoryDB.Api.Security;
using StoryDB.Api.Services.Attributes;
using StoryDB.Api.Services.Auth;
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
using System.IO.Compression;
using System.Threading.RateLimiting;

namespace StoryDB.Api.Infrastructure;

public static class StoryDbServiceCollectionExtensions
{
    public static IServiceCollection AddStoryDbApplication(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.AddScoped<ProjectAccessFilter>();
        services.AddScoped<TimelineEventValidator>();
        services.AddSingleton<IFileStorageService, LocalFileStorageService>();
        services.AddSingleton<IApiMetricsService, ApiMetricsService>();
        services.AddMemoryCache(options =>
        {
            options.SizeLimit = GetPositiveConfigurationValue(configuration, "MemoryCache:SizeLimit", 2048);
        });
        services.AddSingleton<ICacheSingleFlight, CacheSingleFlight>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IProjectAccessService, ProjectAccessService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAttributeDefinitionService, AttributeDefinitionService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<IProjectExportService, ProjectExportService>();
        services.AddSingleton<ProjectExportJobService>();
        services.AddSingleton<IProjectExportJobService>(currentServices => currentServices.GetRequiredService<ProjectExportJobService>());
        services.AddHostedService<ProjectExportJobWorker>();
        services.AddSingleton<AuditLogQueue>();
        services.AddSingleton<IAuditLogQueue>(currentServices => currentServices.GetRequiredService<AuditLogQueue>());
        services.AddHostedService(currentServices => currentServices.GetRequiredService<AuditLogQueue>());
        services.AddScoped<IObjectService, ObjectService>();
        services.AddScoped<IProjectService, ProjectService>();
        services.AddScoped<ITemplatePackService, TemplatePackService>();
        services.AddScoped<IHierarchyService, HierarchyService>();
        services.AddScoped<IRelationService, RelationService>();
        services.AddScoped<IStructureService, StructureService>();
        services.AddScoped<ITimelineService, TimelineService>();
        services.AddScoped<IAuditLogService, AuditLogService>();

        services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = configuration.GetValue<long>("Security:MaxUploadBytes", 8 * 1024 * 1024);
            options.ValueLengthLimit = configuration.GetValue<int>("Security:MaxFormValueLength", 16 * 1024);
        });
        services.AddControllers(options =>
        {
            options.Filters.Add(new AuthorizeFilter());
            options.Filters.Add(new ApiErrorResultFilter());
            options.Filters.Add<ProjectAccessFilter>();
        })
        .AddJsonOptions(options =>
        {
            options.JsonSerializerOptions.MaxDepth = configuration.GetValue("Security:JsonMaxDepth", 32);
        });

        services.AddStoryDbCompression();
        services.AddStoryDbAuthentication(configuration);
        services.AddAuthorization();
        services.AddStoryDbCors();
        services.AddStoryDbRateLimiting(configuration);
        services.AddStoryDbDatabase(configuration, environment);
        services.AddOpenApi();

        return services;
    }

    private static void AddStoryDbCompression(this IServiceCollection services)
    {
        services.AddResponseCompression(options =>
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
        services.Configure<BrotliCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest;
        });
        services.Configure<GzipCompressionProviderOptions>(options =>
        {
            options.Level = CompressionLevel.Fastest;
        });
    }

    private static void AddStoryDbAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
            .AddCookie(options =>
            {
                options.Cookie.Name = "StoryDB.Session";
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                var sessionLifetimeHours = configuration.GetValue("Authentication:SessionLifetimeHours", 12);
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
    }

    private static void AddStoryDbCors(this IServiceCollection services)
    {
        services.AddCors(options =>
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
    }

    private static void AddStoryDbRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddRateLimiter(options =>
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
                    PermitLimit = configuration.GetValue("Security:RateLimits:Auth:PermitLimit", 12),
                    QueueLimit = 0,
                    Window = TimeSpan.FromMinutes(configuration.GetValue("Security:RateLimits:Auth:WindowMinutes", 1)),
                }));

            options.AddPolicy("upload", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(GetRateLimitPartitionKey(httpContext), _ => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = configuration.GetValue("Security:RateLimits:Upload:PermitLimit", 20),
                    QueueLimit = 0,
                    Window = TimeSpan.FromMinutes(configuration.GetValue("Security:RateLimits:Upload:WindowMinutes", 1)),
                }));

            options.AddPolicy("expensive", httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(GetRateLimitPartitionKey(httpContext), _ => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = configuration.GetValue("Security:RateLimits:Expensive:PermitLimit", 600),
                    QueueLimit = 0,
                    Window = TimeSpan.FromMinutes(configuration.GetValue("Security:RateLimits:Expensive:WindowMinutes", 1)),
                }));
        });
    }

    private static void AddStoryDbDatabase(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var dbContextPoolSize = GetPositiveConfigurationValue(configuration, "Database:DbContextPoolSize", 128);
        services.AddDbContextPool<StoryDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("StoryDb")
                ?? throw new InvalidOperationException("Connection string 'StoryDb' was not found.");
            var commandTimeoutSeconds = GetPositiveConfigurationValue(configuration, "Database:CommandTimeoutSeconds", 30);
            var maxRetryCount = Math.Max(0, configuration.GetValue("Database:MaxRetryCount", 3));
            var maxRetryDelaySeconds = GetPositiveConfigurationValue(configuration, "Database:MaxRetryDelaySeconds", 5);
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
            options.EnableDetailedErrors(environment.IsDevelopment());
            if (environment.IsDevelopment())
            {
                options.EnableSensitiveDataLogging();
            }
        }, dbContextPoolSize);
    }

    private static string GetRateLimitPartitionKey(HttpContext context)
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

    private static int GetPositiveConfigurationValue(IConfiguration configuration, string key, int fallback)
    {
        var value = configuration.GetValue(key, fallback);
        return value > 0 ? value : fallback;
    }
}
