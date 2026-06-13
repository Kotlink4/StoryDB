using System.Diagnostics;

namespace StoryDB.Api.Observability;

public sealed class AuditLogMiddleware
{
    private static readonly HashSet<string> AuditedMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post,
        HttpMethods.Put,
        HttpMethods.Patch,
        HttpMethods.Delete,
    };

    private readonly RequestDelegate next;
    private readonly ILogger<AuditLogMiddleware> logger;
    private readonly IConfiguration configuration;

    public AuditLogMiddleware(
        RequestDelegate next,
        ILogger<AuditLogMiddleware> logger,
        IConfiguration configuration)
    {
        this.next = next;
        this.logger = logger;
        this.configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context, IAuditLogService auditLogService)
    {
        var stopwatch = Stopwatch.StartNew();
        await next(context);
        stopwatch.Stop();

        if (!ShouldAudit(context))
        {
            return;
        }

        try
        {
            await auditLogService.WriteRequestAuditAsync(context, stopwatch.ElapsedMilliseconds, context.RequestAborted);
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "Could not write audit log for {Method} {Path} with trace {TraceId}.",
                context.Request.Method,
                context.Request.Path.Value,
                Activity.Current?.Id ?? context.TraceIdentifier);
        }
    }

    private bool ShouldAudit(HttpContext context)
    {
        if (!configuration.GetValue("Logging:AuditEnabled", true))
        {
            return false;
        }

        return AuditedMethods.Contains(context.Request.Method) &&
            context.Request.Path.StartsWithSegments("/api") &&
            !context.Request.Path.StartsWithSegments("/api/auth/me");
    }
}
