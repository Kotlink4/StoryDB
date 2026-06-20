using StoryDB.Api.Contracts.Structures;

namespace StoryDB.Api.Services.Structures;

public interface IStructureService
{
    Task<StructureServiceResult<IReadOnlyList<StructureSummaryDto>>> GetStructuresAsync(
        int projectId,
        string? ownerKind,
        int? ownerId);

    Task<StructureServiceResult<StructureDto>> GetStructureAsync(int projectId, int structureId);

    Task<StructureServiceResult<StructureDto>> CreateStructureAsync(int projectId, StructureRequest request);

    Task<StructureServiceResult<StructureDto>> UpdateStructureAsync(
        int projectId,
        int structureId,
        StructureRequest request);

    Task<StructureServiceResult<StructureDto>> UpdateStructureDetailsAsync(
        int projectId,
        int structureId,
        StructureDetailsRequest request);

    Task<StructureServiceResult<StructureNodeDto>> UpdateStructureNodeDetailsAsync(
        int projectId,
        int structureId,
        int nodeId,
        StructureNodeDetailsRequest request);

    Task<StructureServiceResult> DeleteStructureAsync(int projectId, int structureId);

    Task<StructureServiceResult<IReadOnlyList<StructureUsageDto>>> GetStructureUsagesAsync(
        int projectId,
        string? targetKind,
        int? targetId,
        int? structureId);

    Task<StructureServiceResult<StructureUsageDto>> AssignStructureAsync(
        int projectId,
        int structureId,
        StructureUsageRequest request);

    Task<StructureServiceResult<StructureUsageDto>> UpdateStructureUsageAsync(
        int projectId,
        int usageId,
        StructureUsageRequest request);

    Task<StructureServiceResult<StructureUsageDto>> MakeStructureUsageIndividualAsync(int projectId, int usageId);

    Task<StructureServiceResult> DeleteStructureUsageAsync(int projectId, int usageId);

    Task<StructureServiceResult<IReadOnlyList<StructureAssignmentDto>>> GetStructureAssignmentsAsync(
        int projectId,
        int? structureUsageId,
        int? structureId,
        int? structureNodeId,
        int? storyObjectId,
        string? targetKind,
        int? targetId);

    Task<StructureServiceResult<StructureAssignmentDto>> AssignObjectToStructureAsync(
        int projectId,
        int usageId,
        StructureAssignmentRequest request);

    Task<StructureServiceResult<StructureAssignmentDto>> UpdateStructureAssignmentAsync(
        int projectId,
        int assignmentId,
        StructureAssignmentRequest request);

    Task<StructureServiceResult> DeleteStructureAssignmentAsync(int projectId, int assignmentId);
}
