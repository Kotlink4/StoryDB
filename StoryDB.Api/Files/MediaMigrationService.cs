using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Files;

public sealed class MediaMigrationService(
    StoryDbContext dbContext,
    IFileStorageService fileStorageService,
    ILogger<MediaMigrationService> logger)
{
    private readonly Dictionary<string, string> migratedPaths = new(StringComparer.OrdinalIgnoreCase);

    public async Task MigrateLegacyImagesAsync(CancellationToken cancellationToken = default)
    {
        var migratedCount = 0;

        foreach (var user in await dbContext.Users
            .Where(user => user.AvatarImagePath != null && user.AvatarImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(user.AvatarImagePath, null, path => user.AvatarImagePath = path, cancellationToken);
        }

        foreach (var project in await dbContext.Projects
            .Where(project => project.CoverImagePath != null && project.CoverImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(project.CoverImagePath, project.Id, path => project.CoverImagePath = path, cancellationToken);
        }

        foreach (var storyObject in await dbContext.Objects
            .Where(storyObject => storyObject.ImagePath != null && storyObject.ImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(storyObject.ImagePath, storyObject.ProjectId, path => storyObject.ImagePath = path, cancellationToken);
        }

        foreach (var image in await dbContext.ObjectGalleryImages
            .Include(image => image.StoryObject)
            .Where(image => image.ImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(image.ImagePath, image.StoryObject?.ProjectId, path => image.ImagePath = path, cancellationToken);
        }

        foreach (var timelineEvent in await dbContext.TimelineEvents
            .Where(timelineEvent => timelineEvent.ImagePath != null && timelineEvent.ImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(timelineEvent.ImagePath, timelineEvent.ProjectId, path => timelineEvent.ImagePath = path, cancellationToken);
        }

        foreach (var image in await dbContext.TimelineEventGalleryImages
            .Include(image => image.TimelineEvent)
            .Where(image => image.ImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(image.ImagePath, image.TimelineEvent?.ProjectId, path => image.ImagePath = path, cancellationToken);
        }

        foreach (var entry in await dbContext.CatalogEntries
            .Include(entry => entry.Catalog)
            .Where(entry => entry.ImagePath != null && entry.ImagePath.StartsWith(FileStoragePaths.LegacyImageRequestPath))
            .ToListAsync(cancellationToken))
        {
            migratedCount += await ReplacePathAsync(entry.ImagePath, entry.Catalog?.ProjectId, path => entry.ImagePath = path, cancellationToken);
        }

        if (migratedCount > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Migrated {Count} legacy image references to managed media storage.", migratedCount);
        }
    }

    private async Task<int> ReplacePathAsync(
        string? currentPath,
        int? projectId,
        Action<string> updatePath,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(currentPath) ||
            !currentPath.StartsWith(FileStoragePaths.LegacyImageRequestPath, StringComparison.OrdinalIgnoreCase))
        {
            return 0;
        }

        var newPath = await GetOrCreateMigratedPathAsync(currentPath.Trim(), projectId, cancellationToken);
        if (string.IsNullOrWhiteSpace(newPath) || newPath.Equals(currentPath, StringComparison.OrdinalIgnoreCase))
        {
            return 0;
        }

        updatePath(newPath);
        return 1;
    }

    private async Task<string?> GetOrCreateMigratedPathAsync(
        string legacyPath,
        int? projectId,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"{projectId?.ToString() ?? "global"}:{legacyPath}";
        if (migratedPaths.TryGetValue(cacheKey, out var cachedPath))
        {
            return cachedPath;
        }

        var existingAsset = await dbContext.MediaAssets
            .AsNoTracking()
            .Where(asset => asset.ProjectId == projectId && asset.LegacyPath == legacyPath)
            .OrderByDescending(asset => asset.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (existingAsset is not null)
        {
            migratedPaths[cacheKey] = existingAsset.PublicPath;
            return existingAsset.PublicPath;
        }

        var storedFile = await fileStorageService.MigrateImageAsync(legacyPath, projectId, cancellationToken);
        if (storedFile is null)
        {
            return null;
        }

        var now = DateTime.UtcNow;
        var asset = new MediaAsset
        {
            ProjectId = projectId,
            OriginalFileName = storedFile.OriginalFileName,
            StorageDirectory = storedFile.OriginalPath[..storedFile.OriginalPath.LastIndexOf('/')],
            OriginalPath = storedFile.OriginalPath,
            PublicPath = storedFile.Path,
            ContentType = storedFile.ContentType,
            Width = storedFile.Width,
            Height = storedFile.Height,
            SizeBytes = storedFile.Size,
            Sha256 = storedFile.Sha256,
            IsMigrated = true,
            LegacyPath = legacyPath,
            CreatedAt = now,
            UpdatedAt = now,
            Variants = storedFile.Variants.Select(variant => new MediaAssetVariant
            {
                VariantKey = variant.Key,
                Path = variant.Path,
                ContentType = variant.ContentType,
                Width = variant.Width,
                Height = variant.Height,
                SizeBytes = variant.Size,
                CreatedAt = now,
            }).ToList(),
        };

        dbContext.MediaAssets.Add(asset);
        migratedPaths[cacheKey] = storedFile.Path;
        return storedFile.Path;
    }
}

