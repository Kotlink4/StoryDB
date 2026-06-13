using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace StoryDB.Api.Errors;

public static class ApiProblemDetails
{
    public static ProblemDetails Create(HttpContext httpContext, int statusCode, string? detail = null)
    {
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = GetTitle(statusCode),
            Detail = string.IsNullOrWhiteSpace(detail) ? null : detail,
            Instance = httpContext.Request.Path,
        };

        problemDetails.Extensions["traceId"] = Activity.Current?.Id ?? httpContext.TraceIdentifier;

        return problemDetails;
    }

    public static string GetTitle(int statusCode) =>
        statusCode switch
        {
            StatusCodes.Status400BadRequest => "Bad request.",
            StatusCodes.Status401Unauthorized => "Authentication is required.",
            StatusCodes.Status403Forbidden => "Access is denied.",
            StatusCodes.Status404NotFound => "Resource was not found.",
            StatusCodes.Status409Conflict => "Conflict.",
            StatusCodes.Status413PayloadTooLarge => "Request body is too large.",
            StatusCodes.Status415UnsupportedMediaType => "Unsupported media type.",
            StatusCodes.Status422UnprocessableEntity => "Validation failed.",
            _ when statusCode >= 500 => "Unexpected server error.",
            _ => "Request failed.",
        };
}
