using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services.Projects;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/projects")]
public class ProjectsController(IProjectService projectService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProjectListItemDto>>> GetProjects(CancellationToken cancellationToken)
    {
        var projects = await projectService.GetProjectsAsync(cancellationToken);

        return Ok(projects.Select(ToProjectListItemDto).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ProjectListItemDto>> CreateProject(
        CreateProjectRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateProject(request.Name, request.CoverImagePath);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var project = await projectService.CreateProjectAsync(ToProjectDraft(request), cancellationToken);
        if (project is null)
        {
            return Unauthorized();
        }

        var dto = ToProjectListItemDto(project);
        return CreatedAtAction(nameof(GetProjects), new { id = project.Id }, dto);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProjectListItemDto>> UpdateProject(
        int id,
        UpdateProjectRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = RequestValidators.ValidateProject(request.Name, request.CoverImagePath);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var project = await projectService.UpdateProjectAsync(id, ToProjectDraft(request), cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        return Ok(ToProjectListItemDto(project));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteProject(int id, CancellationToken cancellationToken)
    {
        var wasDeleted = await projectService.DeleteProjectAsync(id, cancellationToken);
        return wasDeleted ? NoContent() : NotFound();
    }

    private static ProjectDraft ToProjectDraft(CreateProjectRequest request) =>
        new(
            request.Name,
            request.CoverImagePath,
            request.EnabledObjectTypeKeys,
            request.PresetKeys);

    private static ProjectDraft ToProjectDraft(UpdateProjectRequest request) =>
        new(
            request.Name,
            request.CoverImagePath,
            request.EnabledObjectTypeKeys,
            request.PresetKeys);

    private static ProjectListItemDto ToProjectListItemDto(Project project)
    {
        return new ProjectListItemDto(
            project.Id,
            project.Name,
            project.CoverImagePath,
            project.Objects.Count,
            project.UpdatedAt,
            project.ObjectTypes
                .OrderBy(type => type.SortOrder)
                .Select(type => new ObjectTypeDto(type.Key, type.Name, type.IsEnabled))
                .ToList());
    }
}

public record CreateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);

public record UpdateProjectRequest(
    string Name,
    string? CoverImagePath,
    IReadOnlyList<string>? EnabledObjectTypeKeys,
    IReadOnlyList<string>? PresetKeys);

public record ProjectListItemDto(
    int Id,
    string Name,
    string? CoverImagePath,
    int ObjectCount,
    DateTime UpdatedAt,
    IReadOnlyList<ObjectTypeDto> ObjectTypes);

public record ObjectTypeDto(string Key, string Name, bool IsEnabled);
