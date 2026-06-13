using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Attributes;
using StoryDB.Api.Services.Attributes;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/attribute-definitions")]
public class AttributeDefinitionsController(IAttributeDefinitionService attributeDefinitionService) : ControllerBase
{
    [HttpGet("groups")]
    public async Task<ActionResult<IReadOnlyList<AttributeGroupDto>>> GetGroups(
        int projectId,
        [FromQuery] string typeKey)
    {
        var result = await attributeDefinitionService.GetGroupsAsync(projectId, typeKey);
        return ToActionResult(result);
    }

    [HttpPost("groups")]
    public async Task<ActionResult<AttributeGroupDto>> CreateGroup(
        int projectId,
        AttributeGroupRequest request)
    {
        var result = await attributeDefinitionService.CreateGroupAsync(projectId, request);
        return result.Status switch
        {
            AttributeDefinitionServiceStatus.Success => CreatedAtAction(
                nameof(GetGroups),
                new { projectId, typeKey = request.TypeKey },
                result.Value),
            AttributeDefinitionServiceStatus.NotFound => NotFound(),
            AttributeDefinitionServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("groups/{groupId:int}")]
    public async Task<ActionResult<AttributeGroupDto>> UpdateGroup(
        int projectId,
        int groupId,
        AttributeGroupRequest request)
    {
        var result = await attributeDefinitionService.UpdateGroupAsync(projectId, groupId, request);
        return ToActionResult(result);
    }

    [HttpDelete("groups/{groupId:int}")]
    public async Task<IActionResult> DeleteGroup(int projectId, int groupId)
    {
        var result = await attributeDefinitionService.DeleteGroupAsync(projectId, groupId);
        return ToNoContentResult(result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AttributeDefinitionDto>>> GetDefinitions(
        int projectId,
        [FromQuery] string typeKey)
    {
        var result = await attributeDefinitionService.GetDefinitionsAsync(projectId, typeKey);
        return ToActionResult(result);
    }

    [HttpPost]
    public async Task<ActionResult<AttributeDefinitionDto>> CreateDefinition(
        int projectId,
        AttributeDefinitionRequest request)
    {
        var result = await attributeDefinitionService.CreateDefinitionAsync(projectId, request);
        return result.Status switch
        {
            AttributeDefinitionServiceStatus.Success => CreatedAtAction(
                nameof(GetDefinitions),
                new { projectId, typeKey = request.TypeKey },
                result.Value),
            AttributeDefinitionServiceStatus.NotFound => NotFound(),
            AttributeDefinitionServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("{definitionId:int}")]
    public async Task<ActionResult<AttributeDefinitionDto>> UpdateDefinition(
        int projectId,
        int definitionId,
        AttributeDefinitionRequest request)
    {
        var result = await attributeDefinitionService.UpdateDefinitionAsync(projectId, definitionId, request);
        return ToActionResult(result);
    }

    [HttpDelete("{definitionId:int}")]
    public async Task<IActionResult> DeleteDefinition(int projectId, int definitionId)
    {
        var result = await attributeDefinitionService.DeleteDefinitionAsync(projectId, definitionId);
        return ToNoContentResult(result);
    }

    private ActionResult<TValue> ToActionResult<TValue>(AttributeDefinitionServiceResult<TValue> result)
    {
        return result.Status switch
        {
            AttributeDefinitionServiceStatus.Success => Ok(result.Value),
            AttributeDefinitionServiceStatus.NotFound => NotFound(),
            AttributeDefinitionServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private IActionResult ToNoContentResult(AttributeDefinitionServiceResult result)
    {
        return result.Status switch
        {
            AttributeDefinitionServiceStatus.Success => NoContent(),
            AttributeDefinitionServiceStatus.NotFound => NotFound(),
            AttributeDefinitionServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
