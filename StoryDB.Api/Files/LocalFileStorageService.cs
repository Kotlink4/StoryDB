using System.Security.Cryptography;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace StoryDB.Api.Files;

public sealed class LocalFileStorageService : IFileStorageService
{
    private const string WebpContentType = "image/webp";
    private const long DefaultMaxImagePixels = 32_000_000;
    private const int DefaultMaxImageDimension = 12_000;
    private static readonly WebpEncoder WebpEncoder = new() { Quality = 84 };

    private readonly IWebHostEnvironment environment;
    private readonly ILogger<LocalFileStorageService> logger;
    private readonly long maxImagePixels;
    private readonly int maxImageDimension;

    private static readonly IReadOnlyDictionary<string, string> ImageContentTypes =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["image/jpeg"] = ".jpg",
            ["image/png"] = ".png",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif",
        };

    private static readonly HashSet<string> ManagedVariantFileNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "gallery.webp",
        "card.webp",
        "portrait.webp",
        "thumb.webp",
    };

    public LocalFileStorageService(
        IWebHostEnvironment environment,
        ILogger<LocalFileStorageService> logger,
        IConfiguration? configuration = null)
    {
        this.environment = environment;
        this.logger = logger;
        maxImagePixels = Math.Max(1, configuration?.GetValue("Media:MaxImagePixels", DefaultMaxImagePixels) ?? DefaultMaxImagePixels);
        maxImageDimension = Math.Max(1, configuration?.GetValue("Media:MaxImageDimension", DefaultMaxImageDimension) ?? DefaultMaxImageDimension);
    }

    public string UploadsRootPath => Path.Combine(environment.ContentRootPath, "uploads");

    public long MaxImageBytes => 8 * 1024 * 1024;

    public IReadOnlyDictionary<string, string> AllowedImageContentTypes => ImageContentTypes;

    public void EnsureUploadsRoot() => Directory.CreateDirectory(UploadsRootPath);

    public async Task<StoredFile> SaveImageAsync(
        IFormFile file,
        int? projectId = null,
        CancellationToken cancellationToken = default)
    {
        if (!ImageContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            throw new InvalidOperationException("Unsupported image content type.");
        }

        var originalFileName = NormalizeOriginalFileName(file.FileName, extension);
        await using var sourceStream = file.OpenReadStream();
        return await SaveImageCoreAsync(
            sourceStream,
            originalFileName,
            extension,
            file.ContentType,
            file.Length,
            projectId,
            cancellationToken);
    }

    public bool IsUploadedImagePath(string? path) => FileStoragePaths.IsUploadedImagePath(path);

    public Task<bool> DeleteUploadedFileAsync(string? path, CancellationToken cancellationToken = default)
    {
        var localPath = GetLocalUploadedFilePath(path);
        if (localPath is null)
        {
            return Task.FromResult(false);
        }

        try
        {
            if (TryGetManagedMediaDirectory(localPath, out var mediaDirectory) && Directory.Exists(mediaDirectory))
            {
                Directory.Delete(mediaDirectory, recursive: true);
                return Task.FromResult(true);
            }

            if (!File.Exists(localPath))
            {
                return Task.FromResult(false);
            }

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

    private async Task<StoredFile> SaveImageCoreAsync(
        Stream sourceStream,
        string originalFileName,
        string extension,
        string contentType,
        long sourceSize,
        int? projectId,
        CancellationToken cancellationToken)
    {
        EnsureUploadsRoot();

        await using var memoryStream = new MemoryStream();
        await sourceStream.CopyToAsync(memoryStream, cancellationToken);
        memoryStream.Position = 0;

        var imageInfo = await Image.IdentifyAsync(memoryStream, cancellationToken);
        if (imageInfo is null)
        {
            throw new InvalidOperationException("Uploaded file is not a valid image.");
        }

        ValidateImageDimensions(imageInfo.Width, imageInfo.Height);
        memoryStream.Position = 0;
        using var image = await Image.LoadAsync(memoryStream, cancellationToken);
        memoryStream.Position = 0;
        var sha256 = Convert.ToHexString(await SHA256.HashDataAsync(memoryStream, cancellationToken)).ToLowerInvariant();

        var now = DateTime.UtcNow;
        var mediaId = Guid.NewGuid().ToString("N");
        var year = now.ToString("yyyy");
        var month = now.ToString("MM");
        var relativeDirectory = projectId is null
            ? Path.Combine("global", "images", year, month, mediaId)
            : Path.Combine("projects", projectId.Value.ToString(), "images", year, month, mediaId);
        var localDirectory = Path.Combine(UploadsRootPath, relativeDirectory);
        Directory.CreateDirectory(localDirectory);

        var publicDirectory = projectId is null
            ? $"/uploads/global/images/{year}/{month}/{mediaId}"
            : $"/uploads/projects/{projectId.Value}/images/{year}/{month}/{mediaId}";

        var originalPath = Path.Combine(localDirectory, $"original{extension}");
        memoryStream.Position = 0;
        await using (var originalStream = File.Open(originalPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await memoryStream.CopyToAsync(originalStream, cancellationToken);
        }

        var variants = new List<StoredFileVariant>
        {
            await CreateVariantAsync(image, "gallery", 1600, 1600, ResizeMode.Max, localDirectory, publicDirectory, cancellationToken),
            await CreateVariantAsync(image, "card", 800, 520, ResizeMode.Crop, localDirectory, publicDirectory, cancellationToken),
            await CreateVariantAsync(image, "portrait", 520, 760, ResizeMode.Crop, localDirectory, publicDirectory, cancellationToken),
            await CreateVariantAsync(image, "thumb", 256, 256, ResizeMode.Crop, localDirectory, publicDirectory, cancellationToken),
        };

        var publicOriginalPath = $"{publicDirectory}/original{extension}";
        var galleryPath = variants.First(variant => variant.Key == "gallery").Path;

        logger.LogInformation(
            "Stored image {OriginalFileName} as {PublicPath} for project {ProjectId}. Size={SizeBytes}, Width={Width}, Height={Height}, Sha256={Sha256}.",
            originalFileName,
            galleryPath,
            projectId,
            sourceSize,
            image.Width,
            image.Height,
            sha256);

        return new StoredFile(
            galleryPath,
            mediaId,
            originalFileName,
            publicOriginalPath,
            contentType,
            sourceSize,
            image.Width,
            image.Height,
            sha256,
            variants);
    }

    private void ValidateImageDimensions(int width, int height)
    {
        var pixels = (long)width * height;
        if (width <= maxImageDimension &&
            height <= maxImageDimension &&
            pixels <= maxImagePixels)
        {
            return;
        }

        throw new InvalidOperationException(
            $"Image is too large. Maximum dimension is {maxImageDimension}px and maximum decoded size is {maxImagePixels} pixels.");
    }

    private static async Task<StoredFileVariant> CreateVariantAsync(
        Image image,
        string key,
        int width,
        int height,
        ResizeMode resizeMode,
        string localDirectory,
        string publicDirectory,
        CancellationToken cancellationToken)
    {
        using var variant = image.Clone(context => context
            .AutoOrient()
            .Resize(new ResizeOptions
            {
                Mode = resizeMode,
                Size = new Size(width, height),
            }));

        var fileName = $"{key}.webp";
        var localPath = Path.Combine(localDirectory, fileName);
        await variant.SaveAsWebpAsync(localPath, WebpEncoder, cancellationToken);

        var fileInfo = new FileInfo(localPath);
        return new StoredFileVariant(
            key,
            $"{publicDirectory}/{fileName}",
            WebpContentType,
            fileInfo.Length,
            variant.Width,
            variant.Height);
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

    private string NormalizeOriginalFileName(string? fileName, string extension)
    {
        var name = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(name))
        {
            return $"image{extension}";
        }

        var invalidChars = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Select(character => invalidChars.Contains(character) ? '_' : character).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(sanitized) ? $"image{extension}" : sanitized;
    }

    private static bool TryGetManagedMediaDirectory(string localPath, out string mediaDirectory)
    {
        mediaDirectory = Path.GetDirectoryName(localPath) ?? string.Empty;
        var fileName = Path.GetFileName(localPath);
        if (ManagedVariantFileNames.Contains(fileName) || fileName.StartsWith("original.", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }
}
