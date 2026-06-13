using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;
using StoryDB.Api.Files;

namespace StoryDB.Api.Tests;

public sealed class LocalFileStorageServiceTests
{
    [Fact]
    public async Task SaveImageAsync_StoresImageUnderUploadsImages()
    {
        var rootPath = CreateTempDirectory();
        try
        {
            var service = CreateService(rootPath);
            await using var stream = new MemoryStream([1, 2, 3, 4]);
            var file = new FormFile(stream, 0, stream.Length, "file", "avatar.png")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/png",
            };

            var storedFile = await service.SaveImageAsync(file);

            Assert.StartsWith(FileStoragePaths.ImageRequestPath, storedFile.Path);
            Assert.EndsWith(".png", storedFile.Path);
            Assert.True(File.Exists(Path.Combine(rootPath, storedFile.Path.TrimStart('/').Replace('/', Path.DirectorySeparatorChar))));
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

    private static LocalFileStorageService CreateService(string rootPath) =>
        new(
            new TestWebHostEnvironment(rootPath),
            NullLogger<LocalFileStorageService>.Instance);

    private static string CreateTempDirectory()
    {
        var path = Path.Combine(Path.GetTempPath(), "storydb-file-storage-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }

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
