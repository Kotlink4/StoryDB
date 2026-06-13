using Microsoft.AspNetCore.Mvc;

namespace StoryDB.Api.Errors;

public sealed class ApiExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionMiddleware> _logger;

    public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);

            if (ShouldWriteEmptyProblem(context.Response))
            {
                await WriteProblemAsync(context, context.Response.StatusCode);
            }
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unhandled API exception.");

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            await WriteProblemAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "Something went wrong while processing the request.");
        }
    }

    private static bool ShouldWriteEmptyProblem(HttpResponse response) =>
        !response.HasStarted &&
        response.StatusCode >= StatusCodes.Status400BadRequest &&
        string.IsNullOrWhiteSpace(response.ContentType) &&
        response.ContentLength is null;

    private static Task WriteProblemAsync(HttpContext context, int statusCode, string? detail = null)
    {
        var problemDetails = ApiProblemDetails.Create(context, statusCode, detail);

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/problem+json";

        return context.Response.WriteAsJsonAsync(problemDetails);
    }
}
