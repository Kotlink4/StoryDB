using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Processing;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Files;
using A = DocumentFormat.OpenXml.Drawing;
using Pic = DocumentFormat.OpenXml.Drawing.Pictures;
using Wp = DocumentFormat.OpenXml.Wordprocessing;
using Dw = DocumentFormat.OpenXml.Drawing.Wordprocessing;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService
{
    private void AddPassportBlock(
        MainDocumentPart mainPart,
        Wp.Body body,
        StoryObject storyObject,
        string objectType)
    {
        var table = CreateTable(new[] { 2500, 6860 });
        var row = new Wp.TableRow();

        var portrait = CreatePortraitParagraph(mainPart, storyObject);
        var imageChildren = portrait is null
            ? new[]
            {
                CreateParagraphWithText(
                    IsBlank(storyObject.ImagePath) ? "Портрет\nне задан" : "Портрет\nнедоступен",
                    "Muted",
                    alignment: Wp.JustificationValues.Center,
                    spacingBefore: "420",
                    spacingAfter: "420"),
            }
            : new[] { portrait };

        row.Append(
            CreateCell(imageChildren, fill: portrait is null ? LightBlueFill : "FFFFFF"),
            CreateCell(new OpenXmlElement[]
            {
                CreateParagraphWithText("ДОСЬЕ ОБЪЕКТА", "MetaLabel"),
                CreateParagraphWithText(GetObjectDisplayName(storyObject), "ObjectTitle"),
                CreateParagraphWithText(objectType, "Muted"),
                CreateFactTable(new[]
                {
                    ("Статус", ValueOrDash(storyObject.CurrentStatus)),
                    ("Возраст / время", ValueOrDash(storyObject.Age)),
                    ("Роль", ValueOrDash(storyObject.Role)),
                    ("Фамилия / дом", ValueOrDash(storyObject.Surname)),
                    ("Каталог", GetPrimaryCatalog(storyObject)),
                    ("Структура", GetPrimaryStructure(storyObject)),
                }),
            }));

        table.Append(row);
        body.Append(table);
    }

    private Wp.Paragraph? CreatePortraitParagraph(MainDocumentPart mainPart, StoryObject storyObject)
    {
        var localPath = ResolveUploadedFilePath(storyObject.ImagePath);
        if (localPath is null || !File.Exists(localPath))
        {
            return null;
        }

        try
        {
            using var image = Image.Load(localPath);
            image.Mutate(context => context
                .AutoOrient()
                .Resize(new ResizeOptions
                {
                    Mode = ResizeMode.Max,
                    Size = new Size(560, 760),
                }));

            using var pngStream = new MemoryStream();
            image.SaveAsPng(pngStream, new PngEncoder());
            pngStream.Position = 0;

            var imagePart = mainPart.AddImagePart(ImagePartType.Png);
            imagePart.FeedData(pngStream);
            var relationshipId = mainPart.GetIdOfPart(imagePart);

            const long maxWidthEmu = 1_450_000;
            const long maxHeightEmu = 1_900_000;
            var widthScale = maxWidthEmu / (double)image.Width;
            var heightScale = maxHeightEmu / (double)image.Height;
            var scale = Math.Min(widthScale, heightScale);
            var widthEmu = Math.Max(1L, (long)Math.Round(image.Width * scale));
            var heightEmu = Math.Max(1L, (long)Math.Round(image.Height * scale));

            var paragraph = CreateParagraph(alignment: Wp.JustificationValues.Center);
            paragraph.Append(new Wp.Run(CreateImageDrawing(
                relationshipId,
                storyObject.Id,
                GetObjectDisplayName(storyObject),
                widthEmu,
                heightEmu)));
            return paragraph;
        }
        catch (InvalidImageContentException)
        {
            return null;
        }
        catch (NotSupportedException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    private string? ResolveUploadedFilePath(string? requestPath)
    {
        var normalizedPath = requestPath?.Trim();
        if (!fileStorageService.IsUploadedImagePath(normalizedPath))
        {
            return null;
        }

        var relativePath = normalizedPath![FileStoragePaths.UploadsRequestPath.Length..]
            .TrimStart('/', '\\')
            .Replace('/', Path.DirectorySeparatorChar)
            .Replace('\\', Path.DirectorySeparatorChar);
        var localPath = Path.GetFullPath(Path.Combine(fileStorageService.UploadsRootPath, relativePath));
        var uploadsRoot = Path.GetFullPath(fileStorageService.UploadsRootPath);
        var uploadsRootWithSeparator = uploadsRoot.EndsWith(Path.DirectorySeparatorChar)
            ? uploadsRoot
            : $"{uploadsRoot}{Path.DirectorySeparatorChar}";

        return localPath.StartsWith(uploadsRootWithSeparator, StringComparison.OrdinalIgnoreCase)
            ? localPath
            : null;
    }

    private static Wp.Drawing CreateImageDrawing(
        string relationshipId,
        int objectId,
        string name,
        long widthEmu,
        long heightEmu)
    {
        var drawingId = (uint)Math.Max(1, objectId + 1000);
        return new Wp.Drawing(
            new Dw.Inline(
                new Dw.Extent { Cx = widthEmu, Cy = heightEmu },
                new Dw.EffectExtent
                {
                    LeftEdge = 0L,
                    TopEdge = 0L,
                    RightEdge = 0L,
                    BottomEdge = 0L,
                },
                new Dw.DocProperties
                {
                    Id = drawingId,
                    Name = $"Портрет {name}",
                    Description = $"Портрет объекта {name}",
                },
                new Dw.NonVisualGraphicFrameDrawingProperties(
                    new A.GraphicFrameLocks { NoChangeAspect = true }),
                new A.Graphic(
                    new A.GraphicData(
                        new Pic.Picture(
                            new Pic.NonVisualPictureProperties(
                                new Pic.NonVisualDrawingProperties
                                {
                                    Id = 0U,
                                    Name = $"portrait-{objectId}.png",
                                    Description = $"Портрет объекта {name}",
                                },
                                new Pic.NonVisualPictureDrawingProperties()),
                            new Pic.BlipFill(
                                new A.Blip
                                {
                                    Embed = relationshipId,
                                    CompressionState = A.BlipCompressionValues.Print,
                                },
                                new A.Stretch(new A.FillRectangle())),
                            new Pic.ShapeProperties(
                                new A.Transform2D(
                                    new A.Offset { X = 0L, Y = 0L },
                                    new A.Extents { Cx = widthEmu, Cy = heightEmu }),
                                new A.PresetGeometry(new A.AdjustValueList())
                                {
                                    Preset = A.ShapeTypeValues.Rectangle,
                                })))
                    {
                        Uri = "http://schemas.openxmlformats.org/drawingml/2006/picture",
                    }))
            {
                DistanceFromTop = 0U,
                DistanceFromBottom = 0U,
                DistanceFromLeft = 0U,
                DistanceFromRight = 0U,
            });
    }
}


