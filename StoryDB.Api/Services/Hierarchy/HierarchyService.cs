using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Contracts.Hierarchy;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Services.Hierarchy;

public sealed class HierarchyService(StoryDbContext dbContext) : IHierarchyService
{
    public async Task<HierarchyServiceResult<IReadOnlyList<HierarchyGroupDto>>> GetGroupsAsync(int projectId)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return HierarchyServiceResult<IReadOnlyList<HierarchyGroupDto>>.NotFound();
        }

        var groups = await dbContext.HierarchyGroups
            .AsNoTracking()
            .Where(group => group.ProjectId == projectId)
            .OrderBy(group => group.SortOrder)
            .ThenBy(group => group.Name)
            .Select(group => new HierarchyGroupDto(group.Id, group.Name, group.Nodes.Count))
            .ToListAsync();

        return HierarchyServiceResult<IReadOnlyList<HierarchyGroupDto>>.Success(groups);
    }

    public async Task<HierarchyServiceResult<HierarchyGroupDto>> CreateGroupAsync(
        int projectId,
        HierarchyGroupRequest request)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return HierarchyServiceResult<HierarchyGroupDto>.NotFound();
        }

        var validationError = RequestValidators.ValidateName(request.Name, "Hierarchy group name");
        if (validationError is not null)
        {
            return HierarchyServiceResult<HierarchyGroupDto>.Invalid(validationError);
        }

        var name = request.Name.Trim();
        var hasDuplicate = await dbContext.HierarchyGroups.AnyAsync(group =>
            group.ProjectId == projectId && group.Name == name);
        if (hasDuplicate)
        {
            return HierarchyServiceResult<HierarchyGroupDto>.Invalid("Hierarchy group with this name already exists.");
        }

        var nextSortOrder = await dbContext.HierarchyGroups
            .Where(group => group.ProjectId == projectId)
            .Select(group => (int?)group.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var group = new HierarchyGroup
        {
            ProjectId = projectId,
            Name = name,
            SortOrder = nextSortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.HierarchyGroups.Add(group);
        await dbContext.SaveChangesAsync();

        return HierarchyServiceResult<HierarchyGroupDto>.Success(new HierarchyGroupDto(group.Id, group.Name, 0));
    }

    public async Task<HierarchyServiceResult<HierarchyGroupDto>> UpdateGroupAsync(
        int projectId,
        int groupId,
        HierarchyGroupRequest request)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return HierarchyServiceResult<HierarchyGroupDto>.NotFound();
        }

        var validationError = RequestValidators.ValidateName(request.Name, "Hierarchy group name");
        if (validationError is not null)
        {
            return HierarchyServiceResult<HierarchyGroupDto>.Invalid(validationError);
        }

        var group = await dbContext.HierarchyGroups
            .Include(currentGroup => currentGroup.Nodes)
            .FirstOrDefaultAsync(currentGroup => currentGroup.ProjectId == projectId && currentGroup.Id == groupId);
        if (group is null)
        {
            return HierarchyServiceResult<HierarchyGroupDto>.NotFound();
        }

        var name = request.Name.Trim();
        var hasDuplicate = await dbContext.HierarchyGroups.AnyAsync(currentGroup =>
            currentGroup.ProjectId == projectId &&
            currentGroup.Id != groupId &&
            currentGroup.Name == name);
        if (hasDuplicate)
        {
            return HierarchyServiceResult<HierarchyGroupDto>.Invalid("Hierarchy group with this name already exists.");
        }

        group.Name = name;
        group.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return HierarchyServiceResult<HierarchyGroupDto>.Success(new HierarchyGroupDto(group.Id, group.Name, group.Nodes.Count));
    }

    public async Task<HierarchyServiceResult> DeleteGroupAsync(int projectId, int groupId)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return HierarchyServiceResult.NotFound();
        }

        var group = await dbContext.HierarchyGroups
            .Include(currentGroup => currentGroup.Nodes)
            .FirstOrDefaultAsync(currentGroup => currentGroup.ProjectId == projectId && currentGroup.Id == groupId);
        if (group is null)
        {
            return HierarchyServiceResult.NotFound();
        }

        var nodeIds = group.Nodes.Select(node => node.Id).ToList();
        var links = dbContext.HierarchyLinks.Where(link =>
            nodeIds.Contains(link.ParentNodeId) || nodeIds.Contains(link.ChildNodeId));
        dbContext.HierarchyLinks.RemoveRange(links);
        dbContext.HierarchyGroups.Remove(group);
        await dbContext.SaveChangesAsync();

        return HierarchyServiceResult.Success();
    }

    public async Task<HierarchyServiceResult<IReadOnlyList<HierarchyNodeDto>>> GetNodesAsync(
        int projectId,
        int groupId)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return HierarchyServiceResult<IReadOnlyList<HierarchyNodeDto>>.NotFound();
        }

        var nodes = await dbContext.HierarchyNodes
            .AsNoTracking()
            .Where(node => node.GroupId == groupId)
            .OrderBy(node => node.SortOrder)
            .ThenBy(node => node.Name)
            .Select(node => new HierarchyNodeDto(
                node.Id,
                node.Name,
                node.Description,
                node.ParentLinks.Select(link => link.ParentNodeId).OrderBy(id => id).ToList(),
                node.ChildLinks.Select(link => link.ChildNodeId).OrderBy(id => id).ToList()))
            .ToListAsync();

        return HierarchyServiceResult<IReadOnlyList<HierarchyNodeDto>>.Success(nodes);
    }

    public async Task<HierarchyServiceResult<HierarchyNodeDto>> CreateNodeAsync(
        int projectId,
        int groupId,
        HierarchyNodeRequest request)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return HierarchyServiceResult<HierarchyNodeDto>.NotFound();
        }

        var validationError = await ValidateNodeRequest(groupId, request, null);
        if (validationError is not null)
        {
            return HierarchyServiceResult<HierarchyNodeDto>.Invalid(validationError);
        }

        var nextSortOrder = await dbContext.HierarchyNodes
            .Where(node => node.GroupId == groupId)
            .Select(node => (int?)node.SortOrder)
            .MaxAsync() ?? 0;
        var now = DateTime.UtcNow;
        var node = new HierarchyNode
        {
            GroupId = groupId,
            Name = request.Name.Trim(),
            Description = NormalizeOptionalText(request.Description),
            SortOrder = nextSortOrder + 10,
            CreatedAt = now,
            UpdatedAt = now,
            ParentLinks = request.ParentNodeIds.Distinct().Select(parentId => new HierarchyLink
            {
                ParentNodeId = parentId,
            }).ToList(),
        };

        dbContext.HierarchyNodes.Add(node);
        await dbContext.SaveChangesAsync();

        return HierarchyServiceResult<HierarchyNodeDto>.Success(await ToDto(node.Id));
    }

    public async Task<HierarchyServiceResult<HierarchyNodeDto>> UpdateNodeAsync(
        int projectId,
        int groupId,
        int nodeId,
        HierarchyNodeRequest request)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return HierarchyServiceResult<HierarchyNodeDto>.NotFound();
        }

        var node = await dbContext.HierarchyNodes
            .Include(currentNode => currentNode.ParentLinks)
            .FirstOrDefaultAsync(currentNode => currentNode.GroupId == groupId && currentNode.Id == nodeId);
        if (node is null)
        {
            return HierarchyServiceResult<HierarchyNodeDto>.NotFound();
        }

        var validationError = await ValidateNodeRequest(groupId, request, nodeId);
        if (validationError is not null)
        {
            return HierarchyServiceResult<HierarchyNodeDto>.Invalid(validationError);
        }

        node.Name = request.Name.Trim();
        node.Description = NormalizeOptionalText(request.Description);
        node.UpdatedAt = DateTime.UtcNow;

        dbContext.HierarchyLinks.RemoveRange(node.ParentLinks);
        node.ParentLinks = request.ParentNodeIds.Distinct().Select(parentId => new HierarchyLink
        {
            ParentNodeId = parentId,
            ChildNodeId = node.Id,
        }).ToList();

        await dbContext.SaveChangesAsync();

        return HierarchyServiceResult<HierarchyNodeDto>.Success(await ToDto(node.Id));
    }

    public async Task<HierarchyServiceResult> DeleteNodeAsync(int projectId, int groupId, int nodeId)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return HierarchyServiceResult.NotFound();
        }

        var node = await dbContext.HierarchyNodes
            .FirstOrDefaultAsync(currentNode => currentNode.GroupId == groupId && currentNode.Id == nodeId);
        if (node is null)
        {
            return HierarchyServiceResult.NotFound();
        }

        var links = dbContext.HierarchyLinks.Where(link =>
            link.ParentNodeId == nodeId || link.ChildNodeId == nodeId);
        dbContext.HierarchyLinks.RemoveRange(links);
        dbContext.HierarchyNodes.Remove(node);
        await dbContext.SaveChangesAsync();

        return HierarchyServiceResult.Success();
    }

    private async Task<bool> IsHierarchyEnabled(int projectId)
    {
        return await dbContext.ObjectTypes.AnyAsync(type =>
            type.ProjectId == projectId &&
            type.Key == "hierarchy" &&
            type.IsEnabled);
    }

    private async Task<bool> GroupExists(int projectId, int groupId)
    {
        return await dbContext.HierarchyGroups.AnyAsync(group =>
            group.ProjectId == projectId && group.Id == groupId);
    }

    private async Task<string?> ValidateNodeRequest(int groupId, HierarchyNodeRequest request, int? currentNodeId)
    {
        var requestError = RequestValidators.ValidateHierarchyNode(request.Name, request.Description);
        if (requestError is not null)
        {
            return requestError;
        }

        var name = request.Name.Trim();
        var hasDuplicate = await dbContext.HierarchyNodes.AnyAsync(node =>
            node.GroupId == groupId &&
            node.Id != currentNodeId &&
            node.Name == name);
        if (hasDuplicate)
        {
            return "Hierarchy node with this name already exists.";
        }

        var parentIds = request.ParentNodeIds.Distinct().ToList();
        if (currentNodeId is not null && parentIds.Contains(currentNodeId.Value))
        {
            return "A node cannot be its own parent.";
        }

        var validParentCount = await dbContext.HierarchyNodes.CountAsync(node =>
            node.GroupId == groupId && parentIds.Contains(node.Id));
        if (validParentCount != parentIds.Count)
        {
            return "One or more parent nodes were not found.";
        }

        return null;
    }

    private async Task<HierarchyNodeDto> ToDto(int nodeId)
    {
        var node = await dbContext.HierarchyNodes
            .AsNoTracking()
            .Include(currentNode => currentNode.ParentLinks)
            .Include(currentNode => currentNode.ChildLinks)
            .FirstAsync(currentNode => currentNode.Id == nodeId);

        return new HierarchyNodeDto(
            node.Id,
            node.Name,
            node.Description,
            node.ParentLinks.Select(link => link.ParentNodeId).OrderBy(id => id).ToList(),
            node.ChildLinks.Select(link => link.ChildNodeId).OrderBy(id => id).ToList());
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
