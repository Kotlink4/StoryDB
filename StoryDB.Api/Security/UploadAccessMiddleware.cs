namespace StoryDB.Api.Security;

public sealed class UploadAccessMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IProjectAccessService projectAccessService)
    {
        if (!context.Request.Path.StartsWithSegments("/uploads", out var remainingPath))
        {
            await next(context);
            return;
        }

        if (projectAccessService.CurrentUserId is null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var segments = remainingPath.Value?
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];

        if (segments.Length >= 2 &&
            string.Equals(segments[0], "projects", StringComparison.OrdinalIgnoreCase) &&
            int.TryParse(segments[1], out var projectId) &&
            !await projectAccessService.HasProjectAccessAsync(projectId, context.RequestAborted))
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        await next(context);
    }
}
