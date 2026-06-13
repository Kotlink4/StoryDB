using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace StoryDB.Api.Errors;

public sealed class ApiErrorResultFilter : IAlwaysRunResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        switch (context.Result)
        {
            case ObjectResult objectResult:
                NormalizeObjectResult(context, objectResult);
                break;
            case StatusCodeResult statusCodeResult when statusCodeResult.StatusCode >= StatusCodes.Status400BadRequest:
                context.Result = CreateObjectResult(context, statusCodeResult.StatusCode);
                break;
            case UnauthorizedResult:
                context.Result = CreateObjectResult(context, StatusCodes.Status401Unauthorized);
                break;
            case ForbidResult:
                context.Result = CreateObjectResult(context, StatusCodes.Status403Forbidden);
                break;
            case NotFoundResult:
                context.Result = CreateObjectResult(context, StatusCodes.Status404NotFound);
                break;
        }
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
    }

    private static void NormalizeObjectResult(ResultExecutingContext context, ObjectResult objectResult)
    {
        var statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;
        if (statusCode < StatusCodes.Status400BadRequest)
        {
            return;
        }

        if (objectResult.Value is ProblemDetails problemDetails)
        {
            problemDetails.Status ??= statusCode;
            problemDetails.Instance ??= context.HttpContext.Request.Path;
            problemDetails.Extensions.TryAdd("traceId", context.HttpContext.TraceIdentifier);
            objectResult.ContentTypes.Clear();
            objectResult.ContentTypes.Add("application/problem+json");
            return;
        }

        if (objectResult.Value is string detail)
        {
            objectResult.Value = ApiProblemDetails.Create(context.HttpContext, statusCode, detail);
            objectResult.DeclaredType = typeof(ProblemDetails);
            objectResult.ContentTypes.Clear();
            objectResult.ContentTypes.Add("application/problem+json");
        }
    }

    private static ObjectResult CreateObjectResult(ResultExecutingContext context, int statusCode) =>
        new(ApiProblemDetails.Create(context.HttpContext, statusCode))
        {
            StatusCode = statusCode,
            ContentTypes = { "application/problem+json" },
        };
}
