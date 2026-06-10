using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;

namespace StoryDB.Api.Filters;

public class ProjectAccessFilter(StoryDbContext dbContext) : IAsyncActionFilter
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

        var userIdValue = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdValue, out var userId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var hasAccess = await dbContext.Projects.AnyAsync(project =>
            project.Id == projectId &&
            project.OwnerUserId == userId);
        if (!hasAccess)
        {
            context.Result = new NotFoundResult();
            return;
        }

        await next();
    }
}
