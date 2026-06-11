using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StoryDB.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddObjectPerformanceIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Objects_ProjectId",
                table: "Objects");

            migrationBuilder.DropIndex(
                name: "IX_ObjectRelations_TargetObjectId",
                table: "ObjectRelations");

            migrationBuilder.DropIndex(
                name: "IX_ObjectOwnerships_ItemObjectId",
                table: "ObjectOwnerships");

            migrationBuilder.DropIndex(
                name: "IX_CharacterRelationships_TargetCharacterId",
                table: "CharacterRelationships");

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectHierarchySelections_StoryObjectId_SortOrder",
                table: "StoryObjectHierarchySelections",
                columns: new[] { "StoryObjectId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_StoryObjectCatalogSelections_StoryObjectId_SortOrder",
                table: "StoryObjectCatalogSelections",
                columns: new[] { "StoryObjectId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Objects_ProjectId_ObjectTypeId_Name",
                table: "Objects",
                columns: new[] { "ProjectId", "ObjectTypeId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectRelations_SourceObjectId_SortOrder",
                table: "ObjectRelations",
                columns: new[] { "SourceObjectId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectRelations_TargetObjectId_RelationType_SortOrder",
                table: "ObjectRelations",
                columns: new[] { "TargetObjectId", "RelationType", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectOwnerships_ItemObjectId_SortOrder",
                table: "ObjectOwnerships",
                columns: new[] { "ItemObjectId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectOwnerships_OwnerCharacterId_SortOrder",
                table: "ObjectOwnerships",
                columns: new[] { "OwnerCharacterId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_ObjectAttributes_StoryObjectId_SortOrder",
                table: "ObjectAttributes",
                columns: new[] { "StoryObjectId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_SortOrder",
                table: "CharacterRelationships",
                columns: new[] { "SourceCharacterId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_TargetCharacterId_SortOrder",
                table: "CharacterRelationships",
                columns: new[] { "TargetCharacterId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntryGroups_CatalogId_SortOrder",
                table: "CatalogEntryGroups",
                columns: new[] { "CatalogId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_CatalogEntries_CatalogId_SortOrder",
                table: "CatalogEntries",
                columns: new[] { "CatalogId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StoryObjectHierarchySelections_StoryObjectId_SortOrder",
                table: "StoryObjectHierarchySelections");

            migrationBuilder.DropIndex(
                name: "IX_StoryObjectCatalogSelections_StoryObjectId_SortOrder",
                table: "StoryObjectCatalogSelections");

            migrationBuilder.DropIndex(
                name: "IX_Objects_ProjectId_ObjectTypeId_Name",
                table: "Objects");

            migrationBuilder.DropIndex(
                name: "IX_ObjectRelations_SourceObjectId_SortOrder",
                table: "ObjectRelations");

            migrationBuilder.DropIndex(
                name: "IX_ObjectRelations_TargetObjectId_RelationType_SortOrder",
                table: "ObjectRelations");

            migrationBuilder.DropIndex(
                name: "IX_ObjectOwnerships_ItemObjectId_SortOrder",
                table: "ObjectOwnerships");

            migrationBuilder.DropIndex(
                name: "IX_ObjectOwnerships_OwnerCharacterId_SortOrder",
                table: "ObjectOwnerships");

            migrationBuilder.DropIndex(
                name: "IX_ObjectAttributes_StoryObjectId_SortOrder",
                table: "ObjectAttributes");

            migrationBuilder.DropIndex(
                name: "IX_CharacterRelationships_SourceCharacterId_SortOrder",
                table: "CharacterRelationships");

            migrationBuilder.DropIndex(
                name: "IX_CharacterRelationships_TargetCharacterId_SortOrder",
                table: "CharacterRelationships");

            migrationBuilder.DropIndex(
                name: "IX_CatalogEntryGroups_CatalogId_SortOrder",
                table: "CatalogEntryGroups");

            migrationBuilder.DropIndex(
                name: "IX_CatalogEntries_CatalogId_SortOrder",
                table: "CatalogEntries");

            migrationBuilder.CreateIndex(
                name: "IX_Objects_ProjectId",
                table: "Objects",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectRelations_TargetObjectId",
                table: "ObjectRelations",
                column: "TargetObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ObjectOwnerships_ItemObjectId",
                table: "ObjectOwnerships",
                column: "ItemObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_CharacterRelationships_TargetCharacterId",
                table: "CharacterRelationships",
                column: "TargetCharacterId");
        }
    }
}
