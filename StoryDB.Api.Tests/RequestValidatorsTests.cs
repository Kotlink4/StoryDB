using StoryDB.Api.Validation;

namespace StoryDB.Api.Tests;

public class RequestValidatorsTests
{
    private static readonly HashSet<string> CatalogHierarchyModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "entries",
        "entriesInGroup",
        "groups",
    };

    private static readonly HashSet<string> FieldTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "longText",
        "number",
        "select",
        "entryReference",
        "multipleEntryReference",
    };

    private static readonly HashSet<string> AttributeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text",
        "number",
        "select",
    };

    [Fact]
    public void ValidateStoryObject_ChecksCurrentStatusAndUploadedImage()
    {
        var statusError = RequestValidators.ValidateStoryObject(
            "Lilia",
            null,
            null,
            null,
            null,
            null,
            new string('x', 121),
            null);
        var imageError = RequestValidators.ValidateStoryObject(
            "Lilia",
            null,
            null,
            null,
            null,
            null,
            "Active",
            "/external/lilia.png");
        var legacyImageError = RequestValidators.ValidateStoryObject(
            "Lilia",
            null,
            null,
            null,
            null,
            null,
            "Active",
            "/uploads/images/lilia.png");
        var valid = RequestValidators.ValidateStoryObject(
            "Lilia",
            "Crowell",
            "Crowell",
            "Description",
            "17",
            "Hero",
            "Active",
            "/uploads/projects/3/images/2026/06/lilia/gallery.webp");

        Assert.Equal("Current status must be 120 characters or shorter.", statusError);
        Assert.Equal("Object image path must reference an uploaded image.", imageError);
        Assert.Equal("Object image path must reference an uploaded image.", legacyImageError);
        Assert.Null(valid);
    }

    [Fact]
    public void ValidateCatalog_ChecksHierarchyModeAndDescription()
    {
        var unsupportedMode = RequestValidators.ValidateCatalog(
            "Factions",
            null,
            "unknown",
            CatalogHierarchyModes);
        var longDescription = RequestValidators.ValidateCatalog(
            "Factions",
            new string('x', 1001),
            "entries",
            CatalogHierarchyModes);
        var valid = RequestValidators.ValidateCatalog("Factions", "Known groups", "groups", CatalogHierarchyModes);

        Assert.Equal("Unsupported catalog hierarchy mode.", unsupportedMode);
        Assert.Equal("Description must be 1000 characters or shorter.", longDescription);
        Assert.Null(valid);
    }

    [Fact]
    public void ValidateCatalogFieldDefinition_ChecksSelectOptionsReferenceCatalogAndRanges()
    {
        var selectError = RequestValidators.ValidateCatalogFieldDefinition(
            "Rank",
            "select",
            null,
            null,
            [],
            null,
            FieldTypes);
        var referenceError = RequestValidators.ValidateCatalogFieldDefinition(
            "Parent",
            "entryReference",
            null,
            null,
            null,
            null,
            FieldTypes);
        var rangeError = RequestValidators.ValidateCatalogFieldDefinition(
            "Power",
            "number",
            10,
            1,
            null,
            null,
            FieldTypes);
        var valid = RequestValidators.ValidateCatalogFieldDefinition(
            "Parent",
            "multipleEntryReference",
            null,
            null,
            null,
            42,
            FieldTypes);

        Assert.Equal("Select fields require at least one option.", selectError);
        Assert.Equal("Reference catalog is required.", referenceError);
        Assert.Equal("Minimum value cannot be greater than maximum value.", rangeError);
        Assert.Null(valid);
    }

    [Fact]
    public void ValidateAttributeDefinitions_ChecksTypeKeyDataTypeOptionsAndIconLength()
    {
        var missingType = RequestValidators.ValidateAttributeDefinition(
            "",
            "Power",
            "number",
            null,
            null,
            null,
            null,
            null,
            AttributeTypes);
        var selectError = RequestValidators.ValidateAttributeDefinition(
            "characters",
            "Rank",
            "select",
            null,
            null,
            null,
            null,
            [],
            AttributeTypes);
        var iconError = RequestValidators.ValidateAttributeGroup(
            "characters",
            "Main",
            new string('x', 81));
        var valid = RequestValidators.ValidateAttributeDefinition(
            "characters",
            "Power",
            "number",
            0,
            100,
            "pts",
            "heart",
            null,
            AttributeTypes);

        Assert.Equal("Object type key is required.", missingType);
        Assert.Equal("Select attributes require at least one option.", selectError);
        Assert.Equal("Attribute group icon key must be 80 characters or shorter.", iconError);
        Assert.Null(valid);
    }

    [Fact]
    public void ValidateAuthProfile_ChecksUploadedAvatarImage()
    {
        var externalPathError = RequestValidators.ValidateAuthProfile(
            "writer@example.com",
            "Writer",
            "/external/avatar.png");
        var nonImageUploadError = RequestValidators.ValidateAuthProfile(
            "writer@example.com",
            "Writer",
            "/uploads/documents/avatar.txt");
        var valid = RequestValidators.ValidateAuthProfile(
            "writer@example.com",
            "Writer",
            "/uploads/global/images/avatar.webp");

        Assert.Equal("Avatar image path must reference an uploaded image.", externalPathError);
        Assert.Equal("Avatar image path must reference an uploaded image.", nonImageUploadError);
        Assert.Null(valid);
    }
}
