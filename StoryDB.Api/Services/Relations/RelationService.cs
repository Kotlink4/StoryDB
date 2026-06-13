using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Relations;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Relations;

public sealed class RelationService(StoryDbContext dbContext) : IRelationService
{
    private const string LayoutAlgorithmVersion = "relation-elk-v1";

    public async Task<RelationServiceResult<RelationGraphDto>> GetRelationGraphAsync(int projectId)
    {
        var nodes = await dbContext.Objects
            .AsNoTracking()
            .Where(storyObject =>
                storyObject.ProjectId == projectId &&
                storyObject.ObjectType != null &&
                storyObject.ObjectType.IsEnabled)
            .OrderBy(storyObject => storyObject.Name)
            .Select(storyObject => new RelationGraphNodeDto(
                storyObject.Id,
                storyObject.Name,
                storyObject.Surname,
                storyObject.ImagePath,
                storyObject.ObjectType!.Key))
            .ToListAsync();

        var nodeIds = nodes.Select(node => node.Id).ToHashSet();
        var edges = new List<RelationGraphEdgeDto>();

        var characterRelationships = await dbContext.CharacterRelationships
            .AsNoTracking()
            .Where(relationship =>
                relationship.SourceCharacter != null &&
                relationship.SourceCharacter.ProjectId == projectId &&
                nodeIds.Contains(relationship.SourceCharacterId) &&
                nodeIds.Contains(relationship.TargetCharacterId))
            .OrderBy(relationship => relationship.SortOrder)
            .Select(relationship => new RelationGraphEdgeDto(
                $"character:{relationship.Id}",
                relationship.SourceCharacterId,
                relationship.TargetCharacterId,
                relationship.RelationType,
                "character",
                relationship.Strength,
                relationship.Tension,
                relationship.IsBidirectional,
                relationship.Description))
            .ToListAsync();
        edges.AddRange(characterRelationships);

        var ownerships = await dbContext.ObjectOwnerships
            .AsNoTracking()
            .Where(ownership =>
                ownership.OwnerCharacter != null &&
                ownership.OwnerCharacter.ProjectId == projectId &&
                nodeIds.Contains(ownership.OwnerCharacterId) &&
                nodeIds.Contains(ownership.ItemObjectId))
            .OrderBy(ownership => ownership.SortOrder)
            .Select(ownership => new RelationGraphEdgeDto(
                $"ownership:{ownership.OwnerCharacterId}:{ownership.ItemObjectId}",
                ownership.OwnerCharacterId,
                ownership.ItemObjectId,
                "\u0432\u043b\u0430\u0434\u0435\u0435\u0442",
                "ownership",
                null,
                null,
                false,
                null))
            .ToListAsync();
        edges.AddRange(ownerships);

        var objectRelations = await dbContext.ObjectRelations
            .AsNoTracking()
            .Where(relation =>
                relation.SourceObject != null &&
                relation.SourceObject.ProjectId == projectId &&
                nodeIds.Contains(relation.SourceObjectId) &&
                nodeIds.Contains(relation.TargetObjectId))
            .OrderBy(relation => relation.SortOrder)
            .Select(relation => new RelationGraphEdgeDto(
                $"object:{relation.Id}",
                relation.SourceObjectId,
                relation.TargetObjectId,
                relation.RelationType,
                "object",
                null,
                null,
                false,
                null))
            .ToListAsync();
        edges.AddRange(objectRelations);

        return RelationServiceResult<RelationGraphDto>.Success(new RelationGraphDto(nodes, edges));
    }

    public async Task<RelationServiceResult<RelationGraphLayoutDto?>> GetDefaultLayoutAsync(int projectId)
    {
        var layout = await dbContext.RelationGraphLayouts
            .AsNoTracking()
            .Include(currentLayout => currentLayout.Items)
            .Where(currentLayout => currentLayout.ProjectId == projectId && currentLayout.OwnerUserId == null)
            .OrderByDescending(currentLayout => currentLayout.IsDefault)
            .ThenByDescending(currentLayout => currentLayout.GeneratedAt)
            .FirstOrDefaultAsync();

        return RelationServiceResult<RelationGraphLayoutDto?>.Success(layout is null ? null : ToLayoutDto(layout));
    }

