using System.Text.Json;

namespace StoryDB.Api.Services.TemplatePacks;

public sealed partial class TemplatePackService
{
    private async Task ApplySnapshotAsync(
        int projectId,
        string snapshotJson,
        CancellationToken cancellationToken)
    {
        var snapshot = JsonSerializer.Deserialize<TemplatePackSnapshot>(snapshotJson, JsonOptions);
        if (snapshot is null)
        {
            return;
        }

        await ApplyAttributesAsync(projectId, snapshot.Attributes, cancellationToken);
        await ApplyCatalogsAsync(projectId, snapshot.Catalogs, cancellationToken);
        await ApplyStructuresAsync(projectId, snapshot.Structures, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

}



