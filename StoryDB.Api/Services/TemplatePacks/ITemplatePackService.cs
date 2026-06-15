using StoryDB.Api.Contracts.TemplatePacks;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Services.TemplatePacks;

public interface ITemplatePackService
{
    Task<IReadOnlyList<ProjectTemplatePack>> GetTemplatePacksAsync(
        string scope,
        CancellationToken cancellationToken = default);

    Task<ProjectTemplatePack?> CreateFromProjectAsync(
        CreateTemplatePackFromProjectRequest request,
        CancellationToken cancellationToken = default);

    Task<ProjectTemplatePack?> UpdateAsync(
        int templatePackId,
        UpdateTemplatePackRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(int templatePackId, CancellationToken cancellationToken = default);

    Task<ProjectTemplatePack?> SetFavoriteAsync(
        int templatePackId,
        bool isFavorite,
        CancellationToken cancellationToken = default);

    Task<bool> ApplyTemplatePackAsync(
        int projectId,
        int templatePackId,
        CancellationToken cancellationToken = default);

    Task ApplyTemplatePacksAsync(
        int projectId,
        IReadOnlyList<int>? templatePackIds,
        CancellationToken cancellationToken = default);
}
