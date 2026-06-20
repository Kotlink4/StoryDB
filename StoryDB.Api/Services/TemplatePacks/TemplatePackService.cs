using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.TemplatePacks;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Security;
using StoryDB.Api.Services;
using StoryDB.Api.Services.Caching;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService(
    StoryDbContext dbContext,
    IProjectAccessService projectAccessService,
    ICacheSingleFlight cacheSingleFlight) : ITemplatePackService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false,
    };

    public async Task<IReadOnlyList<TemplatePackListItemDto>> GetTemplatePacksAsync(
        string scope,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return [];
        }

        var normalizedScope = scope.Trim().ToLowerInvariant();
        var query = dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .AsQueryable();

        query = normalizedScope switch
        {
            "public" => query.Where(pack => pack.IsPublic),
            "favorites" => query.Where(pack => pack.Favorites.Any(favorite => favorite.UserId == userId.Value)),
            _ => query.Where(pack => pack.OwnerUserId == userId.Value),
        };

        return await query
            .OrderByDescending(pack => pack.UpdatedAt)
            .ThenBy(pack => pack.Name)
            .Select(pack => new TemplatePackListItemDto(
                pack.Id,
                pack.Name,
                pack.Description,
                pack.IsPublic,
                pack.Favorites.Any(favorite => favorite.UserId == userId.Value),
                pack.OwnerUserId,
                pack.OwnerUser == null ? "Автор" : pack.OwnerUser.DisplayName,
                pack.SourceProjectId,
                pack.SourceProject == null ? null : pack.SourceProject.Name,
                pack.UpdatedAt,
                new TemplatePackSummaryDto(pack.AttributeCount, pack.CatalogCount, pack.StructureCount)))
            .ToListAsync(cancellationToken);
    }

    public async Task<ProjectTemplatePack?> CreateFromProjectAsync(
        CreateTemplatePackFromProjectRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return null;
        }

        if (request.Name.Trim().Length == 0)
        {
            return null;
        }

        var sourceProject = await projectAccessService.FindAccessibleProjectAsync(request.ProjectId, cancellationToken);
        if (sourceProject is null)
        {
            return null;
        }

        var snapshot = await BuildSnapshotAsync(request.ProjectId, request.Options ?? new TemplatePackExportOptions(), cancellationToken);
        var summary = ToSummary(snapshot);
        var now = DateTime.UtcNow;
        var pack = new ProjectTemplatePack
        {
            OwnerUserId = userId.Value,
            SourceProjectId = request.ProjectId,
            Name = request.Name.Trim(),
            Description = ValidationRules.NormalizeOptionalText(request.Description),
            IsPublic = request.IsPublic,
            SnapshotJson = JsonSerializer.Serialize(snapshot, JsonOptions),
            AttributeCount = summary.AttributeCount,
            CatalogCount = summary.CatalogCount,
            StructureCount = summary.StructureCount,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.ProjectTemplatePacks.Add(pack);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Include(currentPack => currentPack.OwnerUser)
            .Include(currentPack => currentPack.SourceProject)
            .Include(currentPack => currentPack.Favorites.Where(favorite => favorite.UserId == userId.Value))
            .FirstAsync(currentPack => currentPack.Id == pack.Id, cancellationToken);
    }

    public async Task<ProjectTemplatePack?> UpdateAsync(
        int templatePackId,
        UpdateTemplatePackRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null || request.Name.Trim().Length == 0)
        {
            return null;
        }

        var pack = await dbContext.ProjectTemplatePacks
            .Include(currentPack => currentPack.OwnerUser)
            .Include(currentPack => currentPack.SourceProject)
            .Include(currentPack => currentPack.Favorites.Where(favorite => favorite.UserId == userId.Value))
            .FirstOrDefaultAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
        if (pack is null || pack.OwnerUserId != userId.Value)
        {
            return null;
        }

        pack.Name = request.Name.Trim();
        pack.Description = ValidationRules.NormalizeOptionalText(request.Description);
        pack.IsPublic = request.IsPublic;
        pack.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return pack;
    }

    public async Task<bool> DeleteAsync(int templatePackId, CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return false;
        }

        var pack = await dbContext.ProjectTemplatePacks
            .FirstOrDefaultAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
        if (pack is null || pack.OwnerUserId != userId.Value)
        {
            return false;
        }

        dbContext.ProjectTemplatePacks.Remove(pack);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ProjectTemplatePack?> SetFavoriteAsync(
        int templatePackId,
        bool isFavorite,
        CancellationToken cancellationToken = default)
    {
        var userId = projectAccessService.CurrentUserId;
        if (userId is null)
        {
            return null;
        }

        var pack = await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .FirstOrDefaultAsync(currentPack =>
                currentPack.Id == templatePackId &&
                (currentPack.OwnerUserId == userId.Value || currentPack.IsPublic),
                cancellationToken);
        if (pack is null)
        {
            return null;
        }

        var favorite = await dbContext.ProjectTemplatePackFavorites
            .FirstOrDefaultAsync(currentFavorite =>
                currentFavorite.UserId == userId.Value &&
                currentFavorite.TemplatePackId == templatePackId,
                cancellationToken);

        if (isFavorite && favorite is null)
        {
            dbContext.ProjectTemplatePackFavorites.Add(new ProjectTemplatePackFavorite
            {
                UserId = userId.Value,
                TemplatePackId = templatePackId,
                CreatedAt = DateTime.UtcNow,
            });
        }

        if (!isFavorite && favorite is not null)
        {
            dbContext.ProjectTemplatePackFavorites.Remove(favorite);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Include(currentPack => currentPack.OwnerUser)
            .Include(currentPack => currentPack.SourceProject)
            .Include(currentPack => currentPack.Favorites.Where(currentFavorite => currentFavorite.UserId == userId.Value))
            .FirstAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
    }

    public async Task<bool> ApplyTemplatePackAsync(
        int projectId,
        int templatePackId,
        CancellationToken cancellationToken = default)
    {
        var pack = await FindReadablePackAsync(templatePackId, cancellationToken);
        if (pack is null)
        {
            return false;
        }

        await ApplySnapshotAsync(projectId, pack.SnapshotJson, cancellationToken);
        InvalidateProjectCaches(projectId);
        return true;
    }

    public async Task ApplyTemplatePacksAsync(
        int projectId,
        IReadOnlyList<int>? templatePackIds,
        CancellationToken cancellationToken = default)
    {
        var ids = (templatePackIds ?? [])
            .Where(id => id > 0)
            .Distinct()
            .Take(20)
            .ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var packs = await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .Where(pack => ids.Contains(pack.Id))
            .ToListAsync(cancellationToken);
        foreach (var packId in ids)
        {
            var pack = packs.FirstOrDefault(currentPack => currentPack.Id == packId);
            if (pack is null || !CanReadPack(pack))
            {
                continue;
            }

            await ApplySnapshotAsync(projectId, pack.SnapshotJson, cancellationToken);
        }

        InvalidateProjectCaches(projectId);
    }

    private void InvalidateProjectCaches(int projectId) =>
        cacheSingleFlight.RemoveByPrefix(ProjectCacheKeys.ProjectPrefix(projectId));

    private async Task<ProjectTemplatePack?> FindReadablePackAsync(int templatePackId, CancellationToken cancellationToken)
    {
        var pack = await dbContext.ProjectTemplatePacks
            .AsNoTracking()
            .FirstOrDefaultAsync(currentPack => currentPack.Id == templatePackId, cancellationToken);
        return pack is not null && CanReadPack(pack) ? pack : null;
    }

    private bool CanReadPack(ProjectTemplatePack pack)
    {
        var userId = projectAccessService.CurrentUserId;
        return userId is not null && (pack.OwnerUserId == userId.Value || pack.IsPublic);
    }
}

