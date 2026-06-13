using StoryDB.Api.Contracts.Relations;

namespace StoryDB.Api.Services.Relations;

public interface IRelationService
{
    Task<RelationServiceResult<RelationGraphDto>> GetRelationGraphAsync(int projectId);

    Task<RelationServiceResult<RelationGraphLayoutDto?>> GetDefaultLayoutAsync(int projectId);

    Task<RelationServiceResult<RelationGraphLayoutDto>> SaveDefaultLayoutAsync(
        int projectId,
        RelationGraphLayoutRequest request);
}
