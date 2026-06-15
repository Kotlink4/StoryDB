using System.Diagnostics;
using System.Security.Claims;
using Serilog.Context;

namespace StoryDB.Api.Observability;

public sealed class RequestLogContextMiddleware
{
    private readonly RequestDelegate next;
    private readonly ILogger<RequestLogContextMiddleware> logger;
    private readonly IConfiguration configuration;
    private readonly IApiMetricsService metricsService;

    public RequestLogContextMiddleware(
        RequestDelegate next,
        ILogger<RequestLogContextMiddleware> logger,
        IConfiguration configuration,
        IApiMetricsService metricsService)
    {
        this.next = next;
        this.logger = logger;
        this.configuration = configuration;
        this.metricsService = metricsService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
        context.Response.Headers.TryAdd("X-Trace-Id", traceId);

        var stopwatch = Stopwatch.StartNew();
        using (LogContext.PushProperty("TraceId", traceId))
        using (LogContext.PushProperty("RequestMethod", context.Request.Method))
        using (LogContext.PushProperty("RequestPath", context.Request.Path.Value))
        using (LogContext.PushProperty("ProjectId", RequestObservation.GetProjectId(context)))
        {
            try
            {
                await next(context);
            }
            finally
            {
                stopwatch.Stop();
                var elapsedMs = stopwatch.ElapsedMilliseconds;
                var userId = RequestObservation.GetUserId(context);
                var projectId = RequestObservation.GetProjectId(context);
                var statusCode = context.Response.StatusCode;
                var slowRequestThresholdMs = configuration.GetValue("Logging:SlowRequestThresholdMs", 750L);
                var logLevel = RequestLogLevelPolicy.GetLogLevel(statusCode, elapsedMs, slowRequestThresholdMs);
                var shouldAlwaysLog = logLevel >= LogLevel.Information;
                var isRoutineDiagnosticRequest = IsRoutineDiagnosticRequest(context.Request);
                metricsService.Record(context, elapsedMs, slowRequestThresholdMs);

                if ((!isRoutineDiagnosticRequest || shouldAlwaysLog) && logger.IsEnabled(logLevel))
                {
                    using (LogContext.PushProperty("UserId", userId))
                    using (LogContext.PushProperty("ProjectId", projectId))
                    using (LogContext.PushProperty("StatusCode", statusCode))
                    using (LogContext.PushProperty("ElapsedMs", elapsedMs))
                    {
                        logger.Log(
                            logLevel,
                            "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs} ms for user {UserId} project {ProjectId}.",
                            context.Request.Method,
                            context.Request.Path.Value,
                            statusCode,
                            elapsedMs,
                            userId,
                            projectId);
                    }
                }
            }
        }
    }

    private static bool IsRoutineDiagnosticRequest(HttpRequest request)
    {
        if (!HttpMethods.IsGet(request.Method) && !HttpMethods.IsHead(request.Method))
        {
            return false;
        }

        var path = request.Path.Value;
        return string.Equals(path, "/health", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/metrics", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(path, "/metrics/prometheus", StringComparison.OrdinalIgnoreCase);
    }
}

public static class RequestLogLevelPolicy
{
    public static LogLevel GetLogLevel(int statusCode, long elapsedMs, long slowRequestThresholdMs)
    {
        if (statusCode >= StatusCodes.Status500InternalServerError || elapsedMs >= slowRequestThresholdMs)
        {
            return LogLevel.Warning;
        }

        if (statusCode >= StatusCodes.Status400BadRequest)
        {
            return LogLevel.Information;
        }

        return LogLevel.Debug;
    }
}

internal static class RequestObservation
{
    public static int? GetUserId(HttpContext context)
    {
        var value = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var userId) ? userId : null;
    }

    public static int? GetProjectId(HttpContext context)
    {
        if (context.Request.RouteValues.TryGetValue("projectId", out var rawProjectId) &&
            int.TryParse(Convert.ToString(rawProjectId), out var routeProjectId))
        {
            return routeProjectId;
        }

        var segments = context.Request.Path.Value?
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (segments is { Length: >= 3 } &&
            segments[0].Equals("api", StringComparison.OrdinalIgnoreCase) &&
            segments[1].Equals("projects", StringComparison.OrdinalIgnoreCase) &&
            int.TryParse(segments[2], out var pathProjectId))
        {
            return pathProjectId;
        }

        return null;
    }
}
