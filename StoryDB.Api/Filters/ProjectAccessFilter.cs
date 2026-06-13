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

        var hasAccess = await projectAccessService.HasProjectAccessAsync(
            projectId,
            context.HttpContext.RequestAborted);
        if (!hasAccess)
        {
            context.Result = new NotFoundResult();
            return;
        }

        await next();
    }
}
