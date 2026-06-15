namespace StoryDB.Api.Security;

public sealed class UnsafeRequestOriginMiddleware(RequestDelegate next, IConfiguration configuration)
{
    private static readonly HashSet<string> UnsafeMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post,
        HttpMethods.Put,
        HttpMethods.Patch,
        HttpMethods.Delete,
    };

    public async Task InvokeAsync(HttpContext context)
    {
        if (!UnsafeMethods.Contains(context.Request.Method))
        {
            await next(context);
            return;
        }

        var origin = context.Request.Headers.Origin.ToString();
        if (string.IsNullOrWhiteSpace(origin))
        {
            await next(context);
            return;
        }

        if (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri) || !IsAllowedOrigin(context, originUri))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsync("Request origin is not allowed.", context.RequestAborted);
            return;
        }

        await next(context);
    }

    private bool IsAllowedOrigin(HttpContext context, Uri originUri)
    {
        if (HostMatches(context.Request.Host, originUri))
        {
            return true;
        }

        var allowedOrigins = configuration.GetSection("Security:AllowedUnsafeRequestOrigins").Get<string[]>() ?? [];
        if (allowedOrigins.Any(allowedOrigin =>
                Uri.TryCreate(allowedOrigin, UriKind.Absolute, out var allowedUri) &&
                SameOrigin(allowedUri, originUri)))
        {
            return true;
        }

        return (originUri.Scheme == Uri.UriSchemeHttp || originUri.Scheme == Uri.UriSchemeHttps) &&
            originUri.Port == 50201;
    }

    private static bool HostMatches(HostString host, Uri originUri) =>
        string.Equals(host.Host, originUri.Host, StringComparison.OrdinalIgnoreCase) &&
        (host.Port ?? DefaultPort(originUri.Scheme)) == (originUri.IsDefaultPort ? DefaultPort(originUri.Scheme) : originUri.Port);

    private static bool SameOrigin(Uri left, Uri right) =>
        string.Equals(left.Scheme, right.Scheme, StringComparison.OrdinalIgnoreCase) &&
        string.Equals(left.Host, right.Host, StringComparison.OrdinalIgnoreCase) &&
        (left.IsDefaultPort ? DefaultPort(left.Scheme) : left.Port) ==
        (right.IsDefaultPort ? DefaultPort(right.Scheme) : right.Port);

    private static int DefaultPort(string scheme) =>
        string.Equals(scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ? 443 : 80;
}
