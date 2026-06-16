namespace StoryDB.Api.Services;

internal static class ProjectCacheKeys
{
    public static string ProjectPrefix(int projectId) => $"project:{projectId}:";

    public static string RelationGraph(int projectId) => $"project:{projectId}:relation-graph";

    public static string TimelineEvents(int projectId) => $"project:{projectId}:timeline-events";

    public static string TimelineEventLinks(int projectId) => $"project:{projectId}:timeline-event-links";

    public static string TimelineLayoutRules(int projectId) => $"project:{projectId}:timeline-layout-rules";

    public static string TimelineLayoutState(int projectId) => $"project:{projectId}:timeline-layout-state";

    public static string AttributeGroups(int projectId, string typeKey) =>
        $"project:{projectId}:attribute-groups:{NormalizeKey(typeKey)}";

    public static string AttributeDefinitions(int projectId, string typeKey) =>
        $"project:{projectId}:attribute-definitions:{NormalizeKey(typeKey)}";

    public static string StructureSummaries(int projectId) => $"project:{projectId}:structure-summaries";

    public static string StructureDetailsPrefix(int projectId) => $"project:{projectId}:structure-detail:";

    public static string StructureDetail(int projectId, int structureId) =>
        $"{StructureDetailsPrefix(projectId)}{structureId}";

    public static string StructureUsages(int projectId) => $"project:{projectId}:structure-usages";

    public static string StructureAssignments(int projectId) => $"project:{projectId}:structure-assignments";

    public static string Catalogs(int projectId) => $"project:{projectId}:catalogs";

    public static string CatalogDetailsPrefix(int projectId) => $"project:{projectId}:catalog:";

    public static string CatalogExists(int projectId, int catalogId) =>
        $"{CatalogDetailsPrefix(projectId)}{catalogId}:exists";

    public static string CatalogEntries(int projectId, int catalogId) =>
        $"{CatalogDetailsPrefix(projectId)}{catalogId}:entries";

    public static string CatalogEntryGroups(int projectId, int catalogId) =>
        $"{CatalogDetailsPrefix(projectId)}{catalogId}:entry-groups";

    public static string CatalogFieldGroups(int projectId, int catalogId) =>
        $"{CatalogDetailsPrefix(projectId)}{catalogId}:field-groups";

    public static string CatalogFieldDefinitions(int projectId, int catalogId) =>
        $"{CatalogDetailsPrefix(projectId)}{catalogId}:field-definitions";

    public static string ObjectSummaries(int projectId, string? typeKey)
    {
        return $"project:{projectId}:object-summaries:{NormalizeKey(typeKey)}";
    }

    public static string ObjectDetailsPrefix(int projectId) => $"project:{projectId}:object-detail:";

    public static string ObjectDetail(int projectId, int objectId) =>
        $"{ObjectDetailsPrefix(projectId)}{objectId}";

    private static string NormalizeKey(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? "all"
            : value.Trim().ToLowerInvariant();
}
