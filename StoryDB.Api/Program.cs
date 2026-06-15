using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Data;
using StoryDB.Api.Errors;
using StoryDB.Api.Files;
using StoryDB.Api.Filters;
using StoryDB.Api.Security;
using StoryDB.Api.Services.Auth;
using StoryDB.Api.Services.Attributes;
using StoryDB.Api.Services.Catalogs;
using StoryDB.Api.Services.Hierarchy;
using StoryDB.Api.Services.Objects;
using StoryDB.Api.Services.Projects;
using StoryDB.Api.Services.Relations;
using StoryDB.Api.Services.Structures;
using StoryDB.Api.Services.Timelines;
using StoryDB.Api.Validation;
using Serilog;
using Serilog.Events;
using StoryDB.Api.Observability;
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
builder.Services.AddScoped<MediaMigrationService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IProjectAccessService, ProjectAccessService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAttributeDefinitionService, AttributeDefinitionService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IObjectService, ObjectService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
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
            PermitLimit = builder.Configuration.GetValue("Security:RateLimits:Expensive:PermitLimit", 90),
            QueueLimit = 0,
            Window = TimeSpan.FromMinutes(builder.Configuration.GetValue("Security:RateLimits:Expensive:WindowMinutes", 1)),
        }));
});
builder.Services.AddDbContext<StoryDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("StoryDb")
        ?? throw new InvalidOperationException("Connection string 'StoryDb' was not found.");
    options.UseNpgsql(connectionString);
    options.EnableDetailedErrors(builder.Environment.IsDevelopment());
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
    }
});
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

public partial class Program;






