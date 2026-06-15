using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Data;

public class StoryDbContext(DbContextOptions<StoryDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<MediaAssetVariant> MediaAssetVariants => Set<MediaAssetVariant>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ObjectType> ObjectTypes => Set<ObjectType>();
    public DbSet<StoryObject> Objects => Set<StoryObject>();
    public DbSet<ObjectAttribute> ObjectAttributes => Set<ObjectAttribute>();
    public DbSet<AttributeGroup> AttributeGroups => Set<AttributeGroup>();
    public DbSet<AttributeDefinition> AttributeDefinitions => Set<AttributeDefinition>();
    public DbSet<HierarchyGroup> HierarchyGroups => Set<HierarchyGroup>();
    public DbSet<HierarchyNode> HierarchyNodes => Set<HierarchyNode>();
    public DbSet<HierarchyLink> HierarchyLinks => Set<HierarchyLink>();
    public DbSet<StoryObjectHierarchySelection> StoryObjectHierarchySelections => Set<StoryObjectHierarchySelection>();
    public DbSet<StoryObjectCatalogSelection> StoryObjectCatalogSelections => Set<StoryObjectCatalogSelection>();
    public DbSet<ObjectOwnership> ObjectOwnerships => Set<ObjectOwnership>();
    public DbSet<ObjectRelation> ObjectRelations => Set<ObjectRelation>();
    public DbSet<OrganizationStructureLevel> OrganizationStructureLevels => Set<OrganizationStructureLevel>();
    public DbSet<OrganizationStructureSlot> OrganizationStructureSlots => Set<OrganizationStructureSlot>();
    public DbSet<Structure> Structures => Set<Structure>();
    public DbSet<StructureNode> StructureNodes => Set<StructureNode>();
    public DbSet<StructureEdge> StructureEdges => Set<StructureEdge>();
    public DbSet<StructureUsage> StructureUsages => Set<StructureUsage>();
    public DbSet<StructureAssignment> StructureAssignments => Set<StructureAssignment>();
    public DbSet<CharacterRelationship> CharacterRelationships => Set<CharacterRelationship>();
    public DbSet<ObjectGalleryImage> ObjectGalleryImages => Set<ObjectGalleryImage>();
    public DbSet<Timeline> Timelines => Set<Timeline>();
    public DbSet<TimelineEvent> TimelineEvents => Set<TimelineEvent>();
    public DbSet<TimelineEventLink> TimelineEventLinks => Set<TimelineEventLink>();
    public DbSet<TimelineParticipant> TimelineParticipants => Set<TimelineParticipant>();
    public DbSet<TimelineChange> TimelineChanges => Set<TimelineChange>();
    public DbSet<TimelineEventGalleryImage> TimelineEventGalleryImages => Set<TimelineEventGalleryImage>();
    public DbSet<TimelineLayout> TimelineLayouts => Set<TimelineLayout>();
    public DbSet<TimelineLayoutItem> TimelineLayoutItems => Set<TimelineLayoutItem>();
    public DbSet<RelationGraphLayout> RelationGraphLayouts => Set<RelationGraphLayout>();
    public DbSet<RelationGraphLayoutItem> RelationGraphLayoutItems => Set<RelationGraphLayoutItem>();
    public DbSet<Catalog> Catalogs => Set<Catalog>();
    public DbSet<CatalogEntry> CatalogEntries => Set<CatalogEntry>();
    public DbSet<CatalogEntryGroup> CatalogEntryGroups => Set<CatalogEntryGroup>();
    public DbSet<CatalogFieldGroup> CatalogFieldGroups => Set<CatalogFieldGroup>();
    public DbSet<CatalogFieldDefinition> CatalogFieldDefinitions => Set<CatalogFieldDefinition>();
    public DbSet<CatalogEntryFieldValue> CatalogEntryFieldValues => Set<CatalogEntryFieldValue>();
    public DbSet<CatalogEntryHierarchyLink> CatalogEntryHierarchyLinks => Set<CatalogEntryHierarchyLink>();
    public DbSet<CatalogEntryGroupHierarchyLink> CatalogEntryGroupHierarchyLinks => Set<CatalogEntryGroupHierarchyLink>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AuditLog>()
            .HasIndex(log => log.CreatedAt);

        modelBuilder.Entity<AuditLog>()
            .HasIndex(log => new { log.ProjectId, log.CreatedAt });

        modelBuilder.Entity<AuditLog>()
            .HasIndex(log => new { log.UserId, log.CreatedAt });

        modelBuilder.Entity<AuditLog>()
            .HasIndex(log => log.TraceId);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.TraceId)
            .HasMaxLength(128);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.Action)
            .HasMaxLength(300);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.HttpMethod)
            .HasMaxLength(12);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.Path)
            .HasMaxLength(600);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.QueryString)
            .HasMaxLength(1000);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.IpAddress)
            .HasMaxLength(80);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.UserAgent)
            .HasMaxLength(512);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.RequestContentType)
            .HasMaxLength(160);

        modelBuilder.Entity<AuditLog>()
            .Property(log => log.EndpointName)
            .HasMaxLength(300);

        modelBuilder.Entity<AuditLog>()
            .HasOne(log => log.User)
            .WithMany()
            .HasForeignKey(log => log.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<AuditLog>()
            .HasOne(log => log.Project)
            .WithMany()
            .HasForeignKey(log => log.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MediaAsset>()
            .HasIndex(asset => new { asset.ProjectId, asset.CreatedAt });

        modelBuilder.Entity<MediaAsset>()
            .HasIndex(asset => new { asset.ProjectId, asset.LegacyPath });

        modelBuilder.Entity<MediaAsset>()
            .HasIndex(asset => asset.Sha256);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.OriginalFileName)
            .HasMaxLength(260);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.StorageDirectory)
            .HasMaxLength(512);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.OriginalPath)
            .HasMaxLength(512);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.PublicPath)
            .HasMaxLength(512);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.ContentType)
            .HasMaxLength(120);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.Sha256)
            .HasMaxLength(64);

        modelBuilder.Entity<MediaAsset>()
            .Property(asset => asset.LegacyPath)
            .HasMaxLength(512);

        modelBuilder.Entity<MediaAsset>()
            .HasOne(asset => asset.OwnerUser)
            .WithMany()
            .HasForeignKey(asset => asset.OwnerUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MediaAsset>()
            .HasOne(asset => asset.Project)
            .WithMany()
            .HasForeignKey(asset => asset.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MediaAssetVariant>()
            .HasIndex(variant => new { variant.MediaAssetId, variant.VariantKey })
            .IsUnique();

        modelBuilder.Entity<MediaAssetVariant>()
            .Property(variant => variant.VariantKey)
            .HasMaxLength(40);

        modelBuilder.Entity<MediaAssetVariant>()
            .Property(variant => variant.Path)
            .HasMaxLength(512);

        modelBuilder.Entity<MediaAssetVariant>()
            .Property(variant => variant.ContentType)
            .HasMaxLength(120);

        modelBuilder.Entity<MediaAssetVariant>()
            .HasOne(variant => variant.MediaAsset)
            .WithMany(asset => asset.Variants)
            .HasForeignKey(variant => variant.MediaAssetId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<AppUser>()
            .HasIndex(user => user.Email)
            .IsUnique();

        modelBuilder.Entity<AppUser>()
            .HasIndex(user => user.NormalizedEmail)
            .IsUnique();

        modelBuilder.Entity<AppUser>()
            .Property(user => user.AvatarImagePath)
            .HasMaxLength(512);

        modelBuilder.Entity<Project>()
            .HasOne(project => project.OwnerUser)
            .WithMany(user => user.Projects)
            .HasForeignKey(project => project.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ObjectType>()
            .HasIndex(type => new { type.ProjectId, type.Key })
            .IsUnique();

        modelBuilder.Entity<ObjectType>()
            .HasOne(type => type.Project)
            .WithMany(project => project.ObjectTypes)
            .HasForeignKey(type => type.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoryObject>()
            .HasOne(storyObject => storyObject.Project)
            .WithMany(project => project.Objects)
            .HasForeignKey(storyObject => storyObject.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoryObject>()
            .HasOne(storyObject => storyObject.ObjectType)
            .WithMany(type => type.Objects)
            .HasForeignKey(storyObject => storyObject.ObjectTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StoryObject>()
            .HasIndex(storyObject => new { storyObject.ProjectId, storyObject.ObjectTypeId, storyObject.Name });

        modelBuilder.Entity<StoryObject>()
            .Property(storyObject => storyObject.SurnameForm)
            .HasMaxLength(120);

        modelBuilder.Entity<ObjectAttribute>()
            .HasOne(attribute => attribute.StoryObject)
            .WithMany(storyObject => storyObject.Attributes)
            .HasForeignKey(attribute => attribute.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ObjectAttribute>()
            .HasIndex(attribute => new { attribute.StoryObjectId, attribute.SortOrder });

        modelBuilder.Entity<ObjectAttribute>()
            .HasIndex(attribute => new { attribute.StoryObjectId, attribute.AttributeDefinitionId })
            .IsUnique();

        modelBuilder.Entity<ObjectAttribute>()
            .HasOne(attribute => attribute.AttributeDefinition)
            .WithMany(definition => definition.ObjectAttributes)
            .HasForeignKey(attribute => attribute.AttributeDefinitionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ObjectGalleryImage>()
            .HasOne(image => image.StoryObject)
            .WithMany(storyObject => storyObject.GalleryImages)
            .HasForeignKey(image => image.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ObjectGalleryImage>()
            .HasIndex(image => new { image.StoryObjectId, image.SortOrder });

        modelBuilder.Entity<OrganizationStructureLevel>()
            .HasOne(level => level.OrganizationObject)
            .WithMany(storyObject => storyObject.OrganizationStructureLevels)
            .HasForeignKey(level => level.OrganizationObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrganizationStructureLevel>()
            .HasIndex(level => new { level.OrganizationObjectId, level.SortOrder });

        modelBuilder.Entity<OrganizationStructureLevel>()
            .Property(level => level.Name)
            .HasMaxLength(160);

        modelBuilder.Entity<OrganizationStructureLevel>()
            .Property(level => level.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<OrganizationStructureSlot>()
            .HasOne(slot => slot.OrganizationStructureLevel)
            .WithMany(level => level.Slots)
            .HasForeignKey(slot => slot.OrganizationStructureLevelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrganizationStructureSlot>()
            .HasIndex(slot => new { slot.OrganizationStructureLevelId, slot.SortOrder });

        modelBuilder.Entity<OrganizationStructureSlot>()
            .Property(slot => slot.Name)
            .HasMaxLength(160);

        modelBuilder.Entity<OrganizationStructureSlot>()
            .Property(slot => slot.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<OrganizationStructureSlot>()
            .Property(slot => slot.SlotType)
            .HasMaxLength(80);

        modelBuilder.Entity<OrganizationStructureSlot>()
            .Property(slot => slot.Color)
            .HasMaxLength(40);

        modelBuilder.Entity<OrganizationStructureSlot>()
            .Property(slot => slot.IconKey)
            .HasMaxLength(80);

        modelBuilder.Entity<Structure>()
            .HasOne(structure => structure.Project)
            .WithMany()
            .HasForeignKey(structure => structure.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Structure>()
            .HasOne(structure => structure.LinkedCatalog)
            .WithMany()
            .HasForeignKey(structure => structure.LinkedCatalogId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Structure>()
            .HasIndex(structure => new { structure.ProjectId, structure.OwnerKind, structure.OwnerId });

        modelBuilder.Entity<Structure>()
            .HasIndex(structure => new { structure.ProjectId, structure.Name });

        modelBuilder.Entity<Structure>()
            .Property(structure => structure.Name)
            .HasMaxLength(160);

        modelBuilder.Entity<Structure>()
            .Property(structure => structure.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<Structure>()
            .Property(structure => structure.OwnerKind)
            .HasMaxLength(40);

        modelBuilder.Entity<Structure>()
            .Property(structure => structure.LayoutKind)
            .HasMaxLength(40);

        modelBuilder.Entity<Structure>()
            .Property(structure => structure.NodeBindingMode)
            .HasMaxLength(40);

        modelBuilder.Entity<StructureNode>()
            .HasOne(node => node.Structure)
            .WithMany(structure => structure.Nodes)
            .HasForeignKey(node => node.StructureId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureNode>()
            .HasOne(node => node.ParentNode)
            .WithMany(node => node.ChildNodes)
            .HasForeignKey(node => node.ParentNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StructureNode>()
            .HasOne(node => node.LinkedCatalogEntry)
            .WithMany()
            .HasForeignKey(node => node.LinkedCatalogEntryId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<StructureNode>()
            .HasOne(node => node.LinkedCatalogEntryGroup)
            .WithMany()
            .HasForeignKey(node => node.LinkedCatalogEntryGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<StructureNode>()
            .HasIndex(node => new { node.StructureId, node.LevelIndex, node.SortOrder });

        modelBuilder.Entity<StructureNode>()
            .Property(node => node.Name)
            .HasMaxLength(160);

        modelBuilder.Entity<StructureNode>()
            .Property(node => node.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<StructureNode>()
            .Property(node => node.NodeType)
            .HasMaxLength(80);

        modelBuilder.Entity<StructureNode>()
            .Property(node => node.Color)
            .HasMaxLength(40);

        modelBuilder.Entity<StructureNode>()
            .Property(node => node.IconKey)
            .HasMaxLength(80);

        modelBuilder.Entity<StructureEdge>()
            .HasOne(edge => edge.Structure)
            .WithMany(structure => structure.Edges)
            .HasForeignKey(edge => edge.StructureId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureEdge>()
            .HasOne(edge => edge.SourceNode)
            .WithMany(node => node.OutgoingEdges)
            .HasForeignKey(edge => edge.SourceNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureEdge>()
            .HasOne(edge => edge.TargetNode)
            .WithMany(node => node.IncomingEdges)
            .HasForeignKey(edge => edge.TargetNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureEdge>()
            .HasIndex(edge => new { edge.StructureId, edge.SortOrder });

        modelBuilder.Entity<StructureEdge>()
            .HasIndex(edge => new { edge.SourceNodeId, edge.TargetNodeId, edge.RelationType });

        modelBuilder.Entity<StructureEdge>()
            .Property(edge => edge.RelationType)
            .HasMaxLength(80);

        modelBuilder.Entity<StructureEdge>()
            .Property(edge => edge.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<StructureUsage>()
            .HasOne(usage => usage.Project)
            .WithMany()
            .HasForeignKey(usage => usage.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureUsage>()
            .HasOne(usage => usage.Structure)
            .WithMany(structure => structure.Usages)
            .HasForeignKey(usage => usage.StructureId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureUsage>()
            .HasIndex(usage => new { usage.ProjectId, usage.TargetKind, usage.TargetId });

        modelBuilder.Entity<StructureUsage>()
            .HasIndex(usage => new { usage.ProjectId, usage.TargetKind, usage.TargetId, usage.StructureId })
            .IsUnique();

        modelBuilder.Entity<StructureUsage>()
            .HasIndex(usage => new { usage.StructureId, usage.TargetKind, usage.TargetId });

        modelBuilder.Entity<StructureUsage>()
            .Property(usage => usage.TargetKind)
            .HasMaxLength(40);

        modelBuilder.Entity<StructureUsage>()
            .Property(usage => usage.DisplayName)
            .HasMaxLength(160);

        modelBuilder.Entity<StructureUsage>()
            .Property(usage => usage.Notes)
            .HasMaxLength(1000);

        modelBuilder.Entity<StructureAssignment>()
            .HasOne(assignment => assignment.Project)
            .WithMany()
            .HasForeignKey(assignment => assignment.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureAssignment>()
            .HasOne(assignment => assignment.StructureUsage)
            .WithMany(usage => usage.Assignments)
            .HasForeignKey(assignment => assignment.StructureUsageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureAssignment>()
            .HasOne(assignment => assignment.StructureNode)
            .WithMany(node => node.Assignments)
            .HasForeignKey(assignment => assignment.StructureNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StructureAssignment>()
            .HasOne(assignment => assignment.StoryObject)
            .WithMany(storyObject => storyObject.StructureAssignments)
            .HasForeignKey(assignment => assignment.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StructureAssignment>()
            .HasIndex(assignment => new { assignment.ProjectId, assignment.StoryObjectId });

        modelBuilder.Entity<StructureAssignment>()
            .HasIndex(assignment => new { assignment.StructureUsageId, assignment.StructureNodeId, assignment.SortOrder });

        modelBuilder.Entity<StructureAssignment>()
            .HasIndex(assignment => new { assignment.StructureUsageId, assignment.StructureNodeId, assignment.StoryObjectId })
            .IsUnique();

        modelBuilder.Entity<StructureAssignment>()
            .Property(assignment => assignment.RoleLabel)
            .HasMaxLength(120);

        modelBuilder.Entity<StructureAssignment>()
            .Property(assignment => assignment.Notes)
            .HasMaxLength(1000);

        modelBuilder.Entity<TimelineEventGalleryImage>()
            .HasOne(image => image.TimelineEvent)
            .WithMany(timelineEvent => timelineEvent.GalleryImages)
            .HasForeignKey(image => image.TimelineEventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineEventGalleryImage>()
            .HasIndex(image => new { image.TimelineEventId, image.SortOrder });

        modelBuilder.Entity<AttributeGroup>()
            .HasIndex(group => new { group.ProjectId, group.ObjectTypeId, group.Name })
            .IsUnique();

        modelBuilder.Entity<AttributeGroup>()
            .Property(group => group.IconKey)
            .HasMaxLength(80);

        modelBuilder.Entity<AttributeGroup>()
            .HasOne(group => group.Project)
            .WithMany()
            .HasForeignKey(group => group.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttributeGroup>()
            .HasOne(group => group.ObjectType)
            .WithMany()
            .HasForeignKey(group => group.ObjectTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttributeDefinition>()
            .HasIndex(definition => new { definition.ProjectId, definition.ObjectTypeId, definition.Name })
            .IsUnique();

        modelBuilder.Entity<AttributeDefinition>()
            .Property(definition => definition.IconKey)
            .HasMaxLength(80);

        modelBuilder.Entity<AttributeDefinition>()
            .HasOne(definition => definition.Project)
            .WithMany()
            .HasForeignKey(definition => definition.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttributeDefinition>()
            .HasOne(definition => definition.ObjectType)
            .WithMany()
            .HasForeignKey(definition => definition.ObjectTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttributeDefinition>()
            .HasOne(definition => definition.AttributeGroup)
            .WithMany(group => group.Definitions)
            .HasForeignKey(definition => definition.AttributeGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<HierarchyGroup>()
            .HasIndex(group => new { group.ProjectId, group.Name })
            .IsUnique();

        modelBuilder.Entity<HierarchyGroup>()
            .HasOne(group => group.Project)
            .WithMany()
            .HasForeignKey(group => group.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HierarchyNode>()
            .HasIndex(node => new { node.GroupId, node.Name })
            .IsUnique();

        modelBuilder.Entity<HierarchyNode>()
            .HasOne(node => node.Group)
            .WithMany(group => group.Nodes)
            .HasForeignKey(node => node.GroupId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HierarchyLink>()
            .HasKey(link => new { link.ParentNodeId, link.ChildNodeId });

        modelBuilder.Entity<HierarchyLink>()
            .HasOne(link => link.ParentNode)
            .WithMany(node => node.ChildLinks)
            .HasForeignKey(link => link.ParentNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HierarchyLink>()
            .HasOne(link => link.ChildNode)
            .WithMany(node => node.ParentLinks)
            .HasForeignKey(link => link.ChildNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StoryObjectHierarchySelection>()
            .HasKey(selection => new { selection.StoryObjectId, selection.HierarchyGroupId, selection.HierarchyNodeId });

        modelBuilder.Entity<StoryObjectHierarchySelection>()
            .HasIndex(selection => new { selection.StoryObjectId, selection.SortOrder });

        modelBuilder.Entity<StoryObjectHierarchySelection>()
            .HasOne(selection => selection.StoryObject)
            .WithMany(storyObject => storyObject.HierarchySelections)
            .HasForeignKey(selection => selection.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoryObjectHierarchySelection>()
            .HasOne(selection => selection.HierarchyGroup)
            .WithMany()
            .HasForeignKey(selection => selection.HierarchyGroupId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoryObjectHierarchySelection>()
            .HasOne(selection => selection.HierarchyNode)
            .WithMany()
            .HasForeignKey(selection => selection.HierarchyNodeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .HasIndex(selection => new
            {
                selection.StoryObjectId,
                selection.TargetType,
                selection.CatalogId,
                selection.CatalogEntryGroupId,
                selection.CatalogEntryId,
            })
            .IsUnique();

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .Property(selection => selection.TargetType)
            .HasMaxLength(20);

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .HasIndex(selection => new { selection.StoryObjectId, selection.SortOrder });

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .HasOne(selection => selection.StoryObject)
            .WithMany(storyObject => storyObject.CatalogSelections)
            .HasForeignKey(selection => selection.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .HasOne(selection => selection.Catalog)
            .WithMany()
            .HasForeignKey(selection => selection.CatalogId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .HasOne(selection => selection.CatalogEntryGroup)
            .WithMany()
            .HasForeignKey(selection => selection.CatalogEntryGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StoryObjectCatalogSelection>()
            .HasOne(selection => selection.CatalogEntry)
            .WithMany()
            .HasForeignKey(selection => selection.CatalogEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ObjectOwnership>()
            .HasKey(ownership => new { ownership.OwnerCharacterId, ownership.ItemObjectId });

        modelBuilder.Entity<ObjectOwnership>()
            .HasIndex(ownership => new { ownership.OwnerCharacterId, ownership.SortOrder });

        modelBuilder.Entity<ObjectOwnership>()
            .HasIndex(ownership => new { ownership.ItemObjectId, ownership.SortOrder });

        modelBuilder.Entity<ObjectOwnership>()
            .HasOne(ownership => ownership.OwnerCharacter)
            .WithMany(storyObject => storyObject.OwnedItems)
            .HasForeignKey(ownership => ownership.OwnerCharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ObjectOwnership>()
            .HasOne(ownership => ownership.ItemObject)
            .WithMany(storyObject => storyObject.Owners)
            .HasForeignKey(ownership => ownership.ItemObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ObjectRelation>()
            .HasIndex(relation => new { relation.SourceObjectId, relation.RelationType, relation.TargetObjectId })
            .IsUnique();

        modelBuilder.Entity<ObjectRelation>()
            .HasIndex(relation => new { relation.SourceObjectId, relation.SortOrder });

        modelBuilder.Entity<ObjectRelation>()
            .HasIndex(relation => new { relation.TargetObjectId, relation.RelationType, relation.SortOrder });

        modelBuilder.Entity<ObjectRelation>()
            .Property(relation => relation.RelationType)
            .HasMaxLength(40);

        modelBuilder.Entity<ObjectRelation>()
            .HasOne(relation => relation.SourceObject)
            .WithMany(storyObject => storyObject.OutgoingRelations)
            .HasForeignKey(relation => relation.SourceObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ObjectRelation>()
            .HasOne(relation => relation.TargetObject)
            .WithMany(storyObject => storyObject.IncomingRelations)
            .HasForeignKey(relation => relation.TargetObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CharacterRelationship>()
            .HasIndex(relationship => new
            {
                relationship.SourceCharacterId,
                relationship.TargetCharacterId,
                relationship.RelationType,
            });

        modelBuilder.Entity<CharacterRelationship>()
            .HasIndex(relationship => new { relationship.SourceCharacterId, relationship.SortOrder });

        modelBuilder.Entity<CharacterRelationship>()
            .HasIndex(relationship => new { relationship.TargetCharacterId, relationship.SortOrder });

        modelBuilder.Entity<CharacterRelationship>()
            .Property(relationship => relationship.RelationType)
            .HasMaxLength(80);

        modelBuilder.Entity<CharacterRelationship>()
            .Property(relationship => relationship.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<CharacterRelationship>()
            .HasOne(relationship => relationship.SourceCharacter)
            .WithMany(storyObject => storyObject.OutgoingCharacterRelationships)
            .HasForeignKey(relationship => relationship.SourceCharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CharacterRelationship>()
            .HasOne(relationship => relationship.TargetCharacter)
            .WithMany(storyObject => storyObject.IncomingCharacterRelationships)
            .HasForeignKey(relationship => relationship.TargetCharacterId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Timeline>()
            .HasIndex(timeline => new { timeline.ProjectId, timeline.Name })
            .IsUnique();

        modelBuilder.Entity<Timeline>()
            .HasIndex(timeline => new { timeline.ProjectId, timeline.IsDefault });

        modelBuilder.Entity<Timeline>()
            .Property(timeline => timeline.Name)
            .HasMaxLength(160);

        modelBuilder.Entity<Timeline>()
            .Property(timeline => timeline.Mode)
            .HasMaxLength(40)
            .HasDefaultValue("chapters");

        modelBuilder.Entity<Timeline>()
            .HasOne(timeline => timeline.Project)
            .WithMany(project => project.Timelines)
            .HasForeignKey(timeline => timeline.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineEvent>()
            .HasIndex(timelineEvent => new { timelineEvent.TimelineId, timelineEvent.StartValue, timelineEvent.SortOrder });

        modelBuilder.Entity<TimelineEvent>()
            .HasIndex(timelineEvent => new { timelineEvent.ProjectId, timelineEvent.StartValue, timelineEvent.SortOrder });

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.Title)
            .HasMaxLength(160);

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.EventType)
            .HasMaxLength(40)
            .HasDefaultValue("point");

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.Description)
            .HasMaxLength(4000);

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.StartLabel)
            .HasMaxLength(120);

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.EndLabel)
            .HasMaxLength(120);

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.Category)
            .HasMaxLength(80);

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.Color)
            .HasMaxLength(40);

        modelBuilder.Entity<TimelineEvent>()
            .HasOne(timelineEvent => timelineEvent.Project)
            .WithMany()
            .HasForeignKey(timelineEvent => timelineEvent.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineEvent>()
            .HasOne(timelineEvent => timelineEvent.Timeline)
            .WithMany(timeline => timeline.Events)
            .HasForeignKey(timelineEvent => timelineEvent.TimelineId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineEvent>()
            .HasOne(timelineEvent => timelineEvent.ParentEvent)
            .WithMany(timelineEvent => timelineEvent.ChildEvents)
            .HasForeignKey(timelineEvent => timelineEvent.ParentEventId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TimelineEventLink>()
            .HasIndex(link => new { link.TimelineId, link.SourceEventId, link.TargetEventId, link.LinkType });

        modelBuilder.Entity<TimelineEventLink>()
            .Property(link => link.LinkType)
            .HasMaxLength(60);

        modelBuilder.Entity<TimelineEventLink>()
            .Property(link => link.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<TimelineEventLink>()
            .HasOne(link => link.Timeline)
            .WithMany(timeline => timeline.EventLinks)
            .HasForeignKey(link => link.TimelineId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineEventLink>()
            .HasOne(link => link.SourceEvent)
            .WithMany(timelineEvent => timelineEvent.OutgoingLinks)
            .HasForeignKey(link => link.SourceEventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineEventLink>()
            .HasOne(link => link.TargetEvent)
            .WithMany(timelineEvent => timelineEvent.IncomingLinks)
            .HasForeignKey(link => link.TargetEventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineParticipant>()
            .HasIndex(participant => new { participant.TimelineEventId, participant.TargetType, participant.TargetId });

        modelBuilder.Entity<TimelineParticipant>()
            .Property(participant => participant.TargetType)
            .HasMaxLength(40);

        modelBuilder.Entity<TimelineParticipant>()
            .Property(participant => participant.Role)
            .HasMaxLength(120);

        modelBuilder.Entity<TimelineParticipant>()
            .HasOne(participant => participant.TimelineEvent)
            .WithMany(timelineEvent => timelineEvent.Participants)
            .HasForeignKey(participant => participant.TimelineEventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineChange>()
            .HasIndex(change => new { change.TimelineEventId, change.TargetType, change.TargetId });

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.ChangeType)
            .HasMaxLength(60);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.TargetType)
            .HasMaxLength(40);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.FieldKey)
            .HasMaxLength(120);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.FieldName)
            .HasMaxLength(160);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.OldValueJson)
            .HasMaxLength(4000);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.NewValueJson)
            .HasMaxLength(4000);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.EffectiveFromLabel)
            .HasMaxLength(120);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.EffectiveToLabel)
            .HasMaxLength(120);

        modelBuilder.Entity<TimelineChange>()
            .Property(change => change.Notes)
            .HasMaxLength(2000);

        modelBuilder.Entity<TimelineChange>()
            .HasOne(change => change.TimelineEvent)
            .WithMany(timelineEvent => timelineEvent.Changes)
            .HasForeignKey(change => change.TimelineEventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineLayout>()
            .HasIndex(layout => new { layout.TimelineId, layout.OwnerUserId, layout.IsDefault });

        modelBuilder.Entity<TimelineLayout>()
            .Property(layout => layout.AlgorithmVersion)
            .HasMaxLength(40);

        modelBuilder.Entity<TimelineLayout>()
            .HasOne(layout => layout.Timeline)
            .WithMany(timeline => timeline.Layouts)
            .HasForeignKey(layout => layout.TimelineId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineLayout>()
            .HasOne(layout => layout.OwnerUser)
            .WithMany()
            .HasForeignKey(layout => layout.OwnerUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TimelineLayoutItem>()
            .HasIndex(item => new { item.TimelineLayoutId, item.TimelineEventId })
            .IsUnique();

        modelBuilder.Entity<TimelineLayoutItem>()
            .HasOne(item => item.TimelineLayout)
            .WithMany(layout => layout.Items)
            .HasForeignKey(item => item.TimelineLayoutId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TimelineLayoutItem>()
            .HasOne(item => item.TimelineEvent)
            .WithMany(timelineEvent => timelineEvent.LayoutItems)
            .HasForeignKey(item => item.TimelineEventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RelationGraphLayout>()
            .HasIndex(layout => new { layout.ProjectId, layout.OwnerUserId, layout.IsDefault });

        modelBuilder.Entity<RelationGraphLayout>()
            .Property(layout => layout.AlgorithmVersion)
            .HasMaxLength(40);

        modelBuilder.Entity<RelationGraphLayout>()
            .HasOne(layout => layout.Project)
            .WithMany()
            .HasForeignKey(layout => layout.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RelationGraphLayout>()
            .HasOne(layout => layout.OwnerUser)
            .WithMany()
            .HasForeignKey(layout => layout.OwnerUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<RelationGraphLayoutItem>()
            .HasIndex(item => new { item.RelationGraphLayoutId, item.StoryObjectId })
            .IsUnique();

        modelBuilder.Entity<RelationGraphLayoutItem>()
            .HasOne(item => item.RelationGraphLayout)
            .WithMany(layout => layout.Items)
            .HasForeignKey(item => item.RelationGraphLayoutId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RelationGraphLayoutItem>()
            .HasOne(item => item.StoryObject)
            .WithMany()
            .HasForeignKey(item => item.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Catalog>()
            .HasIndex(catalog => new { catalog.ProjectId, catalog.Key })
            .IsUnique();

        modelBuilder.Entity<Catalog>()
            .HasIndex(catalog => new { catalog.ProjectId, catalog.Name })
            .IsUnique();

        modelBuilder.Entity<Catalog>()
            .HasOne(catalog => catalog.Project)
            .WithMany()
            .HasForeignKey(catalog => catalog.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Catalog>()
            .Property(catalog => catalog.HierarchyMode)
            .HasMaxLength(40)
            .HasDefaultValue("entries");

        modelBuilder.Entity<CatalogEntry>()
            .HasIndex(entry => new { entry.CatalogId, entry.Name })
            .IsUnique();

        modelBuilder.Entity<CatalogEntry>()
            .HasIndex(entry => new { entry.CatalogId, entry.SortOrder });

        modelBuilder.Entity<CatalogEntry>()
            .HasOne(entry => entry.Catalog)
            .WithMany(catalog => catalog.Entries)
            .HasForeignKey(entry => entry.CatalogId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogEntryGroup>()
            .HasIndex(group => new { group.CatalogId, group.Name })
            .IsUnique();

        modelBuilder.Entity<CatalogEntryGroup>()
            .HasIndex(group => new { group.CatalogId, group.SortOrder });

        modelBuilder.Entity<CatalogEntryGroup>()
            .HasOne(group => group.Catalog)
            .WithMany(catalog => catalog.EntryGroups)
            .HasForeignKey(group => group.CatalogId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogEntry>()
            .HasOne(entry => entry.EntryGroup)
            .WithMany(group => group.Entries)
            .HasForeignKey(entry => entry.EntryGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<CatalogFieldGroup>()
            .HasIndex(group => new { group.CatalogId, group.Name })
            .IsUnique();

        modelBuilder.Entity<CatalogFieldGroup>()
            .HasOne(group => group.Catalog)
            .WithMany(catalog => catalog.FieldGroups)
            .HasForeignKey(group => group.CatalogId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogFieldDefinition>()
            .HasIndex(definition => new { definition.CatalogId, definition.Name })
            .IsUnique();

        modelBuilder.Entity<CatalogFieldDefinition>()
            .HasOne(definition => definition.Catalog)
            .WithMany(catalog => catalog.FieldDefinitions)
            .HasForeignKey(definition => definition.CatalogId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogFieldDefinition>()
            .HasOne(definition => definition.FieldGroup)
            .WithMany(group => group.FieldDefinitions)
            .HasForeignKey(definition => definition.FieldGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<CatalogFieldDefinition>()
            .HasOne(definition => definition.ReferenceCatalog)
            .WithMany()
            .HasForeignKey(definition => definition.ReferenceCatalogId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CatalogEntryFieldValue>()
            .HasIndex(value => new { value.CatalogEntryId, value.FieldDefinitionId, value.ReferencedEntryId })
            .IsUnique();

        modelBuilder.Entity<CatalogEntryFieldValue>()
            .HasOne(value => value.CatalogEntry)
            .WithMany(entry => entry.FieldValues)
            .HasForeignKey(value => value.CatalogEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogEntryFieldValue>()
            .HasOne(value => value.FieldDefinition)
            .WithMany(definition => definition.FieldValues)
            .HasForeignKey(value => value.FieldDefinitionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogEntryFieldValue>()
            .HasOne(value => value.ReferencedEntry)
            .WithMany()
            .HasForeignKey(value => value.ReferencedEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CatalogEntryHierarchyLink>()
            .HasKey(link => new { link.ParentEntryId, link.ChildEntryId });

        modelBuilder.Entity<CatalogEntryHierarchyLink>()
            .HasOne(link => link.ParentEntry)
            .WithMany(entry => entry.ChildLinks)
            .HasForeignKey(link => link.ParentEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CatalogEntryHierarchyLink>()
            .HasOne(link => link.ChildEntry)
            .WithMany(entry => entry.ParentLinks)
            .HasForeignKey(link => link.ChildEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CatalogEntryGroupHierarchyLink>()
            .HasKey(link => new { link.ParentGroupId, link.ChildGroupId });

        modelBuilder.Entity<CatalogEntryGroupHierarchyLink>()
            .HasOne(link => link.ParentGroup)
            .WithMany(group => group.ChildLinks)
            .HasForeignKey(link => link.ParentGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CatalogEntryGroupHierarchyLink>()
            .HasOne(link => link.ChildGroup)
            .WithMany(group => group.ParentLinks)
            .HasForeignKey(link => link.ChildGroupId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}



