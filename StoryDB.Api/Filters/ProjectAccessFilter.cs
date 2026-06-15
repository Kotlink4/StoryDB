using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using StoryDB.Api.Security;

namespace StoryDB.Api.Filters;

public class ProjectAccessFilter(IProjectAccessService projectAccessService) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var allowsAnonymous = context.ActionDescriptor.EndpointMetadata
            .OfType<IAllowAnonymous>()
            .Any();
        if (allowsAnonymous)
        {
            await next();
            return;
        }

        if (!context.RouteData.Values.TryGetValue("projectId", out var rawProjectId) ||
            !int.TryParse(Convert.ToString(rawProjectId), out var projectId))
        {
            await next();
            return;
        }

        if (projectAccessService.CurrentUserId is null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var requestMethod = context.HttpContext.Request.Method;
        var isReadOnlyRequest =
            HttpMethods.IsGet(requestMethod) ||
            HttpMethods.IsHead(requestMethod) ||
            HttpMethods.IsOptions(requestMethod);
        var hasAccess = isReadOnlyRequest
            ? await projectAccessService.HasProjectAccessAsync(projectId, context.HttpContext.RequestAborted)
            : await projectAccessService.HasProjectWriteAccessAsync(projectId, context.HttpContext.RequestAborted);
        if (!hasAccess)
        {
            context.Result = new NotFoundResult();
            return;
        }

        await next();
    }
}
