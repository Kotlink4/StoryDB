using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Structures;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Services;

namespace StoryDB.Api.Services.Structures;

public sealed partial class StructureService
{
    public async Task<StructureServiceResult<IReadOnlyList<StructureSummaryDto>>> GetStructuresAsync(
        int projectId,
        string? ownerKind,
        int? ownerId)
    {
        if (!await ProjectExists(projectId))
        {
            return StructureServiceResult<IReadOnlyList<StructureSummaryDto>>.NotFound();
        }

        var normalizedOwnerKind = NormalizeOptionalText(ownerKind);
        var query = dbContext.Structures
            .AsNoTracking()
            .Where(structure => structure.ProjectId == projectId);

        if (normalizedOwnerKind is not null)
        {
            query = query.Where(structure => structure.OwnerKind == normalizedOwnerKind);
        }

        if (ownerId is not null)
        {
            query = query.Where(structure => structure.OwnerId == ownerId);
        }

        var structures = normalizedOwnerKind is null && ownerId is null
            ? await cacheSingleFlight.GetOrCreateAsync(
                ProjectCacheKeys.StructureSummaries(projectId),
                async entry =>
                {
                    entry.AbsoluteExpirationRelativeToNow = StructureReadCacheDuration;
                    return await ReadStructureSummariesAsync(query);
                })
            : await ReadStructureSummariesAsync(query);

        return StructureServiceResult<IReadOnlyList<StructureSummaryDto>>.Success(structures);
    }

    public async Task<StructureServiceResult<StructureDto>> GetStructureAsync(int projectId, int structureId)
    {
        if (!await StructureExists(projectId, structureId))
        {
            return StructureServiceResult<StructureDto>.NotFound();
        }

        return StructureServiceResult<StructureDto>.Success(await GetCachedStructureDto(projectId, structureId));
    }

    private async Task<List<StructureSummaryDto>> ReadStructureSummariesAsync(IQueryable<Structure> query)
    {
        var summaries = await query
            .OrderBy(structure => structure.Name)
            .Select(structure => new StructureSummaryDto(
                structure.Id,
                structure.ProjectId,
                structure.Name,
                structure.Description,
                structure.OwnerKind,
                structure.OwnerId,
                structure.ApplicationScope,
                structure.LayoutKind,
                "none",
                "manual",
                null,
                structure.Nodes.Count,
                structure.Edges.Count,
                structure.Usages.Count,
                structure.Usages.SelectMany(usage => usage.Assignments).Count(),
                0))
            .ToListAsync();

        if (summaries.Count == 0)
        {
            return summaries;
        }

        var counts = await CountTimelineReferencesByStructure(
            summaries[0].ProjectId,
            summaries.Select(summary => summary.Id).ToArray());

        return summaries
            .Select(summary => summary with
            {
                TimelineReferenceCount = counts.GetValueOrDefault(summary.Id),
            })
            .ToList();
    }
}
