using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Data;

public class StoryDbContext(DbContextOptions<StoryDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
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
    public DbSet<CharacterRelationship> CharacterRelationships => Set<CharacterRelationship>();
    public DbSet<ObjectGalleryImage> ObjectGalleryImages => Set<ObjectGalleryImage>();
    public DbSet<TimelineEvent> TimelineEvents => Set<TimelineEvent>();
    public DbSet<TimelineParticipant> TimelineParticipants => Set<TimelineParticipant>();
    public DbSet<TimelineChange> TimelineChanges => Set<TimelineChange>();
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
        modelBuilder.Entity<AppUser>()
            .HasIndex(user => user.Email)
            .IsUnique();

        modelBuilder.Entity<AppUser>()
            .HasIndex(user => user.NormalizedEmail)
            .IsUnique();

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

        modelBuilder.Entity<ObjectAttribute>()
            .HasOne(attribute => attribute.StoryObject)
            .WithMany(storyObject => storyObject.Attributes)
            .HasForeignKey(attribute => attribute.StoryObjectId)
            .OnDelete(DeleteBehavior.Cascade);

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

        modelBuilder.Entity<AttributeGroup>()
            .HasIndex(group => new { group.ProjectId, group.ObjectTypeId, group.Name })
            .IsUnique();

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

        modelBuilder.Entity<TimelineEvent>()
            .HasIndex(timelineEvent => new { timelineEvent.ProjectId, timelineEvent.StartValue, timelineEvent.SortOrder });

        modelBuilder.Entity<TimelineEvent>()
            .Property(timelineEvent => timelineEvent.Title)
            .HasMaxLength(160);

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
            .HasOne(entry => entry.Catalog)
            .WithMany(catalog => catalog.Entries)
            .HasForeignKey(entry => entry.CatalogId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CatalogEntryGroup>()
            .HasIndex(group => new { group.CatalogId, group.Name })
            .IsUnique();

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
