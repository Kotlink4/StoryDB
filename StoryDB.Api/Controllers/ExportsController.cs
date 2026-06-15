using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StoryDB.Api.Contracts.Exports;
using StoryDB.Api.Services.Exports;

namespace StoryDB.Api.Controllers;

[ApiController]
[EnableRateLimiting("expensive")]
[Route("api/projects/{projectId:int}/exports")]
public sealed class ExportsController(
    IProjectExportService exportService,
    IProjectExportJobService exportJobService) : ControllerBase
{
    [HttpGet("dossiers.docx")]
    public async Task<IActionResult> ExportDossiers(
        int projectId,
        [FromQuery] int[] objectIds,
        [FromQuery] bool includeAttributes = true,
        [FromQuery] bool includeCatalogs = true,
        [FromQuery] bool includeRelations = true,
        [FromQuery] bool includeStructureAssignments = true,
        CancellationToken cancellationToken = default)
    {
        var result = await exportService.ExportDossiersAsync(
            projectId,
            new ProjectDossierExportRequest(
                objectIds,
                includeAttributes,
                includeCatalogs,
                includeRelations,
                includeStructureAssignments),
            cancellationToken);

        return result.Status switch
        {
            ProjectExportServiceStatus.Success => File(
                result.Value!.Content,
                result.Value.ContentType,
                result.Value.FileName),
            ProjectExportServiceStatus.NotFound => NotFound(),
            ProjectExportServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }

    [HttpPost("dossiers/jobs")]
    public async Task<ActionResult<ProjectExportJobDto>> EnqueueDossierExport(
        int projectId,
        ProjectDossierExportRequest request,
        CancellationToken cancellationToken = default)
    {
        var job = await exportJobService.EnqueueDossierExportAsync(projectId, request, cancellationToken);

        return AcceptedAtAction(
            nameof(GetDossierExportJob),
            new { projectId, jobId = job.Id },
            job);
    }

    [HttpGet("dossiers/jobs/{jobId:guid}")]
    public ActionResult<ProjectExportJobDto> GetDossierExportJob(int projectId, Guid jobId)
    {
        var job = exportJobService.GetJob(jobId);
        if (job is null || job.ProjectId != projectId)
        {
            return NotFound();
        }

        return Ok(job);
    }

    [HttpGet("dossiers/jobs/{jobId:guid}/download")]
    public IActionResult DownloadDossierExportJob(int projectId, Guid jobId)
    {
        var job = exportJobService.GetJob(jobId);
        if (job is null || job.ProjectId != projectId)
        {
            return NotFound();
        }

        var result = exportJobService.GetCompletedDocument(jobId);
        return result.Status switch
        {
            ProjectExportServiceStatus.Success => File(
                result.Value!.Content,
                result.Value.ContentType,
                result.Value.FileName),
            ProjectExportServiceStatus.NotFound => NotFound(),
            ProjectExportServiceStatus.Invalid => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}
