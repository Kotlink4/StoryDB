using Microsoft.AspNetCore.Http.Features;

namespace StoryDB.Api.Security;

public sealed class RequestBodySizeLimitMiddleware(RequestDelegate next, IConfiguration configuration)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var limit = context.Request.Path.StartsWithSegments("/api/uploads", StringComparison.OrdinalIgnoreCase)
            ? GetPositiveLimit("Security:MaxUploadBytes", 8 * 1024 * 1024)
            : GetPositiveLimit("Security:MaxRequestBodyBytes", 2 * 1024 * 1024);

        var maxRequestBodySizeFeature = context.Features.Get<IHttpMaxRequestBodySizeFeature>();
        if (maxRequestBodySizeFeature is { IsReadOnly: false })
        {
            maxRequestBodySizeFeature.MaxRequestBodySize = limit;
        }

        if (context.Request.ContentLength is not { } contentLength || contentLength <= 0)
        {
            await next(context);
            return;
        }

        if (contentLength > limit)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            await context.Response.WriteAsync("Request body is too large.", context.RequestAborted);
            return;
        }

        await next(context);
    }

    private long GetPositiveLimit(string key, long fallback)
    {
        var value = configuration.GetValue(key, fallback);
        return value > 0 ? value : fallback;
    }
}
