namespace StoryDB.Api.Security;

public sealed class RequestBodySizeLimitMiddleware(RequestDelegate next, IConfiguration configuration)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.ContentLength is not { } contentLength || contentLength <= 0)
        {
            await next(context);
            return;
        }

        var limit = context.Request.Path.StartsWithSegments("/api/uploads", StringComparison.OrdinalIgnoreCase)
            ? configuration.GetValue<long>("Security:MaxUploadBytes", 8 * 1024 * 1024)
            : configuration.GetValue<long>("Security:MaxRequestBodyBytes", 2 * 1024 * 1024);

        if (contentLength > limit)
        {
            context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            await context.Response.WriteAsync("Request body is too large.", context.RequestAborted);
            return;
        }

        await next(context);
    }
}
