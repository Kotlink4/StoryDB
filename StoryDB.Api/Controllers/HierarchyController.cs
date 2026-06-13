using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Hierarchy;
using StoryDB.Api.Services.Hierarchy;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/hierarchies")]
public class HierarchyController(IHierarchyService hierarchyService) : ControllerBase
{
    [HttpGet("groups")]
    public async Task<ActionResult<IReadOnlyList<HierarchyGroupDto>>> GetGroups(int projectId)
    {
        var result = await hierarchyService.GetGroupsAsync(projectId);
        return ToActionResult(result);
    }

    [HttpPost("groups")]
    public async Task<ActionResult<HierarchyGroupDto>> CreateGroup(int projectId, HierarchyGroupRequest request)
    {
        var result = await hierarchyService.CreateGroupAsync(projectId, request);
        return result.Status switch
        {
            HierarchyServiceStatus.Success => CreatedAtAction(nameof(GetGroups), new { projectId }, result.Value),
            HierarchyServiceStatus.NotFound => NotFound(),
            HierarchyServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("groups/{groupId:int}")]
    public async Task<ActionResult<HierarchyGroupDto>> UpdateGroup(
        int projectId,
        int groupId,
        HierarchyGroupRequest request)
    {
        var result = await hierarchyService.UpdateGroupAsync(projectId, groupId, request);
        return ToActionResult(result);
    }

    [HttpDelete("groups/{groupId:int}")]
    public async Task<IActionResult> DeleteGroup(int projectId, int groupId)
    {
        var result = await hierarchyService.DeleteGroupAsync(projectId, groupId);
        return ToNoContentResult(result);
    }

    [HttpGet("groups/{groupId:int}/nodes")]
    public async Task<ActionResult<IReadOnlyList<HierarchyNodeDto>>> GetNodes(int projectId, int groupId)
    {
        var result = await hierarchyService.GetNodesAsync(projectId, groupId);
        return ToActionResult(result);
    }

    [HttpPost("groups/{groupId:int}/nodes")]
    public async Task<ActionResult<HierarchyNodeDto>> CreateNode(
        int projectId,
        int groupId,
        HierarchyNodeRequest request)
    {
        var result = await hierarchyService.CreateNodeAsync(projectId, groupId, request);
        return result.Status switch
        {
            HierarchyServiceStatus.Success => CreatedAtAction(nameof(GetNodes), new { projectId, groupId }, result.Value),
            HierarchyServiceStatus.NotFound => NotFound(),
            HierarchyServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("groups/{groupId:int}/nodes/{nodeId:int}")]
    public async Task<ActionResult<HierarchyNodeDto>> UpdateNode(
        int projectId,
        int groupId,
        int nodeId,
        HierarchyNodeRequest request)
    {
        var result = await hierarchyService.UpdateNodeAsync(projectId, groupId, nodeId, request);
        return ToActionResult(result);
    }

    [HttpDelete("groups/{groupId:int}/nodes/{nodeId:int}")]
    public async Task<IActionResult> DeleteNode(int projectId, int groupId, int nodeId)
    {
        var result = await hierarchyService.DeleteNodeAsync(projectId, groupId, nodeId);
        return ToNoContentResult(result);
    }

    private ActionResult<TValue> ToActionResult<TValue>(HierarchyServiceResult<TValue> result)
    {
        return result.Status switch
        {
            HierarchyServiceStatus.Success => Ok(result.Value),
            HierarchyServiceStatus.NotFound => NotFound(),
            HierarchyServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private IActionResult ToNoContentResult(HierarchyServiceResult result)
    {
        return result.Status switch
        {
            HierarchyServiceStatus.Success => NoContent(),
            HierarchyServiceStatus.NotFound => NotFound(),
            HierarchyServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
