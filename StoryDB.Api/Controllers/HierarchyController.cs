using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data;
using StoryDB.Api.Data.Entities;
using StoryDB.Api.Validation;

namespace StoryDB.Api.Controllers;

[ApiController]
[Route("api/projects/{projectId:int}/hierarchies")]
public class HierarchyController(StoryDbContext dbContext) : ControllerBase
{
    [HttpGet("groups")]
    public async Task<ActionResult<IReadOnlyList<HierarchyGroupDto>>> GetGroups(int projectId)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return NotFound();
        }

        var groups = await dbContext.HierarchyGroups
            .AsNoTracking()
            .Where(group => group.ProjectId == projectId)
            .OrderBy(group => group.SortOrder)
            .ThenBy(group => group.Name)
            .Select(group => new HierarchyGroupDto(group.Id, group.Name, group.Nodes.Count))
            .ToListAsync();

        return Ok(groups);
    }

    [HttpPost("groups")]
    public async Task<ActionResult<HierarchyGroupDto>> CreateGroup(int projectId, HierarchyGroupRequest request)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return NotFound();
        }

        var validationError = RequestValidators.ValidateName(request.Name, "Hierarchy group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var name = request.Name.Trim();
        var hasDuplicate = await dbContext.HierarchyGroups.AnyAsync(group =>
            group.ProjectId == projectId && group.Name == name);
        if (hasDuplicate)
        {
            return BadRequest("Hierarchy group with this name already exists.");
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

        return CreatedAtAction(nameof(GetGroups), new { projectId }, new HierarchyGroupDto(group.Id, group.Name, 0));
    }

    [HttpPut("groups/{groupId:int}")]
    public async Task<ActionResult<HierarchyGroupDto>> UpdateGroup(
        int projectId,
        int groupId,
        HierarchyGroupRequest request)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return NotFound();
        }

        var validationError = RequestValidators.ValidateName(request.Name, "Hierarchy group name");
        if (validationError is not null)
        {
            return BadRequest(validationError);
        }

        var group = await dbContext.HierarchyGroups
            .Include(currentGroup => currentGroup.Nodes)
            .FirstOrDefaultAsync(currentGroup => currentGroup.ProjectId == projectId && currentGroup.Id == groupId);
        if (group is null)
        {
            return NotFound();
        }

        var name = request.Name.Trim();
        var hasDuplicate = await dbContext.HierarchyGroups.AnyAsync(currentGroup =>
            currentGroup.ProjectId == projectId &&
            currentGroup.Id != groupId &&
            currentGroup.Name == name);
        if (hasDuplicate)
        {
            return BadRequest("Hierarchy group with this name already exists.");
        }

        group.Name = name;
        group.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(new HierarchyGroupDto(group.Id, group.Name, group.Nodes.Count));
    }

    [HttpDelete("groups/{groupId:int}")]
    public async Task<IActionResult> DeleteGroup(int projectId, int groupId)
    {
        if (!await IsHierarchyEnabled(projectId))
        {
            return NotFound();
        }

        var group = await dbContext.HierarchyGroups
            .Include(currentGroup => currentGroup.Nodes)
            .FirstOrDefaultAsync(currentGroup => currentGroup.ProjectId == projectId && currentGroup.Id == groupId);
        if (group is null)
        {
            return NotFound();
        }

        var nodeIds = group.Nodes.Select(node => node.Id).ToList();
        var links = dbContext.HierarchyLinks.Where(link =>
            nodeIds.Contains(link.ParentNodeId) || nodeIds.Contains(link.ChildNodeId));
        dbContext.HierarchyLinks.RemoveRange(links);
        dbContext.HierarchyGroups.Remove(group);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    [HttpGet("groups/{groupId:int}/nodes")]
    public async Task<ActionResult<IReadOnlyList<HierarchyNodeDto>>> GetNodes(int projectId, int groupId)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return NotFound();
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

        return Ok(nodes);
    }

    [HttpPost("groups/{groupId:int}/nodes")]
    public async Task<ActionResult<HierarchyNodeDto>> CreateNode(
        int projectId,
        int groupId,
        HierarchyNodeRequest request)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return NotFound();
        }

        var validationError = await ValidateNodeRequest(groupId, request, null);
        if (validationError is not null)
        {
            return BadRequest(validationError);
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

        return CreatedAtAction(nameof(GetNodes), new { projectId, groupId }, await ToDto(node.Id));
    }

    [HttpPut("groups/{groupId:int}/nodes/{nodeId:int}")]
    public async Task<ActionResult<HierarchyNodeDto>> UpdateNode(
        int projectId,
        int groupId,
        int nodeId,
        HierarchyNodeRequest request)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return NotFound();
        }

        var node = await dbContext.HierarchyNodes
            .Include(currentNode => currentNode.ParentLinks)
            .FirstOrDefaultAsync(currentNode => currentNode.GroupId == groupId && currentNode.Id == nodeId);
        if (node is null)
        {
            return NotFound();
        }

        var validationError = await ValidateNodeRequest(groupId, request, nodeId);
        if (validationError is not null)
        {
            return BadRequest(validationError);
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

        return Ok(await ToDto(node.Id));
    }

    [HttpDelete("groups/{groupId:int}/nodes/{nodeId:int}")]
    public async Task<IActionResult> DeleteNode(int projectId, int groupId, int nodeId)
    {
        if (!await IsHierarchyEnabled(projectId) || !await GroupExists(projectId, groupId))
        {
            return NotFound();
        }

        var node = await dbContext.HierarchyNodes
            .FirstOrDefaultAsync(currentNode => currentNode.GroupId == groupId && currentNode.Id == nodeId);
        if (node is null)
        {
            return NotFound();
        }

        var links = dbContext.HierarchyLinks.Where(link =>
            link.ParentNodeId == nodeId || link.ChildNodeId == nodeId);
        dbContext.HierarchyLinks.RemoveRange(links);
        dbContext.HierarchyNodes.Remove(node);
        await dbContext.SaveChangesAsync();

        return NoContent();
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

public record HierarchyGroupRequest(string Name);

public record HierarchyNodeRequest(
    string Name,
    string? Description,
    IReadOnlyList<int> ParentNodeIds);

public record HierarchyGroupDto(int Id, string Name, int NodeCount);

public record HierarchyNodeDto(
    int Id,
    string Name,
    string? Description,
    IReadOnlyList<int> ParentNodeIds,
    IReadOnlyList<int> ChildNodeIds);
