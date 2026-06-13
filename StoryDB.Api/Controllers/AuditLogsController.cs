using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Contracts.Audit;
using StoryDB.Api.Observability;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/audit-logs")]
public class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AuditLogDto>>> GetProjectLogs(
        int projectId,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var logs = await auditLogService.GetProjectLogsAsync(projectId, limit, cancellationToken);
        return Ok(logs);
    }
}
