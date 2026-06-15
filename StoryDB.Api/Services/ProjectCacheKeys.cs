namespace StoryDB.Api.Services;

internal static class ProjectCacheKeys
{
    public static string RelationGraph(int projectId) => $"project:{projectId}:relation-graph";

    public static string TimelineEvents(int projectId) => $"project:{projectId}:timeline-events";

    public static string TimelineEventLinks(int projectId) => $"project:{projectId}:timeline-event-links";

    public static string AttributeGroups(int projectId, string typeKey) =>
        $"project:{projectId}:attribute-groups:{NormalizeKey(typeKey)}";

    public static string AttributeDefinitions(int projectId, string typeKey) =>
        $"project:{projectId}:attribute-definitions:{NormalizeKey(typeKey)}";

    public static string StructureSummaries(int projectId) => $"project:{projectId}:structure-summaries";

    public static string StructureUsages(int projectId) => $"project:{projectId}:structure-usages";

    public static string StructureAssignments(int projectId) => $"project:{projectId}:structure-assignments";

    public static string ObjectSummaries(int projectId, string? typeKey)
    {
        return $"project:{projectId}:object-summaries:{NormalizeKey(typeKey)}";
    }

    private static string NormalizeKey(string? value) =>
        string.IsNullOrWhiteSpace(value)
            ? "all"
            : value.Trim().ToLowerInvariant();
}
