using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Mvc.Authorization;
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
builder.Services.AddControllers(options =>
{
    options.Filters.Add(new AuthorizeFilter());
    options.Filters.Add(new ApiErrorResultFilter());
    options.Filters.Add<ProjectAccessFilter>();
});
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "StoryDB.Session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
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

if (builder.Configuration.GetValue("UseHttpsRedirection", false))
{
    app.UseHttpsRedirection();
}

app.UseCors("StoryDbClient");
app.UseAuthentication();

var fileStorageService = app.Services.GetRequiredService<IFileStorageService>();
fileStorageService.EnsureUploadsRoot();
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

public partial class Program;