    public async Task<RelationServiceResult<RelationGraphLayoutDto>> SaveDefaultLayoutAsync(
        int projectId,
        RelationGraphLayoutRequest request)
    {
        var projectExists = await dbContext.Projects.AnyAsync(project => project.Id == projectId);
        if (!projectExists)
        {
            return RelationServiceResult<RelationGraphLayoutDto>.NotFound();
        }

        var requestedItems = request.Items
            .GroupBy(item => item.StoryObjectId)
            .Select(group => group.Last())
            .ToList();

        var invalidLayoutItemError = requestedItems
            .Select(item => RequestValidators.ValidateRelationGraphLayoutItem(
                item.StoryObjectId,
                item.Width,
                item.Height,
                item.X,
                item.Y))
            .FirstOrDefault(error => error is not null);
        if (invalidLayoutItemError is not null)
        {
            return RelationServiceResult<RelationGraphLayoutDto>.Invalid(invalidLayoutItemError);
        }

        var requestedObjectIds = requestedItems
            .Select(item => item.StoryObjectId)
            .ToHashSet();
        var validObjectIds = await dbContext.Objects
            .Where(storyObject => storyObject.ProjectId == projectId && requestedObjectIds.Contains(storyObject.Id))
            .Select(storyObject => storyObject.Id)
            .ToListAsync();

        if (validObjectIds.Count != requestedObjectIds.Count)
        {
            return RelationServiceResult<RelationGraphLayoutDto>.Invalid("Layout contains objects from another project or missing objects.");
        }

        var now = DateTime.UtcNow;
        var layout = await dbContext.RelationGraphLayouts
            .Include(currentLayout => currentLayout.Items)
            .FirstOrDefaultAsync(currentLayout => currentLayout.ProjectId == projectId && currentLayout.OwnerUserId == null);

        if (layout is null)
        {
            layout = new RelationGraphLayout
            {
                ProjectId = projectId,
                OwnerUserId = null,
                AlgorithmVersion = LayoutAlgorithmVersion,
                IsDefault = true,
                IsStale = false,
                GeneratedAt = now,
                CreatedAt = now,
                UpdatedAt = now,
            };
            dbContext.RelationGraphLayouts.Add(layout);
        }
        else
        {
            layout.AlgorithmVersion = LayoutAlgorithmVersion;
            layout.IsDefault = true;
            layout.IsStale = false;
            layout.GeneratedAt = now;
            layout.UpdatedAt = now;
            dbContext.RelationGraphLayoutItems.RemoveRange(layout.Items);
        }

        layout.Items = requestedItems
            .Select(item => new RelationGraphLayoutItem
            {
                StoryObjectId = item.StoryObjectId,
                X = item.X,
                Y = item.Y,
                Width = item.Width,
                Height = item.Height,
                IsPinned = item.IsPinned,
                CreatedAt = now,
                UpdatedAt = now,
            })
            .ToList();

        await dbContext.SaveChangesAsync();

        return RelationServiceResult<RelationGraphLayoutDto>.Success(ToLayoutDto(layout));
    }

    private static RelationGraphLayoutDto ToLayoutDto(RelationGraphLayout layout) =>
        new(
            layout.Id,
            layout.ProjectId,
            layout.AlgorithmVersion,
            layout.IsDefault,
            layout.IsStale,
            layout.GeneratedAt,
            layout.Items
                .OrderBy(item => item.StoryObjectId)
                .Select(item => new RelationGraphLayoutItemDto(
                    item.Id,
                    item.StoryObjectId,
                    item.X,
                    item.Y,
                    item.Width,
                    item.Height,
                    item.IsPinned))
                .ToList());
}
