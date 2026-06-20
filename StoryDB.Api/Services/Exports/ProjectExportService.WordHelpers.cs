using System.Text.RegularExpressions;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using Wp = DocumentFormat.OpenXml.Wordprocessing;

namespace StoryDB.Api.Services.Exports;

public sealed partial class ProjectExportService
{
    private static void AddKeyValueGrid(Wp.Body body, IReadOnlyList<(string Label, string Value)> values, int columns)
    {
        var widths = Enumerable.Repeat(9360 / columns, columns).ToArray();
        var table = CreateTable(widths);

        for (var index = 0; index < values.Count; index += columns)
        {
            var row = new Wp.TableRow();
            foreach (var value in values.Skip(index).Take(columns))
            {
                row.Append(CreateCell(new[]
                {
                    CreateParagraphWithText(value.Label.ToUpperInvariant(), "MetaLabel"),
                    CreateParagraphWithText(value.Value, "MetaValue"),
                }, fill: SoftFill));
            }

            table.Append(row);
        }

        body.Append(table);
    }

    private static void AddSimpleList(Wp.Body body, IEnumerable<string> values)
    {
        foreach (var value in values)
        {
            AddParagraph(body, $"- {value}");
        }
    }

    private static void AddDataTable(
        Wp.Body body,
        IReadOnlyList<int> widths,
        IReadOnlyList<string> headers,
        IEnumerable<IReadOnlyList<string>> rows)
    {
        var table = CreateTable(widths);
        var headerRow = new Wp.TableRow();
        foreach (var header in headers)
        {
            headerRow.Append(CreateCell(new[] { CreateParagraphWithText(header, "TableHeader") }, fill: LightBlueFill));
        }

        table.Append(headerRow);

        foreach (var rowValues in rows)
        {
            var row = new Wp.TableRow();
            foreach (var value in rowValues)
            {
                row.Append(CreateCell(new[] { CreateParagraphWithText(ValueOrDash(value), "TableCell") }));
            }

            table.Append(row);
        }

        body.Append(table);
    }

    private static Wp.Table CreateFactTable(IReadOnlyList<(string Label, string Value)> facts)
    {
        var table = CreateTable(new[] { 2286, 2287, 2287 });
        for (var index = 0; index < facts.Count; index += 3)
        {
            var row = new Wp.TableRow();
            foreach (var fact in facts.Skip(index).Take(3))
            {
                row.Append(CreateCell(new[]
                {
                    CreateParagraphWithText(fact.Label.ToUpperInvariant(), "MetaLabel"),
                    CreateParagraphWithText(fact.Value, "MetaValue"),
                }, fill: SoftFill));
            }

            table.Append(row);
        }

        return table;
    }

    private static Wp.Table CreateTable(IReadOnlyList<int> widths)
    {
        var table = new Wp.Table();
        table.Append(new Wp.TableProperties(
            new Wp.TableWidth { Width = widths.Sum().ToString(), Type = Wp.TableWidthUnitValues.Dxa },
            new Wp.TableIndentation { Width = 120, Type = Wp.TableWidthUnitValues.Dxa },
            new Wp.TableLayout { Type = Wp.TableLayoutValues.Fixed },
            CreateTableBorders()));
        table.Append(new Wp.TableGrid(widths.Select(width => new Wp.GridColumn { Width = width.ToString() })));

        return table;
    }

    private static Wp.TableCell CreateCell(IEnumerable<OpenXmlElement> children, string fill = "FFFFFF")
    {
        var childList = children.ToList();
        var cell = new Wp.TableCell(new Wp.TableCellProperties(
            new Wp.TableCellWidth { Width = "0", Type = Wp.TableWidthUnitValues.Auto },
            new Wp.Shading { Val = Wp.ShadingPatternValues.Clear, Color = "auto", Fill = fill },
            new Wp.TableCellMargin(
                new Wp.TopMargin { Width = "80", Type = Wp.TableWidthUnitValues.Dxa },
                new Wp.BottomMargin { Width = "80", Type = Wp.TableWidthUnitValues.Dxa },
                new Wp.StartMargin { Width = "120", Type = Wp.TableWidthUnitValues.Dxa },
                new Wp.EndMargin { Width = "120", Type = Wp.TableWidthUnitValues.Dxa }),
            new Wp.TableCellBorders(
                new Wp.TopBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
                new Wp.LeftBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
                new Wp.BottomBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
                new Wp.RightBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor })));

        foreach (var child in childList)
        {
            cell.Append(child);
        }

        if (childList.Count == 0 || childList[^1] is not Wp.Paragraph)
        {
            cell.Append(new Wp.Paragraph());
        }

