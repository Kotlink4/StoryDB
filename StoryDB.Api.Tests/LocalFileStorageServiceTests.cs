using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using StoryDB.Api.Files;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace StoryDB.Api.Tests;

public sealed class LocalFileStorageServiceTests
{
    [Fact]
    public async Task SaveImageAsync_StoresProcessedImageVariantsUnderManagedUploads()
    {
        var rootPath = CreateTempDirectory();
        try
        {
            var service = CreateService(rootPath);
            await using var stream = new MemoryStream(CreateTinyPngBytes());
            var file = new FormFile(stream, 0, stream.Length, "file", "avatar.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png",
            };

            var storedFile = await service.SaveImageAsync(file, projectId: 7);

            Assert.StartsWith("/uploads/projects/7/images/", storedFile.Path);
            Assert.EndsWith("/gallery.webp", storedFile.Path);
            Assert.Equal("avatar.png", storedFile.OriginalFileName);
            Assert.Equal("image/png", storedFile.ContentType);
            Assert.Equal(1, storedFile.Width);
            Assert.Equal(1, storedFile.Height);
            Assert.Equal(4, storedFile.Variants.Count);
            Assert.All(storedFile.Variants, variant => Assert.Equal("image/webp", variant.ContentType));
            Assert.True(File.Exists(ToLocalPath(rootPath, storedFile.Path)));
            Assert.True(File.Exists(ToLocalPath(rootPath, storedFile.OriginalPath)));
        }
        finally
        {
            Directory.Delete(rootPath, recursive: true);
        }
    }

    [Fact]
    public async Task SaveImageAsync_WhenDecodedPixelsExceedLimit_RejectsImageBeforeStoring()
    {
        var rootPath = CreateTempDirectory();
        try
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Media:MaxImagePixels"] = "1",
                    ["Media:MaxImageDimension"] = "12000",
                })
                .Build();
            var service = CreateService(rootPath, configuration);
            await using var stream = new MemoryStream(CreatePngBytes(width: 2, height: 1));
            var file = new FormFile(stream, 0, stream.Length, "file", "wide.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png",
            };

            var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => service.SaveImageAsync(file, projectId: 7));

            Assert.Contains("Image is too large", exception.Message);
            Assert.Empty(Directory.GetFiles(Path.Combine(rootPath, "uploads"), "*", SearchOption.AllDirectories));
        }
        finally
        {
            Directory.Delete(rootPath, recursive: true);
        }
    }

    [Fact]
    public async Task DeleteUploadedFileAsync_DoesNotDeleteFilesOutsideUploads()
    {
        var rootPath = CreateTempDirectory();
        try
        {
            var outsidePath = Path.Combine(rootPath, "outside.txt");
            await File.WriteAllTextAsync(outsidePath, "keep");

            var deleted = await CreateService(rootPath).DeleteUploadedFileAsync("/uploads/../outside.txt");

            Assert.False(deleted);
            Assert.True(File.Exists(outsidePath));
        }
        finally
        {
            Directory.Delete(rootPath, recursive: true);
        }
    }

    private static LocalFileStorageService CreateService(string rootPath, IConfiguration? configuration = null) =>
        new(
            new TestWebHostEnvironment(rootPath),
            NullLogger<LocalFileStorageService>.Instance,
            configuration);

    private static string CreateTempDirectory()
    {
        var path = Path.Combine(Path.GetTempPath(), "storydb-file-storage-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }

    private static byte[] CreateTinyPngBytes()
    {
        return CreatePngBytes(width: 1, height: 1);
    }

    private static byte[] CreatePngBytes(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height, new Rgba32(42, 96, 128));
        using var stream = new MemoryStream();
        image.SaveAsPng(stream);
        return stream.ToArray();
    }

    private static string ToLocalPath(string rootPath, string requestPath) =>
        Path.Combine(rootPath, requestPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    private sealed class TestWebHostEnvironment(string rootPath) : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Tests";
        public string ApplicationName { get; set; } = "StoryDB.Api.Tests";
        public string WebRootPath { get; set; } = rootPath;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = rootPath;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}

