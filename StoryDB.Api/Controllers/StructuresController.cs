using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Services.Structures;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("expensive")]
[Route("api/projects/{projectId:int}/structures")]
public class StructuresController(IStructureService structureService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StructureSummaryDto>>> GetStructures(
        int projectId,
        [FromQuery] string? ownerKind,
        [FromQuery] int? ownerId)
    {
        var result = await structureService.GetStructuresAsync(projectId, ownerKind, ownerId);
        return ToActionResult(result);
    }

    [HttpGet("{structureId:int}")]
    public async Task<ActionResult<StructureDto>> GetStructure(int projectId, int structureId)
    {
        var result = await structureService.GetStructureAsync(projectId, structureId);
        return ToActionResult(result);
    }

    [HttpPost]
    public async Task<ActionResult<StructureDto>> CreateStructure(int projectId, StructureRequest request)
    {
        var result = await structureService.CreateStructureAsync(projectId, request);
        return result.Status switch
        {
            StructureServiceStatus.Success => CreatedAtAction(
                nameof(GetStructure),
                new { projectId, structureId = result.Value!.Id },
                result.Value),
            StructureServiceStatus.NotFound => NotFound(),
            StructureServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("{structureId:int}")]
    public async Task<ActionResult<StructureDto>> UpdateStructure(
        int projectId,
        int structureId,
        StructureRequest request)
    {
        var result = await structureService.UpdateStructureAsync(projectId, structureId, request);
        return ToActionResult(result);
    }

    [HttpDelete("{structureId:int}")]
    public async Task<IActionResult> DeleteStructure(int projectId, int structureId)
    {
        var result = await structureService.DeleteStructureAsync(projectId, structureId);
        return ToNoContentResult(result);
    }

    [HttpGet("usages")]
    public async Task<ActionResult<IReadOnlyList<StructureUsageDto>>> GetStructureUsages(
        int projectId,
        [FromQuery] string? targetKind,
        [FromQuery] int? targetId,
        [FromQuery] int? structureId)
    {
        var result = await structureService.GetStructureUsagesAsync(projectId, targetKind, targetId, structureId);
        return ToActionResult(result);
    }

    [HttpPost("{structureId:int}/usages")]
    public async Task<ActionResult<StructureUsageDto>> AssignStructure(
        int projectId,
        int structureId,
        StructureUsageRequest request)
    {
        var result = await structureService.AssignStructureAsync(projectId, structureId, request);
        return result.Status switch
        {
            StructureServiceStatus.Success => CreatedAtAction(
                nameof(GetStructureUsages),
                new { projectId, structureId = result.Value!.StructureId },
                result.Value),
            StructureServiceStatus.NotFound => NotFound(),
            StructureServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("usages/{usageId:int}")]
    public async Task<ActionResult<StructureUsageDto>> UpdateStructureUsage(
        int projectId,
        int usageId,
        StructureUsageRequest request)
    {
        var result = await structureService.UpdateStructureUsageAsync(projectId, usageId, request);
        return ToActionResult(result);
    }

    [HttpPost("usages/{usageId:int}/make-individual")]
    public async Task<ActionResult<StructureUsageDto>> MakeStructureUsageIndividual(int projectId, int usageId)
    {
        var result = await structureService.MakeStructureUsageIndividualAsync(projectId, usageId);
        return ToActionResult(result);
    }

    [HttpDelete("usages/{usageId:int}")]
    public async Task<IActionResult> DeleteStructureUsage(int projectId, int usageId)
    {
        var result = await structureService.DeleteStructureUsageAsync(projectId, usageId);
        return ToNoContentResult(result);
    }

    [HttpGet("assignments")]
    public async Task<ActionResult<IReadOnlyList<StructureAssignmentDto>>> GetStructureAssignments(
        int projectId,
        [FromQuery] int? structureUsageId,
        [FromQuery] int? structureId,
        [FromQuery] int? structureNodeId,
        [FromQuery] int? storyObjectId)
    {
        var result = await structureService.GetStructureAssignmentsAsync(
            projectId,
            structureUsageId,
            structureId,
            structureNodeId,
            storyObjectId);
        return ToActionResult(result);
    }

    [HttpPost("usages/{usageId:int}/assignments")]
    public async Task<ActionResult<StructureAssignmentDto>> AssignObjectToStructure(
        int projectId,
        int usageId,
        StructureAssignmentRequest request)
    {
        var result = await structureService.AssignObjectToStructureAsync(projectId, usageId, request);
        return result.Status switch
        {
            StructureServiceStatus.Success => CreatedAtAction(
                nameof(GetStructureAssignments),
                new { projectId, structureUsageId = result.Value!.StructureUsageId },
                result.Value),
            StructureServiceStatus.NotFound => NotFound(),
            StructureServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPut("assignments/{assignmentId:int}")]
    public async Task<ActionResult<StructureAssignmentDto>> UpdateStructureAssignment(
        int projectId,
        int assignmentId,
        StructureAssignmentRequest request)
    {
        var result = await structureService.UpdateStructureAssignmentAsync(projectId, assignmentId, request);
        return ToActionResult(result);
    }

    [HttpDelete("assignments/{assignmentId:int}")]
    public async Task<IActionResult> DeleteStructureAssignment(int projectId, int assignmentId)
    {
        var result = await structureService.DeleteStructureAssignmentAsync(projectId, assignmentId);
        return ToNoContentResult(result);
    }

    private ActionResult<TValue> ToActionResult<TValue>(StructureServiceResult<TValue> result)
    {
        return result.Status switch
        {
            StructureServiceStatus.Success => Ok(result.Value),
            StructureServiceStatus.NotFound => NotFound(),
            StructureServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    private IActionResult ToNoContentResult(StructureServiceResult result)
    {
        return result.Status switch
        {
            StructureServiceStatus.Success => NoContent(),
            StructureServiceStatus.NotFound => NotFound(),
            StructureServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
