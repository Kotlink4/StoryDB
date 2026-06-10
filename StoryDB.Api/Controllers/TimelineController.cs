using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/timeline/events")]
public class TimelineController(StoryDbContext dbContext) : ControllerBase
{
    private static readonly HashSet<string> SupportedTargetTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "storyObject",
        "catalog",
        "catalogEntry",
        "catalogEntryGroup",
        "characterRelationship",
        "objectRelation",
        "attributeDefinition",
        "hierarchyNode",
        "custom",
    };

    private static readonly HashSet<string> SupportedChangeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "field",
        "attribute",
        "relationship",
        "ownership",
        "catalogSelection",
        "hierarchySelection",
        "location",
        "status",
        "custom",
    };

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TimelineEventDto>>> GetEvents(int projectId)
    {
        if (!await dbContext.Projects.AnyAsync(project => project.Id == projectId))
        {
            return NotFound();
        }

        var events = await dbContext.TimelineEvents
            .AsNoTracking()
            .Include(timelineEvent => timelineEvent.Participants)
            .Include(timelineEvent => timelineEvent.Changes)
            .Where(timelineEvent => timelineEvent.ProjectId == projectId)
            .OrderBy(timelineEvent => timelineEvent.StartValue ?? decimal.MaxValue)
            .ThenBy(timelineEvent => timelineEvent.SortOrder)
            .ThenBy(timelineEvent => timelineEvent.Title)
            .Select(timelineEvent => ToDto(timelineEvent))
            .ToListAsync();

        return Ok(events);
    }

    [HttpGet("{eventId:int}")]
    public async Task<ActionResult<TimelineEventDto>> GetEvent(int projectId, int eventId)
    {
        var timelineEvent = await dbContext.TimelineEvents
            .AsNoTracking()
            .Include(currentEvent => currentEvent.Participants)
            .Include(currentEvent => currentEvent.Changes)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);

        if (timelineEvent is null)
        {
            return NotFound();
        }

        return Ok(ToDto(timelineEvent));
    }

    [HttpPost]
    public async Task<ActionResult<TimelineEventDto>> CreateEvent(int projectId, TimelineEventRequest request)
    {
        var validationError = await ValidateTimelineEventRequest(projectId, request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var sortOrder = await dbContext.TimelineEvents
            .Where(timelineEvent => timelineEvent.ProjectId == projectId)
            .Select(timelineEvent => (int?)timelineEvent.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var timelineEvent = new TimelineEvent
        {
            ProjectId = projectId,
            Title = request.Title.Trim(),
            Description = NormalizeOptionalText(request.Description),
            StartLabel = NormalizeOptionalText(request.StartLabel),
            EndLabel = NormalizeOptionalText(request.EndLabel),
            StartValue = request.StartValue,
            EndValue = request.EndValue,
            Category = NormalizeOptionalText(request.Category),
            Color = NormalizeOptionalText(request.Color),
            SortOrder = sortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
            Participants = ToParticipants(request.Participants),
            Changes = ToChanges(request.Changes),
        };

        dbContext.TimelineEvents.Add(timelineEvent);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEvent), new { projectId, eventId = timelineEvent.Id }, ToDto(timelineEvent));
    }

    [HttpPut("{eventId:int}")]
    public async Task<ActionResult<TimelineEventDto>> UpdateEvent(
        int projectId,
        int eventId,
        TimelineEventRequest request)
    {
        var validationError = await ValidateTimelineEventRequest(projectId, request);
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var timelineEvent = await dbContext.TimelineEvents
            .Include(currentEvent => currentEvent.Participants)
            .Include(currentEvent => currentEvent.Changes)
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);
        if (timelineEvent is null)
        {
            return NotFound();
        }

        timelineEvent.Title = request.Title.Trim();
        timelineEvent.Description = NormalizeOptionalText(request.Description);
        timelineEvent.StartLabel = NormalizeOptionalText(request.StartLabel);
        timelineEvent.EndLabel = NormalizeOptionalText(request.EndLabel);
        timelineEvent.StartValue = request.StartValue;
        timelineEvent.EndValue = request.EndValue;
        timelineEvent.Category = NormalizeOptionalText(request.Category);
        timelineEvent.Color = NormalizeOptionalText(request.Color);
        timelineEvent.UpdatedAt = DateTime.UtcNow;

        dbContext.TimelineParticipants.RemoveRange(timelineEvent.Participants);
        timelineEvent.Participants = ToParticipants(request.Participants);
        dbContext.TimelineChanges.RemoveRange(timelineEvent.Changes);
        timelineEvent.Changes = ToChanges(request.Changes);

        await dbContext.SaveChangesAsync();

        return Ok(ToDto(timelineEvent));
    }

    [HttpDelete("{eventId:int}")]
    public async Task<IActionResult> DeleteEvent(int projectId, int eventId)
    {
        var timelineEvent = await dbContext.TimelineEvents
            .FirstOrDefaultAsync(currentEvent =>
                currentEvent.ProjectId == projectId &&
                currentEvent.Id == eventId);

        if (timelineEvent is null)
        {
            return NotFound();
        }

        dbContext.TimelineEvents.Remove(timelineEvent);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private async Task<string?> ValidateTimelineEventRequest(int projectId, TimelineEventRequest request)
    {
        if (!await dbContext.Projects.AnyAsync(project => project.Id == projectId))
        {
            return "Project was not found.";
        }

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return "Event title is required.";
        }

        if (request.Title.Trim().Length > 160)
        {
            return "Event title is too long.";
        }

        if (request.Description?.Trim().Length > 4000)
        {
            return "Event description is too long.";
        }

        if (request.StartLabel?.Trim().Length > 120 || request.EndLabel?.Trim().Length > 120)
        {
            return "Timeline labels are too long.";
        }

        if (request.Category?.Trim().Length > 80)
        {
            return "Event category is too long.";
        }

        if (request.Color?.Trim().Length > 40)
        {
            return "Event color is too long.";
        }

        if (request.StartValue is not null && request.EndValue is not null && request.EndValue < request.StartValue)
        {
            return "Event end value cannot be earlier than start value.";
        }

        var participantsError = await ValidateTargets(projectId, request.Participants);
        if (participantsError is not null)
        {
            return participantsError;
        }

        foreach (var change in request.Changes)
        {
            if (!SupportedChangeTypes.Contains(change.ChangeType))
            {
                return "Unsupported timeline change type.";
            }

            if (string.IsNullOrWhiteSpace(change.ChangeType))
            {
                return "Timeline change type is required.";
            }

            if (change.FieldKey?.Trim().Length > 120 || change.FieldName?.Trim().Length > 160)
            {
                return "Timeline change field name is too long.";
            }

            if (change.OldValueJson?.Trim().Length > 4000 || change.NewValueJson?.Trim().Length > 4000)
            {
                return "Timeline change value is too long.";
            }

            if (change.Notes?.Trim().Length > 2000)
            {
                return "Timeline change notes are too long.";
            }

            if (change.EffectiveFromLabel?.Trim().Length > 120 || change.EffectiveToLabel?.Trim().Length > 120)
            {
                return "Timeline change labels are too long.";
            }

            if (
                change.EffectiveFromValue is not null &&
                change.EffectiveToValue is not null &&
                change.EffectiveToValue < change.EffectiveFromValue)
            {
                return "Timeline change end value cannot be earlier than start value.";
            }
        }

        return await ValidateTargets(projectId, request.Changes);
    }

    private async Task<string?> ValidateTargets(
        int projectId,
        IEnumerable<TimelineTargetRequest> targets)
    {
        foreach (var target in targets)
        {
            if (target.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!SupportedTargetTypes.Contains(target.TargetType))
            {
                return "Unsupported timeline target type.";
            }

            if (target.TargetId <= 0)
            {
                return "Timeline target id is required.";
            }

            if (!await TargetExists(projectId, target.TargetType, target.TargetId))
            {
                return "One or more timeline targets were not found.";
            }
        }

        return null;
    }

    private async Task<bool> TargetExists(int projectId, string targetType, int targetId) =>
        targetType switch
        {
            "storyObject" => await dbContext.Objects.AnyAsync(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.Id == targetId),
            "catalog" => await dbContext.Catalogs.AnyAsync(catalog =>
                catalog.ProjectId == projectId &&
                catalog.Id == targetId),
            "catalogEntry" => await dbContext.CatalogEntries.AnyAsync(entry =>
                entry.Id == targetId &&
                entry.Catalog != null &&
                entry.Catalog.ProjectId == projectId),
            "catalogEntryGroup" => await dbContext.CatalogEntryGroups.AnyAsync(group =>
                group.Id == targetId &&
                group.Catalog != null &&
                group.Catalog.ProjectId == projectId),
            "characterRelationship" => await dbContext.CharacterRelationships.AnyAsync(relationship =>
                relationship.Id == targetId &&
                relationship.SourceCharacter != null &&
                relationship.SourceCharacter.ProjectId == projectId),
            "objectRelation" => await dbContext.ObjectRelations.AnyAsync(relation =>
                relation.Id == targetId &&
                relation.SourceObject != null &&
                relation.SourceObject.ProjectId == projectId),
            "attributeDefinition" => await dbContext.AttributeDefinitions.AnyAsync(definition =>
                definition.ProjectId == projectId &&
                definition.Id == targetId),
            "hierarchyNode" => await dbContext.HierarchyNodes.AnyAsync(node =>
                node.Id == targetId &&
                node.Group != null &&
                node.Group.ProjectId == projectId),
            _ => false,
        };

    private static List<TimelineParticipant> ToParticipants(
        IReadOnlyList<TimelineParticipantRequest> participants) =>
        participants
            .Where(participant =>
                !string.IsNullOrWhiteSpace(participant.TargetType) &&
                (participant.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase) || participant.TargetId > 0))
            .Select((participant, index) => new TimelineParticipant
            {
                TargetType = participant.TargetType.Trim(),
                TargetId = participant.TargetId,
                Role = NormalizeOptionalText(participant.Role),
                SortOrder = index,
            })
            .ToList();

    private static List<TimelineChange> ToChanges(IReadOnlyList<TimelineChangeRequest> changes) =>
        changes
            .Where(change =>
                !string.IsNullOrWhiteSpace(change.ChangeType) &&
                !string.IsNullOrWhiteSpace(change.TargetType) &&
                (change.TargetType.Equals("custom", StringComparison.OrdinalIgnoreCase) || change.TargetId > 0))
            .Select((change, index) => new TimelineChange
            {
                ChangeType = change.ChangeType.Trim(),
                TargetType = change.TargetType.Trim(),
                TargetId = change.TargetId,
                FieldKey = NormalizeOptionalText(change.FieldKey),
                FieldName = NormalizeOptionalText(change.FieldName),
                OldValueJson = NormalizeOptionalText(change.OldValueJson),
                NewValueJson = NormalizeOptionalText(change.NewValueJson),
                EffectiveFromLabel = NormalizeOptionalText(change.EffectiveFromLabel),
                EffectiveToLabel = NormalizeOptionalText(change.EffectiveToLabel),
                EffectiveFromValue = change.EffectiveFromValue,
                EffectiveToValue = change.EffectiveToValue,
                Notes = NormalizeOptionalText(change.Notes),
                SortOrder = index,
            })
            .ToList();

    private static TimelineEventDto ToDto(TimelineEvent timelineEvent) =>
        new(
            timelineEvent.Id,
            timelineEvent.Title,
            timelineEvent.Description,
            timelineEvent.StartLabel,
            timelineEvent.EndLabel,
            timelineEvent.StartValue,
            timelineEvent.EndValue,
            timelineEvent.Category,
            timelineEvent.Color,
            timelineEvent.Participants
                .OrderBy(participant => participant.SortOrder)
                .Select(participant => new TimelineParticipantDto(
                    participant.Id,
                    participant.TargetType,
                    participant.TargetId,
                    participant.Role))
                .ToList(),
            timelineEvent.Changes
                .OrderBy(change => change.SortOrder)
                .Select(change => new TimelineChangeDto(
                    change.Id,
                    change.ChangeType,
                    change.TargetType,
                    change.TargetId,
                    change.FieldKey,
                    change.FieldName,
                    change.OldValueJson,
                    change.NewValueJson,
                    change.EffectiveFromLabel,
                    change.EffectiveToLabel,
                    change.EffectiveFromValue,
                    change.EffectiveToValue,
                    change.Notes))
                .ToList());

    private static string? NormalizeOptionalText(string? value)
    {
        var normalizedValue = value?.Trim();
        return string.IsNullOrWhiteSpace(normalizedValue) ? null : normalizedValue;
    }
}