        return cell;
    }

    private static Wp.TableBorders CreateTableBorders() =>
        new(
            new Wp.TopBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.LeftBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.BottomBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.RightBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.InsideHorizontalBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor },
            new Wp.InsideVerticalBorder { Val = Wp.BorderValues.Single, Size = 8, Color = BorderColor });

    private static void AddStyles(MainDocumentPart mainPart)
    {
        var stylesPart = mainPart.AddNewPart<StyleDefinitionsPart>();
        stylesPart.Styles = new Wp.Styles(
            ParagraphStyle("Normal", "Normal", 22),
            ParagraphStyle("Kicker", "Kicker", 24, bold: true, color: Muted, spacingAfter: 200),
            ParagraphStyle("CoverTitle", "Cover Title", 56, bold: true, color: Navy, spacingAfter: 80),
            ParagraphStyle("Title", "Title", 36, bold: true, color: Navy, spacingAfter: 220),
            ParagraphStyle("Subtitle", "Subtitle", 26, color: Muted, spacingAfter: 520),
            ParagraphStyle("SectionTitle", "Section Title", 44, bold: true, color: Navy, spacingBefore: 160, spacingAfter: 120),
            ParagraphStyle("Heading1", "Heading 1", 32, bold: true, color: Blue, spacingBefore: 360, spacingAfter: 200),
            ParagraphStyle("Heading2", "Heading 2", 26, bold: true, color: Blue, spacingBefore: 280, spacingAfter: 140),
            ParagraphStyle("Heading3", "Heading 3", 24, bold: true, color: DarkBlue, spacingBefore: 200, spacingAfter: 100),
            ParagraphStyle("Muted", "Muted", 21, color: Muted, spacingAfter: 160),
            ParagraphStyle("MetaLabel", "Meta Label", 17, bold: true, color: Muted, spacingAfter: 20),
            ParagraphStyle("MetaValue", "Meta Value", 21, bold: true, color: Navy, spacingAfter: 0),
            ParagraphStyle("ObjectTitle", "Object Title", 40, bold: true, color: Navy, spacingAfter: 120),
            ParagraphStyle("TableHeader", "Table Header", 18, bold: true, color: Navy, spacingAfter: 0),
            ParagraphStyle("TableCell", "Table Cell", 19, color: Ink, spacingAfter: 0));
        stylesPart.Styles.Save();
    }

    private static Wp.Style ParagraphStyle(
        string id,
        string name,
        int fontSize,
        bool bold = false,
        string color = "111827",
        int spacingBefore = 0,
        int spacingAfter = 120)
    {
        var runProperties = new Wp.StyleRunProperties(
            new Wp.RunFonts { Ascii = "Calibri", HighAnsi = "Calibri", ComplexScript = "Calibri" },
            new Wp.Color { Val = color },
            new Wp.FontSize { Val = fontSize.ToString() });

        if (bold)
        {
            runProperties.PrependChild(new Wp.Bold());
        }

        return new Wp.Style(
            new Wp.StyleName { Val = name },
            new Wp.BasedOn { Val = "Normal" },
            new Wp.NextParagraphStyle { Val = "Normal" },
            new Wp.StyleParagraphProperties(new Wp.SpacingBetweenLines
            {
                Before = spacingBefore.ToString(),
                After = spacingAfter.ToString(),
                Line = "276",
                LineRule = Wp.LineSpacingRuleValues.Auto,
            }),
            runProperties)
        {
            Type = Wp.StyleValues.Paragraph,
            StyleId = id,
            Default = id == "Normal",
        };
    }

    private static void AddKeyValue(Wp.Body body, string label, string? value)
    {
        var paragraph = CreateParagraph();
        paragraph.Append(
            new Wp.Run(new Wp.RunProperties(new Wp.Bold()), CreateText($"{label}: ")),
            new Wp.Run(CreateText(IsBlank(value) ? "-" : value!)));
        body.Append(paragraph);
    }

    private static void AddBullet(Wp.Body body, string text)
    {
        var paragraph = CreateParagraph();
        paragraph.Append(
            new Wp.Run(CreateText("- ")),
            new Wp.Run(CreateText(text)));
        body.Append(paragraph);
    }

    private static void AddParagraph(
        Wp.Body body,
        string text,
        string styleId = "Normal",
        Wp.JustificationValues? alignment = null)
    {
        var paragraph = CreateParagraph(styleId, alignment);
        paragraph.Append(new Wp.Run(CreateText(text)));
        body.Append(paragraph);
    }

    private static Wp.Paragraph CreateParagraph(
        string styleId = "Normal",
        Wp.JustificationValues? alignment = null,
        string? spacingBefore = null,
        string? spacingAfter = null)
    {
        var properties = new Wp.ParagraphProperties(new Wp.ParagraphStyleId { Val = styleId });
        if (alignment is not null)
        {
            properties.Append(new Wp.Justification { Val = alignment });
        }

        if (spacingBefore is not null || spacingAfter is not null)
        {
            properties.Append(new Wp.SpacingBetweenLines
            {
                Before = spacingBefore,
                After = spacingAfter,
                Line = "300",
                LineRule = Wp.LineSpacingRuleValues.Auto,
            });
        }

        return new Wp.Paragraph(properties);
    }

    private static Wp.Paragraph CreateParagraphWithText(
        string text,
        string styleId = "Normal",
        Wp.JustificationValues? alignment = null,
        string? spacingBefore = null,
        string? spacingAfter = null)
    {
        var paragraph = CreateParagraph(styleId, alignment, spacingBefore, spacingAfter);
        paragraph.Append(new Wp.Run(CreateText(text)));
        return paragraph;
    }

    private static Wp.Text CreateText(string text) =>
        new(text) { Space = SpaceProcessingModeValues.Preserve };

    private static void AddPageBreak(Wp.Body body) =>
        body.Append(new Wp.Paragraph(new Wp.Run(new Wp.Break { Type = Wp.BreakValues.Page })));

    private static bool IsBlank(string? value) => string.IsNullOrWhiteSpace(value);

    private static string GetObjectCountWord(int count)
    {
        var lastTwoDigits = count % 100;
        if (lastTwoDigits is >= 11 and <= 14)
        {
            return "объектов";
        }

        return (count % 10) switch
        {
            1 => "объект",
            >= 2 and <= 4 => "объекта",
            _ => "объектов",
        };
    }

    private static string ToFileName(string value)
    {
        var normalized = Regex.Replace(value.Trim().ToLowerInvariant(), @"[^a-z0-9а-яё]+", "-", RegexOptions.IgnoreCase);
        normalized = normalized.Trim('-');
        return normalized.Length == 0 ? "storydb-project" : normalized[..Math.Min(normalized.Length, 80)];
    }
}

