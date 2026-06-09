using Microsoft.AspNetCore.Mvc;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/uploads")]
public class UploadsController(IWebHostEnvironment environment) : ControllerBase
{
    private static readonly Dictionary<string, string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif",
    };

    [HttpPost("images")]
    [RequestSizeLimit(8 * 1024 * 1024)]
    public async Task<ActionResult<UploadImageDto>> UploadImage([FromForm] IFormFile file)
    {
        if (file.Length == 0)
        {
            return BadRequest("Image file is required.");
        }

        if (!AllowedContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            return BadRequest("Only JPEG, PNG, WebP, and GIF images are supported.");
        }

        var imagesPath = Path.Combine(environment.ContentRootPath, "uploads", "images");
        Directory.CreateDirectory(imagesPath);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(imagesPath, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        return Ok(new UploadImageDto($"/uploads/images/{fileName}"));
    }
}

public record UploadImageDto(string path);