public record TimelineEventRequest(
    string Title,
    string? Description,
    string? StartLabel,
    string? EndLabel,
    decimal? StartValue,
    decimal? EndValue,
    string? Category,
    string? Color,
    IReadOnlyList<TimelineParticipantRequest> Participants,
    IReadOnlyList<TimelineChangeRequest> Changes);

public record TimelineTargetRequest(string TargetType, int TargetId);

public record TimelineParticipantRequest(
    string TargetType,
    int TargetId,
    string? Role) : TimelineTargetRequest(TargetType, TargetId);

public record TimelineChangeRequest(
    string ChangeType,
    string TargetType,
    int TargetId,
    string? FieldKey,
    string? FieldName,
    string? OldValueJson,
    string? NewValueJson,
    string? EffectiveFromLabel,
    string? EffectiveToLabel,
    decimal? EffectiveFromValue,
    decimal? EffectiveToValue,
    string? Notes) : TimelineTargetRequest(TargetType, TargetId);

public record TimelineEventDto(
    int Id,
    string Title,
    string? Description,
    string? StartLabel,
    string? EndLabel,
    decimal? StartValue,
    decimal? EndValue,
    string? Category,
    string? Color,
    IReadOnlyList<TimelineParticipantDto> Participants,
    IReadOnlyList<TimelineChangeDto> Changes);

public record TimelineParticipantDto(
    int Id,
    string TargetType,
    int TargetId,
    string? Role);

public record TimelineChangeDto(
    int Id,
    string ChangeType,
    string TargetType,
    int TargetId,
    string? FieldKey,
    string? FieldName,
    string? OldValueJson,
    string? NewValueJson,
    string? EffectiveFromLabel,
    string? EffectiveToLabel,
    decimal? EffectiveFromValue,
    decimal? EffectiveToValue,
    string? Notes);
