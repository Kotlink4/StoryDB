using Microsoft.EntityFrameworkCore;
using StoryDB.Api.Data.Entities;

namespace StoryDB.Api.Data;

public partial class StoryDbContext(DbContextOptions<StoryDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<MediaAssetVariant> MediaAssetVariants => Set<MediaAssetVariant>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectTemplatePack> ProjectTemplatePacks => Set<ProjectTemplatePack>();
    public DbSet<ProjectTemplatePackFavorite> ProjectTemplatePackFavorites => Set<ProjectTemplatePackFavorite>();
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
            .HasIndex(project => project.Visibility);

        modelBuilder.Entity<Project>()
            .Property(project => project.Visibility)
            .HasMaxLength(40)
            .HasDefaultValue(ProjectVisibility.Private);

        modelBuilder.Entity<Project>()
            .HasOne(project => project.OwnerUser)
            .WithMany(user => user.Projects)
            .HasForeignKey(project => project.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProjectTemplatePack>()
            .HasIndex(pack => new { pack.OwnerUserId, pack.UpdatedAt });

        modelBuilder.Entity<ProjectTemplatePack>()
            .HasIndex(pack => new { pack.IsPublic, pack.UpdatedAt });

        modelBuilder.Entity<ProjectTemplatePack>()
            .Property(pack => pack.Name)
            .HasMaxLength(160);

        modelBuilder.Entity<ProjectTemplatePack>()
            .Property(pack => pack.Description)
            .HasMaxLength(1000);

        modelBuilder.Entity<ProjectTemplatePack>()
            .HasOne(pack => pack.OwnerUser)
            .WithMany()
            .HasForeignKey(pack => pack.OwnerUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectTemplatePack>()
            .HasOne(pack => pack.SourceProject)
            .WithMany(project => project.TemplatePacks)
            .HasForeignKey(pack => pack.SourceProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ProjectTemplatePackFavorite>()
            .HasKey(favorite => new { favorite.UserId, favorite.TemplatePackId });

        modelBuilder.Entity<ProjectTemplatePackFavorite>()
            .HasIndex(favorite => new { favorite.UserId, favorite.CreatedAt });

        modelBuilder.Entity<ProjectTemplatePackFavorite>()
            .HasIndex(favorite => new { favorite.TemplatePackId, favorite.UserId });

        modelBuilder.Entity<ProjectTemplatePackFavorite>()
            .HasOne(favorite => favorite.User)
            .WithMany()
            .HasForeignKey(favorite => favorite.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectTemplatePackFavorite>()
            .HasOne(favorite => favorite.TemplatePack)
            .WithMany(pack => pack.Favorites)
            .HasForeignKey(favorite => favorite.TemplatePackId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ObjectType>()
            .HasIndex(type => new { type.ProjectId, type.Key })
            .IsUnique();

        modelBuilder.Entity<ObjectType>()
            .HasOne(type => type.Project)
            .WithMany(project => project.ObjectTypes)
            .HasForeignKey(type => type.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        ConfigureObjectModel(modelBuilder);

        ConfigureStructureModel(modelBuilder);

        ConfigureTimelineModel(modelBuilder);

        ConfigureCatalogModel(modelBuilder);
    }
}








