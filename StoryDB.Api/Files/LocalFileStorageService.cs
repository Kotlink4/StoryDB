namespace StoryDB.Api.Files;

public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment environment;
    private readonly ILogger<LocalFileStorageService> logger;

    private static readonly IReadOnlyDictionary<string, string> ImageContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif",
        };

    public LocalFileStorageService(IWebHostEnvironment environment, ILogger<LocalFileStorageService> logger)
    {
        this.environment = environment;
        this.logger = logger;
    }

    public string UploadsRootPath => Path.Combine(environment.ContentRootPath, "uploads");

    public long MaxImageBytes => 8 * 1024 * 1024;

    public IReadOnlyDictionary<string, string> AllowedImageContentTypes => ImageContentTypes;

    public void EnsureUploadsRoot() => Directory.CreateDirectory(UploadsRootPath);

    public async Task<StoredFile> SaveImageAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        if (!ImageContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            throw new InvalidOperationException("Unsupported image content type.");
        }

        var imagesPath = Path.Combine(UploadsRootPath, "images");
        Directory.CreateDirectory(imagesPath);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(imagesPath, fileName);

        await using var stream = File.Open(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await file.CopyToAsync(stream, cancellationToken);

        return new StoredFile(
            $"{FileStoragePaths.ImageRequestPath}{fileName}",
            fileName,
            file.ContentType,
            file.Length);
    }

    public bool IsUploadedImagePath(string? path) =>
        path?.Trim().StartsWith(FileStoragePaths.ImageRequestPath, StringComparison.OrdinalIgnoreCase) == true;

    public Task<bool> DeleteUploadedFileAsync(string? path, CancellationToken cancellationToken = default)
    {
        var localPath = GetLocalUploadedFilePath(path);
        if (localPath is null || !File.Exists(localPath))
        {
            return Task.FromResult(false);
        }

        try
        {
            File.Delete(localPath);
            return Task.FromResult(true);
        }
        catch (IOException exception)
        {
            logger.LogWarning(exception, "Could not delete uploaded file {Path}.", path);
            return Task.FromResult(false);
        }
        catch (UnauthorizedAccessException exception)
        {
            logger.LogWarning(exception, "Could not delete uploaded file {Path}.", path);
            return Task.FromResult(false);
        }
    }

    private string? GetLocalUploadedFilePath(string? path)
    {
        var normalizedPath = path?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedPath) ||
            !normalizedPath.StartsWith(FileStoragePaths.UploadsRequestPath, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var relativePath = normalizedPath[FileStoragePaths.UploadsRequestPath.Length..]
            .TrimStart('/', '\\')
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);
        var localPath = Path.GetFullPath(Path.Combine(UploadsRootPath, relativePath));
        var uploadsRoot = Path.GetFullPath(UploadsRootPath);

        return localPath.StartsWith(uploadsRoot, StringComparison.OrdinalIgnoreCase)
            ? localPath
            : null;
    }
}
